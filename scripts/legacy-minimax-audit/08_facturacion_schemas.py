"""Phase 10: Facturación. Check CUENTAS, CUENTASD, CUENTASC, CUENTASH schemas and link to CIRUGIA via STOCK.STKVTACOD.
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
    return DBF(str(p), lowernames=True, load=True, ignore_missing_memofile=True)


def get_schema(name):
    p = BACKUP / f"{name}.DBF"
    if not p.exists():
        p = BACKUP / f"{name}.dbf"
    t = DBF(str(p), lowernames=True, load=False, ignore_missing_memofile=True)
    return [(f.name, f.type, f.length) for f in t.fields], t.header.numrecords


def main():
    # Check schemas first
    for t in ["CUENTAS", "CUENTASD", "CUENTASC", "CUENTASH", "COBROS", "DEBCRE", "NUMERATO"]:
        try:
            fields, nrec = get_schema(t)
            print(f"\n## {t}: {nrec:,} records, {len(fields)} fields")
            for name, type_, length in fields:
                print(f"  {name:18s} {type_:3s} L{length:>3d}")
        except Exception as e:
            print(f"{t}: ERROR {e}")


if __name__ == "__main__":
    main()
