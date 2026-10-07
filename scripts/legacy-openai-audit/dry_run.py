"""Legacy-only core candidate dry run. No application, network or DB imports.

The only writes are JSON files in the gitignored private audit directory.
"""
import argparse
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date
from hashlib import file_digest, sha256
import json
import mmap
from pathlib import Path
import re
import struct
import sys

PARSER_VERSION = "dbf-core-v1-cp1252"
STRATEGY_VERSION = "core-v2-article-opt-in"
EXPECTED = {
    "CIRUGIA": "a19feb2cda3694905c4ffe280e201930ff4fb99adfab775f1a14d4c26dde4866",
    "CLIENTE": "d4adb499d46fd854959f619c58550f399d42fed45bb285198831eb6fd50bc7be",
    "ARTICULO": "e8e27996410708ab4093dfbe71b7b597089294e3f9b6b47e9eab7750cdd1b868",
    "CIRTIP": "d87885ae03f7af2bdb9d3af53853ec7351b7d1824eb9658bd7eb7d9c9e9c8b4a",
}
PRIVATE_ROOT = Path(__file__).resolve().parents[2] / ".tmp" / "consultar-plus-openai-audit"
FIXTURE = Path(__file__).resolve().parents[2] / "docs/migration-consultar-plus/openai-audit/32_DATASET_50_CASOS.md"
FROZEN_POSITIVE = "6411 6814 6958 6883 6832 6966 7004 7047 4660 4831 5437 5515 5517 4962 5052 5121 5122 5236 5486 5528 5693 5714 5843 6172 6276 6719 7486 5191 5291 5325 5357 5373 5431 5511 5592 5633 5751 6000 6188 6330 6461 6489 6597 6600 7477 5067 5215 5243 19 18".split()
FROZEN_NEGATIVE = "5402 6185 2 61 43 5134 178 5265 249 5083".split()
STATUS = {"SAU": "unauthorized", "AUT": "authorized", "PEN": "pending", "REA": "performed",
          "FIN": "finalized", "CAN": "cancelled", "SUS": "suspended"}
REF_FIELDS = {"patient": "CIRPACCOD", "doctor": "CIRMEDCOD", "institution": "CIRHOSCOD",
              "payer": "CIROSCOD", "commercialSourceOnly": "CIRCLICOD"}


@dataclass(frozen=True)
class RawRecord:
    source_record_key: str
    source_hash: str
    values: dict[str, str]


class RawLegacyContact(RawRecord):
    pass


class RawLegacyArticle(RawRecord):
    pass


class RawLegacySurgery(RawRecord):
    pass


@dataclass(frozen=True)
class NormalizedLegacyContact:
    legacy_id: str
    active: bool
    has_identity: bool
    dni: str | None
    cuit: str | None


@dataclass(frozen=True)
class NormalizedLegacyArticle:
    legacy_id: str
    has_description: bool
    active: bool
    barcode: str | None


@dataclass(frozen=True)
class NormalizedLegacySurgery:
    legacy_id: str
    company_code: str
    source_loaded_on: str | None
    surgery_date: str | None
    material_shipping_date: str | None
    raw_status: str
    contact_codes: dict[str, str]
    surgery_type: str
    salesperson: str
    actor: str
    authorization_flag: str
    authorization_number: str
    memo_pointer_present: bool


@dataclass(frozen=True)
class ContactCandidate:
    legacy_id: str
    active: bool
    errors: tuple[str, ...]
    warnings: tuple[str, ...]
    action: str


@dataclass(frozen=True)
class ArticleCandidate:
    legacy_id: str
    active: bool
    errors: tuple[str, ...]
    warnings: tuple[str, ...]
    action: str


