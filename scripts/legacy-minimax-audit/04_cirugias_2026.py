"""
Phase 4 + 5/6/7/8: Forénsica profunda.
- Cirugías 2026: distribución mensual, por estado, materiales, anomalías.
- STOCK/STOCK1 análisis: combinaciones STKTIP x STKES x STKDEV x MOVES, secuencia envío/consumo/devolución.

Approach: build cache of CIRUGIA, CIRNOTAS, STOCK, STOCK1 (filtered by relevant subset) into a single analysis pass.
"""
import json
from pathlib import Path
from collections import Counter, defaultdict
from datetime import date
from dbfread import DBF

BACKUP = Path(r"E:\OSSUM_COR_ANTIGRAVITY\Backup_DistriCorr_29092026")
OUT_DIR = Path(r"E:\OSSUM_COR_ANTIGRAVITY\ux-ui\.tmp\consultar-plus-minimax-audit")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def load_dbf(name):
    p = BACKUP / f"{name}.DBF"
    if not p.exists():
        p = BACKUP / f"{name}.dbf"
    if not p.exists():
        raise FileNotFoundError(p)
    return DBF(str(p), lowernames=True, load=True, ignore_missing_memofile=True)


def cirugias_2026():
    """Full CIRUGIA filter to 2026 records, and full distribution."""
    t = load_dbf("CIRUGIA")
    rows = []
    by_year = Counter()
    by_year_estado = defaultdict(Counter)
    by_year_month = defaultdict(Counter)
    by_year_cirfec_month = defaultdict(Counter)
    all_estados = Counter()
    canc_2026_with_circod = []
    sus_2026_with_circod = []
    sco_2026_with_circod = []
    fin_2026_with_circod = []
    rea_2026_with_circod = []
    sau_2026_with_circod = []
    aut_2026_with_circod = []
    pen_2026_with_circod = []
    tra_2026_with_circod = []
    for rec in t:
        feccar = rec.get("cirfeccar")
        fec = rec.get("cirfec")
        estado = (rec.get("cirestado") or "").strip()
        if not estado: continue
        all_estados[estado] += 1
        if isinstance(feccar, date):
            y = feccar.year
            by_year[y] += 1
            by_year_estado[y][estado] += 1
            by_year_month[(y, feccar.month)][estado] += 1
        if isinstance(fec, date):
            y2 = fec.year
            by_year_cirfec_month[(y2, fec.month)][estado] += 1
        if isinstance(feccar, date) and feccar.year == 2026:
            if estado == "CAN":
                canc_2026_with_circod.append(rec.get("circod"))
            elif estado == "SUS":
                sus_2026_with_circod.append(rec.get("circod"))
            elif estado == "FIN":
                fin_2026_with_circod.append(rec.get("circod"))
            elif estado == "REA":
                rea_2026_with_circod.append(rec.get("circod"))
            elif estado == "SAU":
                sau_2026_with_circod.append(rec.get("circod"))
            elif estado == "AUT":
                aut_2026_with_circod.append(rec.get("circod"))
            elif estado == "PEN":
                pen_2026_with_circod.append(rec.get("circod"))
            elif estado == "TRA":
                tra_2026_with_circod.append(rec.get("circod"))
            elif estado == "SCO":
                sco_2026_with_circod.append(rec.get("circod"))
        rows.append(rec)
    return {
        "all_estados": all_estados,
        "by_year": by_year,
        "by_year_estado": {str(k): dict(v) for k, v in by_year_estado.items()},
        "by_year_month_fec": {f"{k[0]}-{k[1]:02d}": dict(v) for k, v in by_year_cirfec_month.items()},
        "by_year_month_carga": {f"{k[0]}-{k[1]:02d}": dict(v) for k, v in by_year_month.items()},
        "canc_2026": canc_2026_with_circod,
        "sus_2026": sus_2026_with_circod,
        "fin_2026": fin_2026_with_circod,
        "rea_2026": rea_2026_with_circod,
        "sau_2026": sau_2026_with_circod,
        "aut_2026": aut_2026_with_circod,
        "pen_2026": pen_2026_with_circod,
        "tra_2026": tra_2026_with_circod,
        "sco_2026": sco_2026_with_circod,
    }


def main():
    print("Loading CIRUGIA...")
    cir = cirugias_2026()
    out = {
        "all_estados": dict(cir["all_estados"]),
        "by_year": dict(cir["by_year"]),
        "by_year_estado": cir["by_year_estado"],
        "by_year_month_fec_cirugia": cir["by_year_month_fec"],
        "by_year_month_carga": cir["by_year_month_carga"],
        "cir_2026_counts": {
            "SAU": len(cir["sau_2026"]),
            "AUT": len(cir["aut_2026"]),
            "PEN": len(cir["pen_2026"]),
            "TRA": len(cir["tra_2026"]),
            "REA": len(cir["rea_2026"]),
            "FIN": len(cir["fin_2026"]),
            "CAN": len(cir["canc_2026"]),
            "SUS": len(cir["sus_2026"]),
            "SCO": len(cir["sco_2026"]),
        },
        "cir_2026_circod_by_estado": {
            "SAU": cir["sau_2026"][:5] + ["..."],
            "AUT": cir["aut_2026"][:5] + ["..."],
            "PEN": cir["pen_2026"][:5] + ["..."],
            "TRA": cir["tra_2026"][:5] + ["..."],
            "REA": cir["rea_2026"][:5] + ["..."],
            "FIN": cir["fin_2026"][:5] + ["..."],
            "CAN": cir["canc_2026"][:5] + ["..."],
            "SUS": cir["sus_2026"][:5] + ["..."],
            "SCO": cir["sco_2026"][:5] + ["..."],
        },
    }
    # Persist sample circods for next phase
    out["cir_2026_circod_full"] = {
        "SAU": cir["sau_2026"],
        "AUT": cir["aut_2026"],
        "PEN": cir["pen_2026"],
        "TRA": cir["tra_2026"],
        "REA": cir["rea_2026"],
        "FIN": cir["fin_2026"],
        "CAN": cir["canc_2026"],
        "SUS": cir["sus_2026"],
        "SCO": cir["sco_2026"],
    }
    out_path = OUT_DIR / "04_cirugias_2026.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False, default=str)
    print(f"Saved {out_path}")
    print(f"\nResumen:")
    print(f"  All estados: {dict(cir['all_estados'])}")
    print(f"  By year (carga): {dict(cir['by_year'])}")
    print(f"  2026 counts: {out['cir_2026_counts']}")
    print(f"\n2026 by mes-carga:")
    for k, v in sorted(cir["by_year_month"].items()):
        if k[0] == 2026:
            print(f"  {k[0]}-{k[1]:02d}: {dict(v)}")


if __name__ == "__main__":
    main()
