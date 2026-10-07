"""Phase 14: Clasificar migrabilidad A/B/C/D independiente.
A = alta confianza: mapping directo y verificable
B = transformación: mapping con transformaciones (formato, encoding, etc.)
C = validación humana: requiere revisión manual
D = no migrar todavía: problemas serios o incompletitud
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
    cir = load_dbf("CIRUGIA")
    cir_2026 = []
    cir_2026_with_stock = set()
    cir_2026_with_vta = set()
    cir_2026_fin_with_vta = []
    cir_by_cod = {}
    for rec in cir:
        feccar = rec.get("cirfeccar")
        fec = rec.get("cirfec")
        if not (isinstance(feccar, date) and feccar.year == 2026) and not (isinstance(fec, date) and fec.year == 2026):
            continue
        cod = rec.get("circod")
        cir_by_cod[cod] = rec
        cir_2026.append(cod)

    stock = load_dbf("STOCK")
    for rec in stock:
        c = rec.get("stkcircod")
        if c and c in cir_by_cod:
            cir_2026_with_stock.add(c)

    cuentas = load_dbf("CUENTAS")
    for rec in cuentas:
        c = rec.get("vtacircod")
        if c and c in cir_by_cod:
            cir_2026_with_vta.add(c)

    # Classify each 2026 surgery
    A = 0  # alta confianza
    B = 0  # transformación
    C = 0  # validación humana
    D = 0  # no migrar
    details = defaultdict(list)
    for cod in cir_2026:
        rec = cir_by_cod[cod]
        est = (rec.get("cirestado") or "").strip()
        has_pac = bool((rec.get("cirpaccod") or "").strip())
        has_med = bool((rec.get("cirmedcod") or "").strip())
        has_hos = bool((rec.get("cirhoscod") or "").strip())
        has_os = bool((rec.get("ciroscod") or "").strip())
        has_cirfec = isinstance(rec.get("cirfec"), date)
        has_feccar = isinstance(rec.get("cirfeccar"), date)
        has_stock = cod in cir_2026_with_stock
        has_vta = cod in cir_2026_with_vta

        if not has_feccar and not has_cirfec:
            D += 1
            details["D_no_date"].append(cod)
        elif not has_pac:
            C += 1
            details["C_no_patient"].append(cod)
        elif est in ("FIN", "REA", "AUT", "TRA", "PEN"):
            if has_stock and has_vta:
                # complete surgery, all 4 contacts (or 3 + 1 implicit), stock + invoice
                A += 1
                details["A_complete"].append(cod)
            elif has_vta:
                B += 1
                details["B_vta_only"].append(cod)
            else:
                C += 1
                details["C_vta_missing"].append(cod)
        elif est in ("CAN", "SUS", "SCO"):
            # cancelled surgeries may have partial data
            if has_pac and has_stock:
                B += 1
                details["B_cancelled_with_stock"].append(cod)
            elif has_pac:
                A += 1
                details["A_cancelled_basic"].append(cod)
            else:
                C += 1
                details["C_cancelled_partial"].append(cod)
        elif est == "SAU":
            # pending surgeries may have full contact info but no stock yet
            if has_pac and has_med and has_hos and has_os:
                A += 1
                details["A_sau_complete"].append(cod)
            elif has_pac:
                B += 1
                details["B_sau_partial"].append(cod)
            else:
                C += 1
                details["C_sau_partial"].append(cod)
        else:
            D += 1
            details["D_unknown_estado"].append(cod)

    print("Clasificación de migrabilidad (2026):")
    print(f"  A = alta confianza: {A}")
    print(f"  B = transformación: {B}")
    print(f"  C = validación humana: {C}")
    print(f"  D = no migrar: {D}")
    print(f"  Total: {len(cir_2026)}")
    print()
    for cat, items in details.items():
        print(f"  {cat}: {len(items)}")
    print()
    # Save
    out = {
        "cir_2026_total": len(cir_2026),
        "A_alta": A,
        "B_transformacion": B,
        "C_validacion_humana": C,
        "D_no_migrar": D,
        "details_counts": {k: len(v) for k, v in details.items()},
        "examples": {k: v[:10] for k, v in details.items()},
    }
    with open(OUT_DIR / "14_migrabilidad.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print(f"Saved {OUT_DIR / '14_migrabilidad.json'}")


if __name__ == "__main__":
    main()