@dataclass(frozen=True)
class SurgeryCandidate:
    legacy_id: str
    company_code: str
    source_loaded_on: str | None
    surgery_date: str | None
    material_shipping_date: str | None
    raw_status: str
    contact_codes: dict[str, str]
    surgery_type: str
    salesperson: str
    actor: str
    authorization_flag: str
    authorization_number: str
    memo_pointer_present: bool
    cx_status: str | None
    prep_status: None
    visible_number: None
    performed_date: None
    cancelled_date: None
    errors: tuple[str, ...]
    warnings: tuple[str, ...]
    action: str


def fail(message: str):
    raise ValueError(message)


def file_hash(path: Path) -> str:
    with path.open("rb") as file:
        return file_digest(file, "sha256").hexdigest()


def source_files(source: Path, include_article: bool = False) -> dict[str, Path]:
    workspace = Path(__file__).resolve().parents[2]
    if (not source.is_dir() or source.is_symlink() or source.resolve() == PRIVATE_ROOT.resolve()
            or source.resolve().is_relative_to(workspace)):
        fail("invalid_source_directory")
    files = {}
    for name, expected in EXPECTED.items():
        if name == "ARTICULO" and not include_article:
            continue
        matches = [p for p in source.iterdir() if p.is_file() and not p.is_symlink()
                   and p.stem.upper() == name and p.suffix.lower() == ".dbf"]
        if len(matches) != 1:
            fail("missing_or_duplicate_source_table:" + name)
        if file_hash(matches[0]) != expected:
            fail("source_hash_mismatch:" + name)
        files[name] = matches[0]
    return files


def read_table(path: Path):
    """Decode fixed DBF fields; binary memo pointers become presence flags only."""
    with path.open("rb") as file:
        head = file.read(32)
        if len(head) != 32 or head[0] != 0x30 or head[29] != 3:
            fail("unsupported_dbf_header_or_encoding:" + path.stem)
        count, header_size, record_size = struct.unpack_from("<IHH", head, 4)
        if not record_size or header_size < 33 or path.stat().st_size < header_size + count * record_size:
            fail("invalid_dbf_record_layout:" + path.stem)
        fields = []
        while True:
            field = file.read(32)
            if not field:
                fail("missing_dbf_field_terminator:" + path.stem)
            if field[0] == 13:
                break
            fields.append((field[:11].split(b"\0")[0].decode("ascii"), chr(field[11]), field[16]))
        if 1 + sum(length for _, _, length in fields) != record_size:
            fail("dbf_field_width_mismatch:" + path.stem)
        deleted = 0
        with mmap.mmap(file.fileno(), 0, access=mmap.ACCESS_READ) as data:
            for index in range(count):
                raw = data[header_size + index * record_size:header_size + (index + 1) * record_size]
                if raw[:1] == b"*":
                    deleted += 1
                    continue
                if raw[:1] != b" ":
                    fail("invalid_deleted_marker:" + path.stem)
                offset, values = 1, {}
                for field_name, kind, length in fields:
                    value = raw[offset:offset + length]
                    offset += length
                    if kind == "M":
                        # FoxPro memo block index: read-only FPT work is deliberately deferred.
                        values[field_name] = "PRESENT" if any(value) else ""
                    elif kind in ("C", "N", "D", "L", "F"):
                        values[field_name] = value.strip(b" \0").decode("cp1252", "strict")
                    else:
                        fail("unsupported_dbf_field_type:" + path.stem + ":" + kind)
                yield RawRecord(f"{path.stem.upper()}:{index+1}", sha256(raw).hexdigest(), values), deleted


def read_rows(path: Path):
    rows = []
    # We count deleted slots independently by comparing header and yielded active records.
    for record, _ in read_table(path):
        rows.append(record)
    with path.open("rb") as file:
        file.seek(4)
        count = struct.unpack("<I", file.read(4))[0]
    return rows, count - len(rows)


def civil(value: str) -> tuple[str | None, bool]:
    if not value:
        return None, False
    if not re.fullmatch(r"[0-9]{8}", value):
        return None, True
    try:
        return date(int(value[:4]), int(value[4:6]), int(value[6:8])).isoformat(), False
    except ValueError:
        return None, True


