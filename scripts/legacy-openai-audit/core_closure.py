"""Targeted read-only Contact/Article/Surgery closure; writes only aggregate local JSON.

Run from any directory with `python -B scripts/legacy-openai-audit/core_closure.py`.
No names, DNI/CUIT, email, or patient identifiers are emitted to JSON.
"""
from collections import Counter, defaultdict
from datetime import date
from hashlib import file_digest
import json
from pathlib import Path
import re
import unicodedata

from profile import SOURCE, OUT, table

assert SOURCE.is_dir() and not OUT.is_relative_to(SOURCE)


def rows(name):
    path = next(p for p in SOURCE.iterdir() if p.stem.upper() == name and p.suffix.lower() == ".dbf")
    return [r for _, _, _, _, deleted, r in table(path) if not deleted]


def source_hash(name):
    path = next(p for p in SOURCE.iterdir() if p.stem.upper() == name and p.suffix.lower() == ".dbf")
    with path.open("rb") as file:
        return file_digest(file, "sha256").hexdigest()


def date_value(raw):
    if not raw:
        return None
    if len(raw) != 8 or not raw.isascii() or not raw.isdigit():
        return "INVALID"
    try:
        return date(int(raw[:4]), int(raw[4:6]), int(raw[6:8]))
    except ValueError:
        return "INVALID"


def significant(code):
    return bool(code and code.strip("0") and code.strip(" -/."))


def document(raw, length):
    digits = re.sub(r"\D", "", raw or "")
    return digits if len(digits) in (length if isinstance(length, tuple) else (length,)) and len(set(digits)) > 1 else ""


def normalized_name(raw):
    value = unicodedata.normalize("NFKD", raw or "")
    return " ".join("".join(c for c in value if not unicodedata.combining(c)).casefold().split())


surgeries = rows("CIRUGIA")
contacts = rows("CLIENTE")
articles = rows("ARTICULO")
types = rows("CIRTIP")
salespeople = rows("VIAJANTE")
notes = rows("CIRNOTAS")
attributes = rows("ARTATRI")
stock = rows("STOCK")  # only surgery/article dependency closure, not stock semantics

contact_by = defaultdict(list)
article_by = defaultdict(list)
for r in contacts:
    contact_by[r["CLICOD"]].append(r)
for r in articles:
    article_by[r["ARTCOD"]].append(r)

roles = defaultdict(set)
for s in surgeries:
    for field, role in (("CIRPACCOD", "patient"), ("CIRMEDCOD", "doctor"),
                        ("CIRHOSCOD", "institution"), ("CIROSCOD", "payer"),
                        ("CIRCLICOD", "commercial")):
        if significant(s[field]):
            roles[s[field]].add(role)

def collisions(field, length):
    groups = defaultdict(set)
    for c in contacts:
        key = document(c[field], length)
        if key and significant(c["CLICOD"]):
            groups[key].add(c["CLICOD"])
    collisions_ = [codes for codes in groups.values() if len(codes) > 1]
    return {"non_placeholder_distinct": len(groups), "collision_groups": len(collisions_),
            "distinct_codes_in_collisions": len(set().union(*collisions_)) if collisions_ else 0}

def key_anomalies(rows_, key):
    count = Counter(r[key] for r in rows_)
    return {"blank_rows": count.get("", 0), "zero_rows": sum(n for v, n in count.items() if v and not significant(v)),
            "repeated_nonblank_codes": {code: n for code, n in count.items() if significant(code) and n > 1}}

loaded = [r for r in surgeries if r["CIRFECCAR"].startswith("2026")]
dated = [r for r in surgeries if r["CIRFEC"].startswith("2026")]
union = {r["CIRCOD"] for r in loaded} | {r["CIRCOD"] for r in dated}
four = [r for r in dated if "20260601" <= r["CIRFEC"] <= "20260930"]
four_loaded = [r for r in loaded if "20260601" <= r["CIRFECCAR"] <= "20260930"]
types_by = {r["CIRTIP"] for r in types}
via_by = {r["VIACOD"] for r in salespeople}

