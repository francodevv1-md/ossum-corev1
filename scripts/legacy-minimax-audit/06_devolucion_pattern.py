"""Phase 7 + 8: Identify the devolution pattern rigorously.
Test STKDEV='S' or STKCOM='RE' + STKESO=E + specific STKTIP combinations as potential devolution markers.

For each 2026 surgery:
- check if it has stock records
- check if any has devolution pattern
- cross-reference with cirugia estado
- compute sensitivity/specificity
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


def main():
    # Load CIRUGIA 2026
    cir = load_dbf("CIRUGIA")
    cir_by_cod = {}
    cir_2026 = []
    for rec in cir:
        feccar = rec.get("cirfeccar")
        fec = rec.get("cirfec")
        if not isinstance(feccar, date) and not isinstance(fec, date):
            continue
        # Include if carga or cirugia is in 2026
        is_2026 = (isinstance(feccar, date) and feccar.year == 2026) or (isinstance(fec, date) and fec.year == 2026)
        if not is_2026:
            continue
        cod = rec.get("circod")
        cir_by_cod[cod] = rec
        cir_2026.append(cod)
    print(f"2026 surgeries (carga o fecha): {len(cir_2026)}")

    # Load STOCK and index by CIRCOD
    stock = load_dbf("STOCK")
    stock_by_circod = defaultdict(list)
    for rec in stock:
        c = rec.get("stkcircod")
        if c and c > 0:
            stock_by_circod[c].append(rec)
    print(f"STOCK records by CIRCOD: {len(stock_by_circod)} distinct circods")

    # For each 2026 surgery, characterize
    estado_by_cod = {cod: (cir_by_cod[cod].get("cirestado") or "").strip() for cod in cir_2026}
    estados_counter = Counter(estado_by_cod.values())
    print(f"Estados 2026: {dict(estados_counter)}")

    # Compute per-cirugia: has stock, has devol, has entradas, has salidas
    resumen = {}
    for cod in cir_2026:
        stocks = stock_by_circod.get(cod, [])
        n_stock = len(stocks)
        n_devol = sum(1 for s in stocks if (s.get("stkdev") or "").strip() == "S")
        n_salida = sum(1 for s in stocks if (s.get("stkes") or "").strip() == "S")
        n_entrada = sum(1 for s in stocks if (s.get("stkes") or "").strip() == "E")
        n_remito = sum(1 for s in stocks if (s.get("stkcom") or "").strip() == "RE")
        has_devol = n_devol > 0
        has_remito = n_remito > 0
        has_entrada = n_entrada > 0
        resumen[cod] = {
            "estado": estado_by_cod[cod],
            "n_stock": n_stock,
            "n_devol": n_devol,
            "n_salida": n_salida,
            "n_entrada": n_entrada,
            "n_remito": n_remito,
            "has_devol": has_devol,
            "has_remito": has_remito,
            "has_entrada": has_entrada,
        }

    # Compute sensitivity/specificity for devolution patterns
    # Known positive = CAN/SUS/SCO (any of these states is "should have devolution if material was attached")
    devolvible_states = {"CAN", "SUS", "SCO"}
    finished_states = {"FIN", "REA"}  # should NOT have devolution (or rare)

    # For each pattern, compute:
    # TP: state in devolvible AND pattern matches
    # FN: state in devolvible AND pattern does NOT match
    # TN: state in finished AND pattern does NOT match
    # FP: state in finished AND pattern matches

    patterns = {
        "any_devol_S": lambda r: r["has_devol"],
        "any_remito": lambda r: r["has_remito"],
        "any_entrada": lambda r: r["has_entrada"],
        "devol_AND_entrada": lambda r: r["has_devol"] and r["has_entrada"],
        "devol_AND_remito": lambda r: r["has_devol"] and r["has_remito"],
    }
    # Filter to records with stock
    con_stock = {c: r for c, r in resumen.items() if r["n_stock"] > 0}
    print(f"  Con stock: {len(con_stock)}")
    # Distribution by estado (those with stock)
    est_con_stock = Counter(r["estado"] for r in con_stock.values())
    print(f"  Estado de los que TIENEN stock: {dict(est_con_stock)}")
    sin_stock = sum(1 for r in resumen.values() if r["n_stock"] == 0)
    print(f"  Sin stock: {sin_stock}")
    print()

    pattern_results = {}
    for pname, pfunc in patterns.items():
        TP = sum(1 for r in con_stock.values() if r["estado"] in devolvible_states and pfunc(r))
        FN = sum(1 for r in con_stock.values() if r["estado"] in devolvible_states and not pfunc(r))
        FP = sum(1 for r in con_stock.values() if r["estado"] in finished_states and pfunc(r))
        TN = sum(1 for r in con_stock.values() if r["estado"] in finished_states and not pfunc(r))
        sens = TP / max(TP + FN, 1)
        spec = TN / max(TN + FP, 1)
        acc = (TP + TN) / max(TP + FN + FP + TN, 1)
        pattern_results[pname] = {
            "TP": TP, "FN": FN, "FP": FP, "TN": TN,
            "sensitivity": round(sens, 4),
            "specificity": round(spec, 4),
            "accuracy": round(acc, 4),
        }
    print("Pattern classification metrics:")
    for pname, m in pattern_results.items():
        print(f"  {pname}: TP={m['TP']} FN={m['FN']} FP={m['FP']} TN={m['TN']} "
              f"Sens={m['sensitivity']:.3f} Spec={m['specificity']:.3f} Acc={m['accuracy']:.3f}")
    print()
    # How many CAN/SUS/SCO con_stock but NO devol?
    for est in ["CAN", "SUS", "SCO"]:
        n_total = sum(1 for r in con_stock.values() if r["estado"] == est)
        n_with_devol = sum(1 for r in con_stock.values() if r["estado"] == est and r["has_devol"])
        print(f"  {est}: con_stock={n_total}, con_devol={n_with_devol}")
    # And FIN/REA
    for est in ["FIN", "REA"]:
        n_total = sum(1 for r in con_stock.values() if r["estado"] == est)
        n_with_devol = sum(1 for r in con_stock.values() if r["estado"] == est and r["has_devol"])
        print(f"  {est}: con_stock={n_total}, con_devol={n_with_devol}")

    # Save
    out = {
        "cir_2026_total": len(cir_2026),
        "cir_2026_con_stock": len(con_stock),
        "cir_2026_sin_stock": sin_stock,
        "estados_counter": dict(estados_counter),
        "est_con_stock": dict(est_con_stock),
        "pattern_metrics": pattern_results,
        "by_estado_devol": {
            est: {
                "con_stock": sum(1 for r in con_stock.values() if r["estado"] == est),
                "con_devol": sum(1 for r in con_stock.values() if r["estado"] == est and r["has_devol"]),
                "con_entrada": sum(1 for r in con_stock.values() if r["estado"] == est and r["has_entrada"]),
                "con_remito": sum(1 for r in con_stock.values() if r["estado"] == est and r["has_remito"]),
            } for est in ["SAU", "AUT", "PEN", "TRA", "REA", "FIN", "CAN", "SUS", "SCO"]
        },
    }
    with open(OUT_DIR / "06_devolucion_pattern.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print(f"\nSaved {OUT_DIR / '06_devolucion_pattern.json'}")


if __name__ == "__main__":
    main()
