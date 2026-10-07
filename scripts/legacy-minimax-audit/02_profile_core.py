"""Profile core surgical tables in full: CIRUGIA, CIRNOTAS, CIRTIP, CLIENTE, ARTICULO, ATRIENT, ARTATRI, CLIATRI.
Output per-table profile with field stats, cardinality, nulls, date ranges.
"""
import json
from pathlib import Path
from collections import Counter
from dbfread import DBF

BACKUP = Path(r"E:\OSSUM_COR_ANTIGRAVITY\Backup_DistriCorr_29092026")
OUT_DIR = Path(r"E:\OSSUM_COR_ANTIGRAVITY\ux-ui\.tmp\consultar-plus-minimax-audit")
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_JSON = OUT_DIR / "02_core_profiles.json"


def is_empty(v):
    if v is None: return True
    if isinstance(v, str) and v.strip() == "": return True
    return False


def profile_table(name):
    path = BACKUP / f"{name}.DBF"
    if not path.exists():
        path = BACKUP / f"{name}.dbf"
    if not path.exists():
        return {"name": name, "error": "not found"}
    t = DBF(str(path), lowernames=True, load=True, ignore_missing_memofile=True)
    fields = [f.name for f in t.fields]
    type_map = {f.name: f.type for f in t.fields}
    len_map = {f.name: f.length for f in t.fields}
    # Cardinality stats
    field_non_null = Counter()
    field_distinct = {f: Counter() for f in fields}
    date_min = {}
    date_max = {}
    total = 0
    memo_lengths = Counter()
    for rec in t:
        total += 1
        for f in fields:
            v = rec.get(f)
            if not is_empty(v):
                field_non_null[f] += 1
                if f.startswith("cir") and "fec" in f and isinstance(v, type(v)) and hasattr(v, "year"):
                    if hasattr(v, "year") and 1990 < v.year < 2050:
                        if f not in date_min or v < date_min[f]:
                            date_min[f] = v
                        if f not in date_max or v > date_max[f]:
                            date_max[f] = v
                # Sample only for short text/numeric to limit memory
                if len(field_distinct[f]) < 200:
                    field_distinct[f][str(v)[:80]] += 1
                if type_map[f] == "M":
                    if isinstance(v, str):
                        memo_lengths[f"len:{len(v)}"] += 1
    # Compute coverage and cardinality
    fields_summary = []
    for f in fields:
        nn = field_non_null[f]
        d = field_distinct[f]
        fields_summary.append({
            "name": f,
            "type": type_map[f],
            "len": len_map[f],
            "non_null": nn,
            "null_or_blank": total - nn,
            "coverage_pct": round(100.0 * nn / max(total, 1), 2),
            "distinct_sampled": len(d),
            "top_values": d.most_common(8),
        })
    return {
        "name": name,
        "total_records": total,
        "fields_count": len(fields),
        "fields": fields_summary,
        "date_min": {k: v.isoformat() for k, v in date_min.items()},
        "date_max": {k: v.isoformat() for k, v in date_max.items()},
        "memo_lengths_top": memo_lengths.most_common(10),
    }


def main():
    targets = ["CIRUGIA", "CIRNOTAS", "CIRTIP", "CLIENTE", "ARTICULO",
               "ATRIENT", "ARTATRI", "CLIATRI", "FORMHIS", "FORMULA1",
               "FORMULA2", "STOCK", "VARHIS", "HISREG", "HISCON",
               "HISCOS", "HISCAM", "HISPRE", "HISVAL", "OBRAS",
               "MEDPAG", "CONDPAG", "VIAJANTE", "TRANSPOR", "LOCALIDA",
               "PROVINCI", "EMPRESA", "SUCURSALES", "OPERARIO",
               "CENCOS", "CONCEPTO", "CONCEP", "MENSAJE", "INSUMIDO"]
    out = {}
    for n in targets:
        print(f"Profiling {n}...")
        out[n] = profile_table(n)
        print(f"  records={out[n].get('total_records', '?')}, fields={out[n].get('fields_count', '?')}")
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False, default=str)
    print(f"Saved to {OUT_JSON}")


if __name__ == "__main__":
    main()