def warnings_and_errors(s):
    errors, warnings = [], []
    if not significant(s["CIRCOD"]): errors.append("missing_legacy_id")
    if not significant(s["CIRPACCOD"]): errors.append("missing_patient")
    elif len(contact_by[s["CIRPACCOD"]]) != 1: errors.append("patient_not_unique_or_missing")
    if s["CIRESTADO"] not in {"SAU", "FIN", "CAN", "REA", "TRA", "AUT", "PEN", "SUS", "SCO"}:
        errors.append("unknown_status")
    if s["CIRESTADO"] in {"TRA", "SCO"}:
        warnings.append("unresolved_" + s["CIRESTADO"].lower() + "_status")
    if s.get("CIREMPCOD") != "PRINC":
        errors.append("company_unconfirmed" if not s.get("CIREMPCOD") else "non_principal_company")
    for field in ("CIRFECCAR", "CIRFEC", "CIRFECLOG"):
        if date_value(s[field]) == "INVALID":
            (errors if field == "CIRFECCAR" else warnings).append("invalid_" + field.lower())
    for field in ("CIRMEDCOD", "CIRHOSCOD", "CIROSCOD", "CIRCLICOD"):
        if significant(s[field]) and len(contact_by[s[field]]) != 1:
            warnings.append("unresolved_" + field.lower())
    if s["CIRTIP"] and s["CIRTIP"] not in types_by: warnings.append("unknown_surgery_type")
    if s["VIACOD"] and s["VIACOD"] not in via_by: warnings.append("unknown_salesperson")
    if not s["CIRFEC"]: warnings.append("missing_surgery_date")
    if not s["CIRMEDCOD"]: warnings.append("missing_doctor")
    if not s["CIRHOSCOD"]: warnings.append("missing_institution")
    if not s["CIRTIP"]: warnings.append("missing_type")
    for field in ("CIRPACCOD", "CIRMEDCOD", "CIRHOSCOD", "CIROSCOD"):
        if significant(s[field]) and len(contact_by[s[field]]) == 1 and contact_by[s[field]][0]["CLIACT"] == "N":
            warnings.append("inactive_" + field.lower())
    return sorted(set(errors)), sorted(set(warnings))

def cohort(items):
    related = set()
    for s in items:
        for field in ("CIRPACCOD", "CIRMEDCOD", "CIRHOSCOD", "CIROSCOD", "CIRCLICOD"):
            if significant(s[field]): related.add(s[field])
    status = Counter(s["CIRESTADO"] for s in items)
    reasons = Counter(reason for s in items for reason in warnings_and_errors(s)[0])
    warnings = Counter(reason for s in items for reason in warnings_and_errors(s)[1])
    return {"surgeries": len(items), "contact_codes_all_roles": len(related),
            "contact_codes_missing_or_ambiguous": sum(len(contact_by[c]) != 1 for c in related),
            "statuses": dict(sorted(status.items())), "rows_with_errors": sum(bool(warnings_and_errors(s)[0]) for s in items),
            "rows_with_warnings": sum(bool(warnings_and_errors(s)[1]) for s in items),
            "error_reasons": dict(sorted(reasons.items())), "warning_reasons": dict(sorted(warnings.items()))}

stock_for = defaultdict(set)
for h in stock:
    if significant(h["STKCIRCOD"]) and h["STKCIRCOD"] in union:
        stock_for[h["STKCIRCOD"]].add(h["STKCOD"])
stock_ids_full = set().union(*(stock_for[s["CIRCOD"]] for s in dated))
stock_ids_four = set().union(*(stock_for[s["CIRCOD"]] for s in four))
sku_full, sku_four = set(), set()
detail_counts = Counter()
# One targeted STOCK1 pass measures optional Article dependencies only.
for _, _, _, _, deleted, line in table(next(p for p in SOURCE.iterdir() if p.stem.upper() == "STOCK1" and p.suffix.lower() == ".dbf")):
    if deleted: continue
    if line["STKCOD"] in stock_ids_full:
        sku_full.add(line["ARTCOD"])
        detail_counts["full"] += 1
    if line["STKCOD"] in stock_ids_four:
        sku_four.add(line["ARTCOD"])
        detail_counts["four"] += 1

def extra_article(ids):
    return {"article_codes_if_optional_stock_refs": len(ids),
            "missing_or_ambiguous_article_codes": sum(len(article_by[c]) != 1 for c in ids),
            "stock_detail_lines_outside_core": detail_counts["four" if ids is sku_four else "full"]}

name_groups = defaultdict(set)
for c in contacts:
    key = normalized_name(c["CLINOM"])
    if len(key) >= 5 and significant(c["CLICOD"]): name_groups[key].add(c["CLICOD"])

known_attributes = Counter(r["ATRDES"].strip().upper() for r in attributes)
attr_by = Counter(r["ARTCOD"] for r in attributes if significant(r["ARTCOD"]))

def repeated_comparison(groups, name, descriptive):
    duplicates = {key: values for key, values in groups.items() if len(values) > 1 and significant(key)}
    return {key: {"count": len(values), "same_description": len({normalized_name(r[descriptive]) for r in values}) == 1,
                  "same_active_flag": len({r[name] for r in values}) == 1} for key, values in duplicates.items()}

historical_inactive = [s for s in surgeries if s["CIRFEC"].startswith(("2024", "2025")) and
                       s["CIRESTADO"] in {"FIN", "REA"} and not warnings_and_errors(s)[0] and
                       any(w.startswith("inactive_") for w in warnings_and_errors(s)[1])]

