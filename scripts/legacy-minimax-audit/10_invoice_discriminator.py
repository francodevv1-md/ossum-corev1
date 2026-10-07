"""Discriminate invoice states vs surgery states.
- VTATIP, VTACOM, VTAIMP, VTAESTTRA, VTAELE distribution by estado cirugía
- Find the distinguishing combination
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


def main():
    # Load CIRUGIA 2026
    cir = load_dbf("CIRUGIA")
    cir_by_cod = {}
    for rec in cir:
        feccar = rec.get("cirfeccar")
        fec = rec.get("cirfec")
        if not (isinstance(feccar, date) and feccar.year == 2026) and not (isinstance(fec, date) and fec.year == 2026):
            continue
        cir_by_cod[rec.get("circod")] = rec

    # Load CUENTAS and analyze by surgery estado
    cuentas = load_dbf("CUENTAS")
    inv_by_estado = defaultdict(lambda: defaultdict(Counter))
    # Per cirugia: collect all invoice field values
    inv_per_cir = defaultdict(list)
    for rec in cuentas:
        c = rec.get("vtacircod")
        if c and c in cir_by_cod:
            cir_rec = cir_by_cod[c]
            est = (cir_rec.get("cirestado") or "").strip()
            inv_per_cir[c].append({
                "vtacod": rec.get("vtacod"),
                "vtatip": rec.get("vtatip"),
                "vtacom": rec.get("vtacom"),
                "vtaimp": rec.get("vtaimp"),
                "vtaesttra": rec.get("vtaesttra"),
                "vtaestcom": rec.get("vtaestcom"),
                "vtaele": rec.get("vtaele"),
                "vtacai": (rec.get("vtacai") or "")[:14],
                "vtacptecv": rec.get("vtacptecv"),
                "vtafecemi": rec.get("vtafecemi"),
                "vtatotal": rec.get("vtatotal"),
            })
            inv_by_estado[est]["vtatip"][str(rec.get("vtatip") or "").strip()] += 1
            inv_by_estado[est]["vtacom"][str(rec.get("vtacom") or "").strip()] += 1
            inv_by_estado[est]["vtaimp"][str(rec.get("vtaimp") or "").strip()] += 1
            inv_by_estado[est]["vtaesttra"][str(rec.get("vtaesttra") or "").strip()] += 1
            inv_by_estado[est]["vtaestcom"][str(rec.get("vtaestcom") or "").strip()] += 1
            inv_by_estado[est]["vtaele"][str(rec.get("vtaele") or "").strip()] += 1
            inv_by_estado[est]["vtacai"][str(rec.get("vtacai") or "").strip()[:14]] += 1
            inv_by_estado[est]["vtacptecv"][str(rec.get("vtacptecv") or "").strip()] += 1
    print("Invoice field distributions by surgery estado (2026):")
    for est in ["SAU", "AUT", "PEN", "TRA", "REA", "FIN", "CAN", "SUS", "SCO"]:
        print(f"\n## {est}:")
        for fld, vals in inv_by_estado[est].items():
            print(f"  {fld}: {dict(vals)}")
    # Look at the FULL chain for a sample FIN surgery
    sample_cir = None
    for cod, cir_rec in cir_by_cod.items():
        if (cir_rec.get("cirestado") or "").strip() == "FIN" and len(inv_per_cir.get(cod, [])) >= 2:
            sample_cir = cod
            break
    if sample_cir:
        print(f"\n\n=== SAMPLE FIN surgery {sample_cir}: all invoices ===")
        cir_rec = cir_by_cod[sample_cir]
        print(f"CIRUGIA: estado={cir_rec.get('cirestado')} cirfec={cir_rec.get('cirfec')} feclog={cir_rec.get('cirfeclog')}")
        for v in inv_per_cir[sample_cir]:
            print(f"  VTA {v['vtacod']} tip={v['vtatip']} com={v['vtacom']} imp={v['vtaimp']} "
                  f"esttra={v['vtaesttra']} estcom={v['vtaestcom']} ele={v['vtaele']} "
                  f"cai='{v['vtacai']}' cptecv={v['vtacptecv']} total={v['vtatotal']} fec={v['vtafecemi']}")
    # Same for a CAN surgery
    sample_cir = None
    for cod, cir_rec in cir_by_cod.items():
        if (cir_rec.get("cirestado") or "").strip() == "CAN" and len(inv_per_cir.get(cod, [])) >= 2:
            sample_cir = cod
            break
    if sample_cir:
        print(f"\n\n=== SAMPLE CAN surgery {sample_cir}: all invoices ===")
        cir_rec = cir_by_cod[sample_cir]
        print(f"CIRUGIA: estado={cir_rec.get('cirestado')} cirfec={cir_rec.get('cirfec')} feclog={cir_rec.get('cirfeclog')}")
        for v in inv_per_cir[sample_cir]:
            print(f"  VTA {v['vtacod']} tip={v['vtatip']} com={v['vtacom']} imp={v['vtaimp']} "
                  f"esttra={v['vtaesttra']} estcom={v['vtaestcom']} ele={v['vtaele']} "
                  f"cai='{v['vtacai']}' cptecv={v['vtacptecv']} total={v['vtatotal']} fec={v['vtafecemi']}")


if __name__ == "__main__":
    main()