def significant(value: str) -> bool:
    return bool(value and value.strip("0 -/.") and value.strip("0"))


def document(value: str, sizes: tuple[int, ...]) -> str | None:
    digits = re.sub(r"\D", "", value)
    return digits if len(digits) in sizes and len(set(digits)) > 1 else None


def normalize_contact(raw: RawRecord) -> NormalizedLegacyContact:
    v = raw.values
    return NormalizedLegacyContact(v["CLICOD"], v["CLIACT"] == "S",
        any(v[f] for f in ("CLINOM", "CLINOMFAN", "CLIDNI", "CLICUI", "CLIEMA", "CLITEL")),
        document(v["CLIDNI"], (7, 8)), document(v["CLICUI"], (11,)))


def normalize_article(raw: RawRecord) -> NormalizedLegacyArticle:
    v = raw.values
    return NormalizedLegacyArticle(v["ARTCOD"], bool(v["ARTDES"]), v["ARTACT"] == "S",
                                   v["ARTCODBAR"] if significant(v["ARTCODBAR"]) else None)


def normalize_surgery(raw: RawRecord) -> tuple[NormalizedLegacySurgery, list[str]]:
    v = raw.values
    dates, invalid = {}, []
    for field, target in (("CIRFECCAR", "sourceLoadedOn"), ("CIRFEC", "surgeryDate"),
                          ("CIRFECLOG", "materialShippingDate")):
        dates[target], bad = civil(v[field])
        if bad: invalid.append("invalid_" + field.lower())
    return NormalizedLegacySurgery(v["CIRCOD"], v["CIREMPCOD"], dates["sourceLoadedOn"],
         dates["surgeryDate"], dates["materialShippingDate"], v["CIRESTADO"],
         {role: v[field] for role, field in REF_FIELDS.items()}, v["CIRTIP"], v["VIACOD"],
         v["AUSRID"], v["CIRAUT"], v["CIRAUTNRO"], bool(v["CIROBS"])), invalid


def candidate_action(errors: list[str], review: bool) -> str:
    return "REJECTED" if errors else "REVIEW" if review else "UNRESOLVED_NATIVE"


def contact_candidates(rows: list[RawRecord]):
    by_code, by_dni, by_cuit = defaultdict(list), defaultdict(set), defaultdict(set)
    normalized = [(raw, normalize_contact(raw)) for raw in rows]
    for raw, contact in normalized:
        by_code[contact.legacy_id].append((raw, contact))
        if contact.dni: by_dni[contact.dni].add(contact.legacy_id)
        if contact.cuit: by_cuit[contact.cuit].add(contact.legacy_id)
    candidates = {}
    for raw, c in normalized:
        errors, warnings = [], []
        if not significant(c.legacy_id): errors.append("invalid_contact_legacy_id")
        if not c.has_identity: errors.append("missing_contact_identity")
        if not c.active: warnings.append("inactive_contact")
        if c.dni and len(by_dni[c.dni]) > 1: warnings.append("dni_collision_candidate")
        if c.cuit and len(by_cuit[c.cuit]) > 1: warnings.append("cuit_collision_candidate")
        if len(by_code[c.legacy_id]) > 1: warnings.append("duplicate_clicod")
        action = candidate_action(errors, any(w != "inactive_contact" for w in warnings))
        candidates[raw.source_record_key] = ContactCandidate(c.legacy_id, c.active, tuple(sorted(errors)), tuple(sorted(warnings)), action)
    return by_code, candidates