eligible = [s for s in dated if s["CIRESTADO"] in {"FIN", "REA"} and not warnings_and_errors(s)[0]
            and s["CIRFEC"] <= "20260929"]
assert len({s["CIRCOD"] for s in eligible}) == len(eligible)

# Coverage-driven and deterministic: first satisfy month/state/inactive/optional/type,
# then maximize new payer/doctor/institution/type, tie-breaking by CIRCOD.
def dimensions(s):
    _, warnings = warnings_and_errors(s)
    return {"month:" + s["CIRFEC"][:6], "state:" + s["CIRESTADO"],
            "payer:" + s["CIROSCOD"], "doctor:" + s["CIRMEDCOD"],
            "institution:" + s["CIRHOSCOD"], "type:" + (s["CIRTIP"] or "missing"),
            "optional:" + ("missing" if not s["CIRMEDCOD"] or not s["CIRHOSCOD"] or not s["CIRTIP"] else "present"),
            *("inactive:" + w for w in warnings if w.startswith("inactive_"))}

rea = [s for s in eligible if s["CIRESTADO"] == "REA"]
selected = []
for month in sorted({s["CIRFEC"][:6] for s in rea}):
    selected.append(min((s for s in rea if s["CIRFEC"].startswith(month)), key=lambda s: int(s["CIRCOD"])))
for s in sorted(rea, key=lambda s: int(s["CIRCOD"])):
    if len(selected) >= 8: break
    if s not in selected: selected.append(s)
seen = set().union(*(dimensions(s) for s in selected))
for _ in range(50 - len(selected)):
    best = max((s for s in eligible if s["CIRCOD"] not in {r["CIRCOD"] for r in selected}),
               key=lambda s: (sum((12 if d.startswith("state:") or d.startswith("month:") or d.startswith("inactive:") or d.startswith("optional:") else 1)
                                  for d in dimensions(s) - seen),
                              -int(s["CIRCOD"])))
    selected.append(best)
    seen |= dimensions(best)
for historical in sorted(historical_inactive, key=lambda r: int(r["CIRCOD"]))[:2]:
    if historical["CIRCOD"] not in {s["CIRCOD"] for s in selected}:
        selected[-(len([s for s in selected if s in historical_inactive])+1)] = historical
assert len(selected) == 50 and len({r["CIRCOD"] for r in selected}) == 50

def sample(s):
    return {"CIRCOD": s["CIRCOD"], "month": s["CIRFEC"][:6], "state": s["CIRESTADO"],
            "type_present": bool(s["CIRTIP"]), "optional_complete": bool(s["CIRMEDCOD"] and s["CIRHOSCOD"] and s["CIRTIP"]),
            "warnings": warnings_and_errors(s)[1]}

negative = []
for reason in ("missing_patient", "patient_not_unique_or_missing", "invalid_cirfeccar",
               "non_principal_company", "unknown_status", "invalid_cirfec", "unresolved_cirhoscod",
               "missing_surgery_date", "unresolved_tra_status", "unresolved_sco_status"):
    matches = [s for s in surgeries if reason in sum((list(pair) for pair in warnings_and_errors(s)), [])
               and s["CIRCOD"] not in {r["CIRCOD"] for r in selected + negative}]
    if matches: negative.append(min(matches, key=lambda r: (r["CIRCOD"] not in union, int(r["CIRCOD"]))))
for s in sorted(surgeries, key=lambda r: (r["CIRCOD"] not in union, int(r["CIRCOD"]))):
    if len(negative) >= 10: break
    if s not in negative and s not in selected and any(warnings_and_errors(s)):
        negative.append(s)

