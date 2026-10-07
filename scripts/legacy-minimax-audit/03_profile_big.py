"""Profile header-only tables: STOCK1, CLIATRI, ARTATRI, ATRIENT, FORMULA1, FORMHIS, STOCKH, FORMULA2, ARTICULO, CLIENTE, ASIENTOS, ASIENTO1, OBSASO, ADMUSR, ADMGRP, ADMGRP1, CAMBIO, NECCOM, PREFUSR, NUMERATO, BANCOS, INVENTA1, HISVAL, FORMULA2, ADMEVN, ADMMAP, HISCAM.

These have 10K-400K records, can't load fully. Get fields and a sample of records to understand structure.
"""
import json
from pathlib import Path
from dbfread import DBF
from collections import Counter

BACKUP = Path(r"E:\OSSUM_COR_ANTIGRAVITY\Backup_DistriCorr_29092026")
OUT_DIR = Path(r"E:\OSSUM_COR_ANTIGRAVITY\ux-ui\.tmp\consultar-plus-minimax-audit")
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_JSON = OUT_DIR / "03_big_tables_header.json"


def get_schema(name):
    p = BACKUP / f"{name}.DBF"
    if not p.exists():
        p = BACKUP / f"{name}.dbf"
    if not p.exists():
        return {"name": name, "error": "not found"}
    t = DBF(str(p), lowernames=True, load=False, ignore_missing_memofile=True)
    fields = [{"name": f.name, "type": f.type, "len": f.length, "dec": getattr(f, 'decimal_count', 0) or 0} for f in t.fields]
    return {
        "name": name,
        "num_records": t.header.numrecords,
        "headerlen": t.header.headerlen,
        "recordlen": t.header.recordlen,
        "fields": fields,
        "field_names": [f["name"] for f in fields],
        "encoding": t.encoding,
        "has_memo": t.memofilename is not None,
    }


def get_sample(name, n=2000):
    """Load only first n records of a table to inspect values."""
    p = BACKUP / f"{name}.DBF"
    if not p.exists():
        p = BACKUP / f"{name}.dbf"
    if not p.exists():
        return {"name": name, "error": "not found"}
    t = DBF(str(p), lowernames=True, load=True, ignore_missing_memofile=True)
    fields = [f.name for f in t.fields]
    type_map = {f.name: f.type for f in t.fields}
    field_non_null = Counter()
    field_distinct = {f: Counter() for f in fields}
    field_min = {}
    field_max = {}
    total = 0
    for rec in t:
        if total >= n:
            break
        total += 1
        for f in fields:
            v = rec.get(f)
            if v is None:
                continue
            if isinstance(v, str) and v.strip() == "":
                continue
            field_non_null[f] += 1
            if len(field_distinct[f]) < 100:
                field_distinct[f][str(v)[:60]] += 1
            if type_map[f] in ("N", "F") and isinstance(v, (int, float)):
                if f not in field_min or v < field_min[f]:
                    field_min[f] = v
                if f not in field_max or v > field_max[f]:
                    field_max[f] = v
    fields_summary = []
    for f in fields:
        d = field_distinct[f]
        fields_summary.append({
            "name": f,
            "type": type_map[f],
            "non_null_sampled": field_non_null[f],
            "distinct_sampled": len(d),
            "top_values": d.most_common(6),
            "min": field_min.get(f),
            "max": field_max.get(f),
        })
    return {
        "name": name,
        "sampled": total,
        "fields": fields_summary,
    }


def get_sample_safe(name, n=2000):
    try:
        return get_sample(name, n=n)
    except Exception as e:
        # Fall back to schema
        return {"name": name, "sample_error": f"{type(e).__name__}: {e}", "schema": get_schema(name)}


def main():
    # Header-only for very large tables
    bigs_header = ["STOCK1", "STOCKH", "ATRIENT", "FORMHIS", "FORMULA1",
                   "CLIATRI", "ARTATRI", "ARTICULO", "CLIENTE", "ASIENTOS",
                   "ASIENTO1", "OBSASO", "ADMUSR", "ADMGRP", "ADMGRP1",
                   "CAMBIO", "NECCOM", "PREFUSR", "NUMERATO", "BANCOS",
                   "INVENTA1", "HISVAL", "FORMULA2", "ADMEVN", "ADMMAP",
                   "CIRCOD", "CIRCOD1", "CIRCOD2"]
    # Sample values for medium ones
    samples = ["STOCK1", "STOCKH", "FORMHIS", "FORMULA1", "CLIATRI", "ARTATRI",
               "ASIENTOS", "ASIENTO1", "OBSASO", "ADMUSR", "ADMGRP", "ADMGRP1",
               "CAMBIO", "NECCOM", "PREFUSR", "NUMERATO", "ADMMAP", "HISVAL"]
    schemas = {}
    samples_d = {}
    for n in bigs_header:
        print(f"Schema {n}...")
        schemas[n] = get_schema(n)
    for n in samples:
        print(f"Sample {n}...")
        samples_d[n] = get_sample_safe(n, n=2500 if n in ('STOCK1', 'STOCKH', 'FORMHIS', 'FORMULA1', 'CLIATRI', 'ASIENTOS', 'ASIENTO1', 'OBSASO', 'NECCOM', 'PREFUSR', 'CAMBIO') else 1000)
    out = {"schemas": schemas, "samples": samples_d}
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False, default=str)
    print(f"Saved to {OUT_JSON}")


if __name__ == "__main__":
    main()