def article_candidates(rows: list[RawRecord]):
    normalized = [(raw, normalize_article(raw)) for raw in rows]
    by_code, by_barcode = defaultdict(list), defaultdict(set)
    for raw, article in normalized:
        by_code[article.legacy_id].append((raw, article))
        if article.barcode: by_barcode[article.barcode].add(article.legacy_id)
    candidates = {}
    for raw, article in normalized:
        errors, warnings = [], []
        if not significant(article.legacy_id): errors.append("invalid_article_legacy_id")
        if not article.has_description: errors.append("missing_article_description")
        if not article.active: warnings.append("inactive_article")
        if len(by_code[article.legacy_id]) > 1: warnings.append("duplicate_artcod")
        if article.barcode and len(by_barcode[article.barcode]) > 1: warnings.append("barcode_collision_candidate")
        candidates[raw.source_record_key] = ArticleCandidate(article.legacy_id, article.active,
          tuple(sorted(errors)), tuple(sorted(warnings)), candidate_action(errors, any(w != "inactive_article" for w in warnings)))
    return candidates


def fixture_ids(path: Path) -> tuple[list[str], list[str]]:
    if path.resolve() != FIXTURE.resolve(): fail("sample_fixture_not_frozen_document")
    blocks = re.findall(r"```\s*\n([\d\s]+)```", path.read_text(encoding="utf-8"))
    if len(blocks) != 2: fail("invalid_fixture_blocks")
    positive, negative = [b.split() for b in blocks]
    if positive != FROZEN_POSITIVE or negative != FROZEN_NEGATIVE: fail("frozen_fixture_changed")
    return positive, negative


def cohort_parser(value: str):
    match = re.fullmatch(r"(surgery-date|loaded):([0-9]{4}-[0-9]{2}-[0-9]{2})\.\.([0-9]{4}-[0-9]{2}-[0-9]{2})", value)
    if not match: fail("invalid_cohort_syntax")
    try:
        start, end = date.fromisoformat(match[2]), date.fromisoformat(match[3])
    except ValueError:
        fail("invalid_cohort_date")
    if end < start: fail("invalid_cohort_range")
    return match[1], start.isoformat(), end.isoformat()


def aggregate(records):
    actions = Counter(r["action"] for r in records)
    errors = Counter(e for r in records for e in r["errors"])
    warnings = Counter(w for r in records for w in r["warnings"])
    review, rejected, eligible = actions["REVIEW"], actions["REJECTED"], actions["UNRESOLVED_NATIVE"]
    if len(records) != eligible + rejected + review: fail("reconciliation_partition_mismatch")
    return {"selected": len(records), "eligible": eligible, "rejected": rejected, "review": review,
            "warningOnly": sum(r["action"] == "UNRESOLVED_NATIVE" and bool(r["warnings"]) for r in records),
            "unresolvedNative": eligible, "proposedCreate": 0, "proposedReuse": 0, "skipped": 0,
            "errorReasons": dict(sorted(errors.items())), "warningReasons": dict(sorted(warnings.items())),
            "actions": dict(sorted(actions.items()))}