result = {
    "method": "targeted core tables; exclude deleted; 4 months by CIRFEC 2026-06-01..2026-09-30; structural not DEV-ready",
    "source_sha256": {name: source_hash(name)
                      for name in ("CIRUGIA", "CLIENTE", "ARTICULO", "ARTATRI", "CIRTIP", "VIAJANTE", "CIRNOTAS", "STOCK", "STOCK1")},
    "universe": {"loaded_in_2026": len(loaded), "surgery_date_in_2026": len(dated), "union": len(union),
                 "overlap": len({s["CIRCOD"] for s in loaded} & {s["CIRCOD"] for s in dated}),
                 "before_loaded_surgery_2026": sum(s["CIRFECCAR"] < "20260101" for s in dated),
                 "loaded_2026_surgery_future": sum(s["CIRFEC"] > "20261231" for s in loaded),
                 "loaded_2026_surgery_after_backup_cut": sum(s["CIRFEC"] > "20260929" for s in loaded),
                 "loaded_2026_not_performed_status_proxy": sum(s["CIRESTADO"] not in ("FIN", "REA") for s in loaded),
                 "loaded_2026_cancelled_or_suspended": sum(s["CIRESTADO"] in ("CAN", "SUS") for s in loaded),
                 "historical_completed_before_2026_load": sum(s["CIRFECCAR"] < "20260101" and s["CIRESTADO"] in ("FIN", "REA") for s in surgeries),
                 "dated_2026_fin_or_rea_current": sum(s["CIRESTADO"] in ("FIN", "REA") for s in dated),
                 "date_anomalies": {f: sum(date_value(s[f]) == "INVALID" for s in surgeries) for f in ("CIRFEC", "CIRFECCAR", "CIRFECLOG")},
                 "loaded_2026_no_surgery_date": sum(not s["CIRFEC"] for s in loaded)},
    "contact": {"total": len(contacts), "codes": key_anomalies(contacts, "CLICOD"),
                "code_collision_detail": repeated_comparison(contact_by, "CLIACT", "CLINOM"),
                "dni_syntax_only": collisions("CLIDNI", (7, 8)), "cuit_syntax_only": collisions("CLICUI", 11),
                "duplicate_names_non_identity": sum(len(codes)>1 for codes in name_groups.values()),
                "active_codes": dict(sorted(Counter(c["CLIACT"] or "EMPTY" for c in contacts).items())),
                "multi_role_codes": sum(len(v)>1 for v in roles.values()),
                "referenced_inactive_role_rows": sum(bool(contact_by[c] and len(contact_by[c]) == 1 and contact_by[c][0]["CLIACT"] == "N")
                                                   for s in surgeries for f in ("CIRPACCOD", "CIRMEDCOD", "CIRHOSCOD", "CIROSCOD") for c in [s[f]] if significant(c))},
    "article": {"total": len(articles), "codes": key_anomalies(articles, "ARTCOD"),
                "code_collision_detail": repeated_comparison(article_by, "ARTACT", "ARTDES"),
                "descriptions_missing": sum(not r["ARTDES"] for r in articles),
                "active": dict(sorted(Counter(a["ARTACT"] or "EMPTY" for a in articles).items())),
                "barcode_duplicate_groups": sum(n>1 for code,n in Counter(a["ARTCODBAR"] for a in articles if significant(a["ARTCODBAR"])).items()),
                "attributes_active": len(attributes), "attributes_affected_articles": len(attr_by),
                "attributes_top_names": dict(known_attributes.most_common(12))},
    "other": {"surgery_notes": len(notes), "surgery_types": len(types), "salespeople": len(salespeople),
              "surgery_company_codes": dict(Counter(s.get("CIREMPCOD", "") for s in surgeries)),
              "historic_inactive_positive_candidates": len(historical_inactive)},
    "era_usage_by_load_year": {year: {"rows": len(subset),
                                      "nonempty": {field: sum(bool(r[field]) for r in subset)
                                                   for field in ("CIRFEC", "CIRFECLOG", "CIRTIP", "VIACOD", "CIRPACCOD", "CIRHOSCOD", "CIRMEDCOD")},
                                      "states": dict(Counter(r["CIRESTADO"] or "EMPTY" for r in subset))}
                               for year in ("2024", "2025", "2026")
                               for subset in [[s for s in surgeries if s["CIRFECCAR"].startswith(year)]]},
    "cohorts": {"loaded_2026": cohort(loaded), "surgery_date_2026": {**cohort(dated), **extra_article(sku_full)},
                "four_months_surgery_date": {**cohort(four), **extra_article(sku_four)},
                "four_months_loaded": cohort(four_loaded)},
    "sample": {"rule": "48 FIN/REA PRINC surgery-dated 2026 + 2 historical inactive-reference controls, structurally valid; not pre-approved for write",
               "coverage": {"months": dict(Counter(s["CIRFEC"][:6] for s in selected)),
                            "states": dict(Counter(s["CIRESTADO"] for s in selected)),
                            "distinct_payers": len({s["CIROSCOD"] for s in selected}),
                            "distinct_doctors": len({s["CIRMEDCOD"] for s in selected if s["CIRMEDCOD"]}),
                            "distinct_institutions": len({s["CIRHOSCOD"] for s in selected if s["CIRHOSCOD"]}),
                            "distinct_types": len({s["CIRTIP"] for s in selected if s["CIRTIP"]}),
                            "inactive_refs": sum(any(w.startswith("inactive_") for w in warnings_and_errors(s)[1]) for s in selected)},
               "positive": [sample(s) for s in selected],
               "negative": [{**sample(s), "errors": warnings_and_errors(s)[0]} for s in negative]},
}
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "core_closure.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({k:v for k,v in result.items() if k != "sample"}, ensure_ascii=False, indent=2))
print("Selected:", ",".join(s["CIRCOD"] for s in selected))
print("Negative:", ",".join(s["CIRCOD"] for s in negative))
