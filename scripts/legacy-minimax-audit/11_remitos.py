"""Phase 11: Remitos / Logística.
- Determine if there's a 'remito' table or if remitos are just comprobante type RE
- Find remito (entrega) records by checking CUENTAS with specific comprobante or via STOCK
"""
import json
from pathlib import Path
from collections import Counter, defaultdict
from datetime import date
from dbfread import DBF

BACKUP = Path(r"E:\OSSUM_COR_ANTIGRAVITY\Backup_DistriCorr_29092026")
OUT_DIR = Path(r"E:\OSSUM_COR_ANTIGRAVITY\ux-ui\.tmp\consultar-plus-minimax-audit")


def load_dbf(name):
    p = BACKUP / f"{name}.DBF"
    if not p.exists():
        p = BACKUP / f"{name}.dbf"
    return DBF(str(p), lowernames=True, load=True, ignore_missing_memofile=True, char_decode_errors="replace")


def get_schema(name):
    p = BACKUP / f"{name}.DBF"
    if not p.exists():
        p = BACKUP / f"{name}.dbf"
    t = DBF(str(p), lowernames=True, load=False, ignore_missing_memofile=True)
    return [(f.name, f.type, f.length) for f in t.fields], t.header.numrecords


def main():
    # Look for tables with REMITO, REMIT, ENTRE, LOGIST in name
    print("Tables with REMITO/REMIT/ENTRE/LOGIST in name:")
    for p in sorted(BACKUP.glob("*.DBF")):
        name = p.name.upper()
        if any(k in name for k in ["REMIT", "ENTRE", "LOGIST"]):
            try:
                fields, nrec = get_schema(p.stem)
                print(f"  {p.name}: {nrec:,} rec, {len(fields)} fields")
                for n, t, l in fields[:20]:
                    print(f"    {n:18s} {t:3s} L{l:>3d}")
            except Exception as e:
                print(f"  {p.name}: ERROR {e}")
    print()
    # Check REPARTO and REPARTO1
    for t in ["REPARTO", "REPARTO1", "REPART", "REPAR"]:
        try:
            fields, nrec = get_schema(t)
            print(f"\n## {t}: {nrec:,} records")
            for n, tp, l in fields:
                print(f"  {n:20s} {tp:3s} L{l:>3d}")
        except Exception as e:
            pass
    # Check sample repart records
    try:
        rep = load_dbf("REPARTO")
        rep1 = load_dbf("REPARTO1")
        print(f"\nREPARTO total records: {len(list(rep))}")
        print(f"REPARTO1 total records: {len(list(rep1))}")
        rep = load_dbf("REPARTO")
        sample = []
        for i, rec in enumerate(rep):
            if i >= 30: break
            sample.append({k: str(v)[:60] for k, v in rec.items()})
        for s in sample:
            print(f"  REPARTO: {s}")
    except Exception as e:
        print(f"REPARTO ERROR: {e}")


if __name__ == "__main__":
    main()
