"""Focused tests for the read-only dry run, including an actual network-denial run."""
import json
import io
import importlib.util
from collections import Counter
from contextlib import redirect_stdout
from hashlib import sha256
from pathlib import Path
import re
import struct
import socket
import sys
import unittest
from unittest.mock import patch
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parent))
import dry_run

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT.parent / "Backup_DistriCorr_29092026"
PRIVATE = ROOT / ".tmp/consultar-plus-openai-audit"


def report(name):
    return json.loads((PRIVATE / name / "records.json").read_text(encoding="utf-8"))


def execute(*selection, read_rows=None):
    output = PRIVATE / ("review-" + uuid4().hex)
    args = ["--source", str(SOURCE), "--source-namespace", "consultar-plus:districorr",
            "--company-map", str(PRIVATE / "company-map.local.json"), *selection,
            "--out", str(output), "--match-mode", "legacy-only"]
    with redirect_stdout(io.StringIO()):
        if read_rows is None:
            dry_run.main(args)
        else:
            with patch.object(dry_run, "read_rows", side_effect=read_rows):
                dry_run.main(args)
    return report(output.name)


class DryRunTests(unittest.TestCase):
    def test_dates_and_cohort_parser_are_civil(self):
        self.assertEqual(dry_run.civil("20260228"), ("2026-02-28", False))
        self.assertEqual(dry_run.civil("20260229"), (None, True))
        self.assertEqual(dry_run.civil(""), (None, False))
        self.assertEqual(dry_run.cohort_parser("loaded:2024-01-01..2025-12-31"),
                         ("loaded", "2024-01-01", "2025-12-31"))
        with self.assertRaises(ValueError):
            dry_run.cohort_parser("surgery-date:2026-10-01..2026-09-30")

    def test_fixture_and_cohort_reconcile(self):
        a, b, c = execute("--sample-only"), execute("--sample-only"), execute("--cohort", "surgery-date:2026-06-01..2026-09-30")
        self.assertEqual(a, b)
        self.assertEqual(a["reportHash"], b["reportHash"])
        self.assertEqual([r["legacyId"] for r in a["surgeryRecords"]],
                         [v for b in re.findall(r"```\s*\n([\d\s]+)```", dry_run.FIXTURE.read_text(encoding="utf-8")) for v in b.split()])
        self.assertTrue(all(not r["errors"] and r["visibleNumber"] is None and r["statusMapping"]["prepStatus"] is None
                            for r in a["surgeryRecords"][:50]))
        expected = {"5402":"missing_patient", "6185":"patient_not_unique_or_missing", "2":"non_principal_company",
                    "61":"unknown_status", "43":"unresolved_cirhoscod", "5134":"missing_surgery_date",
                    "178":"unresolved_tra_status", "5265":"unresolved_sco_status", "249":"missing_doctor",
                    "5083":"missing_type"}
        for r in a["surgeryRecords"][50:]:
            self.assertIn(expected[r["legacyId"]], r["errors"] + r["warnings"])
        summary = c["summary"]
        self.assertEqual(summary["selected"], 581)
        self.assertEqual(summary["statuses"]["FIN"] + summary["statuses"]["REA"], 533)
        self.assertEqual(summary["contactCodesAllFiveRoles"], 857)
        self.assertEqual((summary["eligible"],summary["rejected"],summary["review"]), (553,4,24))
        self.assertEqual(summary["articlesRequiredBySurgery"], 0)
        self.assertTrue(all(r["wouldCreate"] is None and r["wouldReuse"] is None and r["existingTargetId"] is None
                            and r["articleResolution"]["mode"] == "NOT_REQUIRED" for r in c["surgeryRecords"]))
        self.assertEqual(len({r["sourceRecordKey"] for r in c["surgeryRecords"]}), 581)
        self.assertEqual(len({r["legacyId"] for r in c["surgeryRecords"]}), 581)
        self.assertTrue(all("2026-06-01" <= r["dateMapping"]["surgeryDate"] <= "2026-09-30" for r in c["surgeryRecords"]))

    def test_cohort_against_independent_existing_dbf_reader(self):
        spec = importlib.util.spec_from_file_location("legacy_profile_independent", Path(__file__).with_name("profile.py"))
        self.assertIsNotNone(spec)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        raw = [v for _, _, _, _, deleted, v in module.table(SOURCE / "CIRUGIA.DBF") if not deleted]
        cohort = [v for v in raw if "20260601" <= v["CIRFEC"] <= "20260930"]
        report_ = execute("--cohort", "surgery-date:2026-06-01..2026-09-30")
        self.assertEqual(len(cohort), 581)
        self.assertEqual(Counter(v["CIRESTADO"] for v in cohort)["FIN"] + Counter(v["CIRESTADO"] for v in cohort)["REA"], 533)
        contacts = {v[f] for v in cohort for f in ("CIRPACCOD", "CIRMEDCOD", "CIRHOSCOD", "CIROSCOD", "CIRCLICOD")
                    if v[f] and v[f].strip("0 -/.")}
        self.assertEqual(len(contacts), 857)
        self.assertEqual({v["CIRCOD"] for v in cohort}, {r["legacyId"] for r in report_["surgeryRecords"]})

    def test_unclassifiable_cohort_date_is_reported(self):
        sources = {name: dry_run.read_rows(path) for name, path in dry_run.source_files(SOURCE).items()}
        row = next(r for r in sources["CIRUGIA"][0] if r.values["CIRCOD"] == "6411")
        fields = {**row.values, "CIRFEC": "20260229"}
        mutated = dry_run.RawRecord(row.source_record_key, sha256(b"synthetic-invalid-date").hexdigest(), fields)
        def fake_read(path):
            return ([mutated], 0) if path.stem.upper() == "CIRUGIA" else sources[path.stem.upper()]
        result = execute("--cohort", "surgery-date:2026-01-01..2026-12-31", read_rows=fake_read)
        self.assertEqual(result["summary"]["unclassifiableCohortDates"], 1)
        self.assertEqual(result["unclassifiedSourceRecords"][0]["sourceRecordKey"], row.source_record_key)

    def test_mutated_source_rows_are_classified_by_general_rules(self):
        sources = {name: dry_run.read_rows(path) for name, path in dry_run.source_files(SOURCE, include_article=True).items()}
        base = next(r for r in sources["CIRUGIA"][0] if r.values["CIRCOD"] == "6411")

        def synthetic(fields, duplicate=False):
            first = dry_run.RawRecord(base.source_record_key, sha256(b"synthetic-test").hexdigest(),
                                      {**base.values, **fields})
            records = [first]
            if duplicate:
                records.append(dry_run.RawRecord("CIRUGIA:999998", sha256(b"synthetic-duplicate").hexdigest(),
                                                first.values.copy()))
            def fake_read(path):
                return (records, 0) if path.stem.upper() == "CIRUGIA" else sources[path.stem.upper()]
            return execute("--cohort", "loaded:2026-01-01..2026-12-31", read_rows=fake_read)

        cases = [
            ({"CIRPACCOD": ""}, "REJECTED", "missing_patient"),
            ({"CIRPACCOD": "ZZZZZ"}, "REJECTED", "patient_not_unique_or_missing"),
            ({"CIRPACCOD": "2268"}, "REJECTED", "patient_not_unique_or_missing"),
            ({"CIRESTADO": "WHAT"}, "REJECTED", "unknown_status"),
            ({"CIRESTADO": "TRA"}, "REVIEW", "unresolved_tra_status"),
            ({"CIRESTADO": "SCO"}, "REVIEW", "unresolved_sco_status"),
            ({"CIREMPCOD": "TEST"}, "REJECTED", "non_principal_company"),
            ({"CIRFECCAR": "20260229"}, None, "invalid_cirfeccar"),
            ({"CIRFEC": "20260229"}, "REVIEW", "invalid_cirfec"),
            ({"CIRFEC": ""}, "UNRESOLVED_NATIVE", "missing_surgery_date"),
            ({"CIRHOSCOD": "ZZZZZ"}, "REVIEW", "unresolved_cirhoscod"),
            ({"CIRTIP": ""}, "UNRESOLVED_NATIVE", "missing_type"),
        ]
        for fields, action, reason in cases:
            with self.subTest(fields=fields):
                result = synthetic(fields)
                if action is None:
                    self.assertEqual(result["summary"]["unclassifiableCohortDates"], 1)
                    self.assertEqual(result["unclassifiedSourceRecords"][0]["reason"], reason)
                else:
                    row = result["surgeryRecords"][0]
                    self.assertEqual(row["action"], action)
                    self.assertIn(reason, row["errors"] + row["warnings"])
                    self.assertEqual(row["dateMapping"]["sourceLoadedOn"],
                                     dry_run.civil(fields.get("CIRFECCAR", base.values["CIRFECCAR"]))[0])
        duplicated = synthetic({}, duplicate=True)
        self.assertEqual(duplicated["summary"]["selected"], 2)
        self.assertTrue(all("duplicate_circod" in r["warnings"] and r["action"] == "REVIEW"
                            for r in duplicated["surgeryRecords"]))
        article_candidates = dry_run.article_candidates(sources["ARTICULO"][0])
        self.assertEqual(sum("duplicate_artcod" in a.warnings for a in article_candidates.values()), 2)
        self.assertEqual(sum("missing_article_description" in a.errors for a in article_candidates.values()), 3)
        contacts, candidates = dry_run.contact_candidates(sources["CLIENTE"][0])
        self.assertEqual(len(contacts["2268"]), 2)
        self.assertTrue(all(candidates[r.source_record_key].action == "REVIEW" for r,_ in contacts["2268"]))

    def test_required_patient_with_no_usable_identity_is_rejected(self):
        sources = {name: dry_run.read_rows(path) for name, path in dry_run.source_files(SOURCE).items()}
        surgery = next(r for r in sources["CIRUGIA"][0] if r.values["CIRCOD"] == "6411")
        patient_code = surgery.values["CIRPACCOD"]
        contact_rows = list(sources["CLIENTE"][0])
        index = next(i for i,r in enumerate(contact_rows) if r.values["CLICOD"] == patient_code)
        old = contact_rows[index]
        contact_rows[index] = dry_run.RawRecord(old.source_record_key, sha256(b"invalid-patient").hexdigest(),
            {**old.values, **{field: "" for field in ("CLINOM", "CLINOMFAN", "CLIDNI", "CLICUI", "CLIEMA", "CLITEL")}})
        def fake_read(path):
            if path.stem.upper() == "CLIENTE": return contact_rows, 0
            if path.stem.upper() == "CIRUGIA": return [surgery], 0
            return sources[path.stem.upper()]
        row = execute("--cohort", "loaded:2026-01-01..2026-12-31", read_rows=fake_read)["surgeryRecords"][0]
        self.assertEqual(row["action"], "REJECTED")
        self.assertIn("patient_source_invalid", row["errors"])

    def test_sample_duplicate_source_id_fails_closed(self):
        sources = {name: dry_run.read_rows(path) for name, path in dry_run.source_files(SOURCE).items()}
        first = next(r for r in sources["CIRUGIA"][0] if r.values["CIRCOD"] == dry_run.FROZEN_POSITIVE[0])
        duplicate = dry_run.RawRecord("CIRUGIA:999999", first.source_hash, first.values.copy())
        def fake_read(path):
            if path.stem.upper() == "CIRUGIA": return sources["CIRUGIA"][0] + [duplicate], 2
            return sources[path.stem.upper()]
        with self.assertRaisesRegex(ValueError, "fixture_source_ambiguous"):
            execute("--sample-only", read_rows=fake_read)

    def test_article_source_is_not_required_for_surgery(self):
        with patch.dict(dry_run.EXPECTED, {"ARTICULO": "0" * 64}):
            result = execute("--sample-only")
            with self.assertRaisesRegex(ValueError, "source_hash_mismatch:ARTICULO"):
                execute("--sample-only", "--include-article-catalog")
        self.assertEqual(result["summary"]["selected"], 60)
        self.assertEqual(result["summary"]["articlesRequiredBySurgery"], 0)
        self.assertEqual(result["summary"]["articleCatalog"], "NOT_REQUESTED")

    def test_deleted_marker_in_minimal_private_dbf_and_cli_guards(self):
        synthetic = PRIVATE / ("synthetic-" + uuid4().hex + ".dbf")
        header = bytearray(32)
        header[0], header[29] = 0x30, 3
        struct.pack_into("<IHH", header, 4, 2, 65, 6)
        field = bytearray(32)
        field[:6], field[11], field[16] = b"CLICOD", ord("C"), 5
        synthetic.write_bytes(bytes(header) + bytes(field) + b"\x0d" + b" A1234" + b"*B1234")
        rows, deleted = dry_run.read_rows(synthetic)
        self.assertEqual((len(rows), deleted, rows[0].values["CLICOD"], rows[0].source_record_key),
                         (1, 1, "A1234", f"{synthetic.stem.upper()}:1"))
        with patch.dict(dry_run.EXPECTED, {"ABSENT": "0"*64}):
            with self.assertRaisesRegex(ValueError, "missing_or_duplicate_source_table:ABSENT"):
                dry_run.source_files(SOURCE)
        with self.assertRaisesRegex(ValueError, "out_must_be_private_child_not_backup"):
            dry_run.main(["--source", str(SOURCE), "--source-namespace", "consultar-plus:districorr",
                          "--company-map", str(PRIVATE / "company-map.local.json"), "--sample-only",
                          "--out", str(SOURCE / "forbidden-output"), "--match-mode", "legacy-only"])
        with self.assertRaises(SystemExit) as error:
            with patch("sys.stderr", io.StringIO()):
                dry_run.main(["--source", str(SOURCE), "--source-namespace", "consultar-plus:districorr",
                              "--company-map", str(PRIVATE / "company-map.local.json"), "--sample-only",
                              "--cohort", "surgery-date:2026-06-01..2026-09-30", "--out", str(PRIVATE / "forbidden"),
                              "--match-mode", "legacy-only"])
        self.assertEqual(error.exception.code, 2)

    def test_preflight_rejects_changed_source_before_read(self):
        with patch.dict(dry_run.EXPECTED, {"CIRUGIA": "0" * 64}):
            with self.assertRaisesRegex(ValueError, "source_hash_mismatch:CIRUGIA"):
                dry_run.source_files(SOURCE)
        with self.assertRaisesRegex(ValueError, "dev_read_only_adapter_not_implemented"):
            dry_run.main(["--source", str(SOURCE), "--source-namespace", "consultar-plus:districorr",
                          "--company-map", str(PRIVATE / "company-map.local.json"), "--sample-only",
                          "--out", str(PRIVATE / "forbidden-dev"), "--match-mode", "dev-read-only"])

    def test_private_report_root_must_remain_inside_workspace(self):
        external = ROOT.parent / "outside-private-audit"
        with patch.object(dry_run, "PRIVATE_ROOT", external):
            with self.assertRaisesRegex(ValueError, "private_audit_directory_invalid"):
                dry_run.main(["--source", str(SOURCE), "--source-namespace", "consultar-plus:districorr",
                              "--company-map", str(PRIVATE / "company-map.local.json"), "--sample-only",
                              "--out", str(external / "not-created"), "--match-mode", "legacy-only"])
        self.assertFalse((external / "not-created").exists())

    def test_legacy_only_does_not_use_network(self):
        baseline = execute("--sample-only")
        with patch.object(socket, "socket", side_effect=AssertionError("network used")):
            denied = execute("--sample-only")
        self.assertEqual(denied, baseline)


if __name__ == "__main__":
    unittest.main()
