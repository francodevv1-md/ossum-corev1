"""Validate targeted core audit artifacts against the frozen 50/10 markdown fixture."""
import json
from hashlib import sha256
from pathlib import Path
import re

root = Path(__file__).resolve().parents[2]
report = json.loads((root / ".tmp/consultar-plus-openai-audit/core_closure.json").read_text(encoding="utf-8"))
manifest = (root / "docs/migration-consultar-plus/openai-audit/32_DATASET_50_CASOS.md").read_text(encoding="utf-8")
blocks = re.findall(r"```\s*\n([\d\s]+)```", manifest)
assert len(blocks) == 2, "Expected exactly two frozen CIRCOD lists"
frozen = [[v for v in block.split()] for block in blocks]
actual = [[r["CIRCOD"] for r in report["sample"][group]] for group in ("positive", "negative")]
assert [len(v) for v in frozen] == [50, 10] and frozen == actual
assert len(set(frozen[0] + frozen[1])) == 60
assert all(not s.get("errors") for s in report["sample"]["positive"])
assert all(s["errors"] or s["warnings"] for s in report["sample"]["negative"])
assert report["sample"]["coverage"]["states"]["REA"] >= 8
assert report["sample"]["coverage"]["inactive_refs"] >= 2
assert sum("202606" <= r["month"] <= "202609" for r in report["sample"]["positive"]) == 16
assert "unresolved_tra_status" in next(r for r in report["sample"]["negative"] if r["CIRCOD"] == "178")["warnings"]
assert "unresolved_sco_status" in next(r for r in report["sample"]["negative"] if r["CIRCOD"] == "5265")["warnings"]
u = report["universe"]
assert u["union"] == u["loaded_in_2026"] + u["surgery_date_in_2026"] - u["overlap"] == 2577
assert u["before_loaded_surgery_2026"] == u["surgery_date_in_2026"] - u["overlap"]
assert report["cohorts"]["four_months_surgery_date"]["surgeries"] < report["cohorts"]["surgery_date_2026"]["surgeries"]
source = root.parent / "Backup_DistriCorr_29092026" / "CIRUGIA.DBF"
assert sha256(source.read_bytes()).hexdigest() == report["source_sha256"]["CIRUGIA"]
assert report["source_sha256"]["CIRUGIA"] in manifest
for number in range(25, 37):
    assert len(list((root / "docs/migration-consultar-plus/openai-audit").glob(f"{number}_*.md"))) == 1
print("core closure verified: 50 positives, 10 negatives, source cohorts and sample coverage")