def main(argv=None):
    parser = argparse.ArgumentParser(description="Read-only legacy core candidate dry run")
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--source-namespace", required=True)
    parser.add_argument("--company-map", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--match-mode", required=True, choices=["legacy-only", "dev-read-only"])
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--sample-only", action="store_true")
    modes.add_argument("--cohort")
    parser.add_argument("--sample", type=Path)
    parser.add_argument("--include-article-catalog", action="store_true")
    args = parser.parse_args(argv)
    if args.match_mode != "legacy-only": fail("dev_read_only_adapter_not_implemented_no_db_connection")
    if args.source_namespace != "consultar-plus:districorr": fail("unknown_source_namespace")
    if args.sample and not args.sample_only: fail("sample_requires_sample_only")
    out = args.out.resolve()
    private = PRIVATE_ROOT.resolve()
    workspace = Path(__file__).resolve().parents[2].resolve()
    if (PRIVATE_ROOT.is_symlink() or PRIVATE_ROOT.parent.is_symlink()
            or not private.is_relative_to(workspace)):
        fail("private_audit_directory_invalid")
    if out == private or private not in out.parents or args.source.resolve() in out.parents:
        fail("out_must_be_private_child_not_backup")
    if args.company_map.resolve() == args.source.resolve() or args.company_map.is_relative_to(args.source.resolve()):
        fail("company_map_under_source")
    company_map = json.loads(args.company_map.read_text(encoding="utf-8"))
    if company_map != {"PRINC": "legacy-only:PRINC", "TEST": "legacy-only:TEST"}:
        fail("company_map_must_be_symbolic_princ_test_in_legacy_only")
    if args.sample_only:
        positive, negative = fixture_ids(args.sample or FIXTURE)
        selected_ids, cohort_spec = positive + negative, "sample-only"
    else:
        kind, start, end = cohort_parser(args.cohort)
        cohort_spec = args.cohort
    source = args.source.resolve()
    files = source_files(source, include_article=args.include_article_catalog)  # hash preflight before decoding a single record
    read = {name: read_rows(path) for name, path in files.items()}
    for name, type_ in (("CLIENTE", RawLegacyContact), ("ARTICULO", RawLegacyArticle), ("CIRUGIA", RawLegacySurgery)):
        if name not in read:
            continue
        records, deleted_count = read[name]
        read[name] = ([type_(r.source_record_key, r.source_hash, r.values) for r in records], deleted_count)
    surgery_rows, deleted = read["CIRUGIA"]
    contact_by, contact_result = contact_candidates(read["CLIENTE"][0])
    article_result = article_candidates(read["ARTICULO"][0]) if args.include_article_catalog else {}
    surgery_types = {r.values["CIRTIP"] for r in read["CIRTIP"][0]}
    code_count = Counter(r.values["CIRCOD"] for r in surgery_rows)
    if args.sample_only:
        if any(code_count[code] != 1 for code in selected_ids):
            fail("fixture_source_ambiguous")
        selected = [next((r for r in surgery_rows if r.values["CIRCOD"] == code), None) for code in selected_ids]
        if any(r is None for r in selected) or len({r.source_record_key for r in selected}) != 60:
            fail("fixture_source_missing_or_ambiguous")
    else:
        selected = []
        unclassified = []
        for raw in surgery_rows:
            normalized, invalid = normalize_surgery(raw)
            relevant = "invalid_cirfec" if kind == "surgery-date" else "invalid_cirfeccar"
            if relevant in invalid or (kind == "loaded" and not normalized.source_loaded_on):
                unclassified.append({"sourceRecordKey": raw.source_record_key, "sourceHash": raw.source_hash,
                                     "reason": relevant if relevant in invalid else "missing_cirfeccar"})
                continue
            day = normalized.surgery_date if kind == "surgery-date" else normalized.source_loaded_on
            if day and start <= day <= end:
                selected.append(raw)
    outcomes, referenced_codes = [], set()
    for raw in selected:
        n, invalid = normalize_surgery(raw)
        errors, warnings = [], []
        if not significant(n.legacy_id): errors.append("missing_legacy_id")
        if code_count[n.legacy_id] != 1: warnings.append("duplicate_circod")
        if n.company_code not in company_map: errors.append("company_unconfirmed")
        elif n.company_code != "PRINC": errors.append("non_principal_company")
        if not n.source_loaded_on: errors.append("invalid_cirfeccar" if "invalid_cirfeccar" in invalid else "missing_cirfeccar")
        for field in invalid:
            if field != "invalid_cirfeccar": warnings.append(field)
        if n.surgery_date is None and "invalid_cirfec" not in invalid: warnings.append("missing_surgery_date")
        if n.raw_status not in STATUS and n.raw_status not in ("TRA", "SCO"):
            errors.append("unknown_status")
        elif n.raw_status in ("TRA", "SCO"):
            warnings.append("unresolved_" + n.raw_status.lower() + "_status")
        if not n.surgery_type: warnings.append("missing_type")
        elif n.surgery_type not in surgery_types: warnings.append("unknown_surgery_type")
        if not n.contact_codes["doctor"]: warnings.append("missing_doctor")
        if not n.contact_codes["institution"]: warnings.append("missing_institution")
        if n.memo_pointer_present: warnings.append("memo_not_decoded")
        refs = {}
        for role, code in n.contact_codes.items():
            if not significant(code):
                refs[role] = {"status": "MISSING", "legacyId": None}
                if role == "patient": errors.append("missing_patient")
                continue
            referenced_codes.add(code)
            found = contact_by.get(code, [])
            if len(found) != 1:
                refs[role] = {"status": "AMBIGUOUS" if found else "NOT_FOUND", "legacyId": code}
                if role == "patient": errors.append("patient_not_unique_or_missing")
                else: warnings.append("unresolved_" + REF_FIELDS[role].lower())
                continue
            contact = normalize_contact(found[0][0])
            if contact_result[found[0][0].source_record_key].action == "REJECTED":
                refs[role] = {"status": "SOURCE_INVALID", "legacyId": code}
                if role == "patient": errors.append("patient_source_invalid")
                else: warnings.append("invalid_" + REF_FIELDS[role].lower())
                continue
            refs[role] = {"status": "UNRESOLVED_NATIVE", "legacyId": code, "inactive": not contact.active}
            if not contact.active: warnings.append("inactive_" + REF_FIELDS[role].lower())
        review = (n.raw_status in ("TRA", "SCO") or code_count[n.legacy_id] != 1 or
                   any(ref["status"] in ("AMBIGUOUS", "NOT_FOUND", "SOURCE_INVALID") for role, ref in refs.items() if role != "patient") or
                  any(w.startswith("invalid_") for w in warnings) or "unknown_surgery_type" in warnings)
        action = candidate_action(errors, review)
        candidate = SurgeryCandidate(
            legacy_id=n.legacy_id, company_code=n.company_code,
            source_loaded_on=n.source_loaded_on, surgery_date=n.surgery_date,
            material_shipping_date=n.material_shipping_date, raw_status=n.raw_status,
            contact_codes=n.contact_codes, surgery_type=n.surgery_type,
            salesperson=n.salesperson, actor=n.actor,
            authorization_flag=n.authorization_flag, authorization_number=n.authorization_number,
            memo_pointer_present=n.memo_pointer_present, cx_status=STATUS.get(n.raw_status),
            prep_status=None, visible_number=None, performed_date=None, cancelled_date=None,
            errors=tuple(sorted(set(errors))), warnings=tuple(sorted(set(warnings))), action=action)
        outcomes.append({"source": args.source_namespace, "companyCode": n.company_code,
            "entityType": "Surgery", "legacyId": candidate.legacy_id,
            "sourceRecordKey": raw.source_record_key, "sourceHash": raw.source_hash,
            "cohortMembership": cohort_spec, "eligibility": "ELIGIBLE" if action == "UNRESOLVED_NATIVE" else action,
            "contactResolution": refs, "articleResolution": {"mode": "NOT_REQUIRED", "required": False},
            "dateMapping": {"sourceLoadedOn": n.source_loaded_on, "surgeryDate": n.surgery_date,
                            "materialShippingDate": n.material_shipping_date},
            "statusMapping": {"raw": n.raw_status, "cxStatus": candidate.cx_status,
                              "prepStatus": candidate.prep_status,
                              "losses": ["legacy_status_review"] if n.raw_status in ("TRA", "SCO") else []},
            "sourceOnly": {"commercialContact": n.contact_codes["commercialSourceOnly"] or None,
                           "surgeryType": n.surgery_type or None, "salespersonCode": n.salesperson or None,
                           "actorPresent": bool(n.actor), "authorizationFlag": n.authorization_flag or None,
                           "authorizationNumberPresent": bool(candidate.authorization_number),
                           "memoPointerPresent": n.memo_pointer_present},
            "visibleNumber": candidate.visible_number, "performedDate": candidate.performed_date,
            "cancelledDate": candidate.cancelled_date,
            "warnings": list(candidate.warnings), "errors": list(candidate.errors),
            "wouldCreate": None, "wouldReuse": None, "existingTargetId": None, "action": candidate.action})
    if len({r["sourceRecordKey"] for r in outcomes}) != len(outcomes): fail("duplicated_source_record")
    if args.sample_only and [r["legacyId"] for r in outcomes] != selected_ids: fail("fixture_id_order_mismatch")
    if args.sample_only and any(r["errors"] for r in outcomes[:50]): fail("fixture_positive_structural_error")
    for name, path in files.items():
        if file_hash(path) != EXPECTED[name]: fail("source_changed_during_read:" + name)
    summary = aggregate(outcomes)
    if not args.sample_only and unclassified:
        summary["unclassifiableCohortDates"] = len(unclassified)
    selected_roles = defaultdict(set)
    for result in outcomes:
        for role, ref in result["contactResolution"].items():
            if ref["legacyId"]: selected_roles[ref["legacyId"]].add(role)
    summary.update({"sourceTotalActiveSurgeries": len(surgery_rows), "excludedDeletedSurgeries": deleted,
                    "statuses": dict(sorted(Counter(r["statusMapping"]["raw"] for r in outcomes).items())),
                    "contactCodesAllFiveRoles": len(referenced_codes),
                    "multiRoleContactCodes": sum(len(roles) > 1 for roles in selected_roles.values()),
                    "unresolvedNativeContacts": len(referenced_codes),
                    "articlesRequiredBySurgery": 0,
                    "articleCatalog": aggregate([{"action": c.action, "warnings": c.warnings, "errors": c.errors}
                                                 for c in article_result.values()]) if args.include_article_catalog else "NOT_REQUESTED",
                    "contactCatalog": aggregate([{"action": c.action, "warnings": c.warnings, "errors": c.errors}
                                                 for c in contact_result.values()])})
    source_hashes = {name: EXPECTED[name] for name in files}
    report = {"parserVersion": PARSER_VERSION, "strategyVersion": STRATEGY_VERSION, "sourceNamespace": args.source_namespace,
              "sourceHashes": source_hashes, "cohort": cohort_spec, "matchMode": "legacy-only", "summary": summary,
              "surgeryRecords": outcomes,
              "contactRecords": [{"sourceRecordKey": key, "legacyId": c.legacy_id, "active": c.active,
                                  "errors": c.errors, "warnings": c.warnings, "action": c.action}
                                 for key,c in contact_result.items() if c.legacy_id in referenced_codes],
              "articleRecords": [{"sourceRecordKey": key, "legacyId": a.legacy_id, "active": a.active,
                                  "errors": a.errors, "warnings": a.warnings, "action": a.action}
                                 for key,a in article_result.items()]}
    if not args.sample_only and unclassified:
        report["unclassifiedSourceRecords"] = unclassified
    canonical = json.dumps(report, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    report["reportHash"] = sha256(canonical.encode("utf-8")).hexdigest()
    if not PRIVATE_ROOT.exists() or out.exists(): fail("private_out_parent_missing_or_existing")
    if out.parent != private: fail("out_must_be_direct_private_child")
    out.mkdir()
    (out / "records.json").write_text(json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2), encoding="utf-8")
    public = {"sourceNamespace": args.source_namespace, "cohort": cohort_spec, "sourceHashes": source_hashes,
              "parserVersion": PARSER_VERSION, "strategyVersion": STRATEGY_VERSION,
              "reportHash": report["reportHash"], "summary": summary}
    (out / "aggregate.json").write_text(json.dumps(public, ensure_ascii=False, sort_keys=True, indent=2), encoding="utf-8")
    print(json.dumps(public, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, UnicodeError, json.JSONDecodeError) as exc:
        print("dry_run_blocked:" + str(exc), file=sys.stderr)
        sys.exit(2)
