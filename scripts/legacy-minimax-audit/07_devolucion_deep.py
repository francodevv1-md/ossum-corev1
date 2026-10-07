"""Deeper devolution investigation. Look at:
1. OBS field for STKDEV=S records
2. Temporal sequence: STKFEC vs CIRFEC vs CIRFECLOG
3. For each FIN surgery with stock, characterize
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
    cir = load_dbf("CIRUGIA")
    cir_by_cod = {}
    cir_2026_fin_with_stock = []
    cir_2026_fin_no_stock = []
    cir_2026_can_with_stock = []
    cir_2026_can_no_stock = []
    for rec in cir:
        feccar = rec.get("cirfeccar")
        fec = rec.get("cirfec")
        if not (isinstance(feccar, date) and feccar.year == 2026) and not (isinstance(fec, date) and fec.year == 2026):
            continue
        cod = rec.get("circod")
        cir_by_cod[cod] = rec
        est = (rec.get("cirestado") or "").strip()

    stock = load_dbf("STOCK")
    stocks_by_cod = defaultdict(list)
    devols_by_cod = defaultdict(list)
    for rec in stock:
        c = rec.get("stkcircod")
        if c and c > 0:
            stocks_by_cod[c].append(rec)
            if (rec.get("stkdev") or "").strip() == "S":
                devols_by_cod[c].append(rec)

    # Look at devolution OBS for a sample
    devol_obs = Counter()
    devol_conce = Counter()
    devol_with_stkref = 0
    devol_no_stkref = 0
    for cod, devs in devols_by_cod.items():
        for d in devs[:10]:
            obs = (d.get("stkobs") or "").strip()
            conce = (d.get("stkconce") or "").strip()
            if obs: devol_obs[obs[:80]] += 1
            if conce: devol_conce[conce[:80]] += 1
    print("Devolución OBS (top 20):")
    for k, v in devol_obs.most_common(20):
        print(f"  [{v}] '{k}'")
    print()
    print("Devolución CONCE (top 20):")
    for k, v in devol_conce.most_common(20):
        print(f"  [{v}] '{k}'")
    print()

    # For FIN surgeries with stock and devol, characterize
    # Find pattern: how many FIN surgeries have devol records but also have ALL materials returned?
    # The devol records in FIN typically have:
    #   - STKCOM = RE (Remito)
    #   - STKTIP = B
    #   - STKES = E (Entrada)
    #   - STKDEV = S

    # Now look at MOV1 movements linked to devolution stock headers
    # and compare with the "original" salida movements
    t1 = load_dbf("STOCK1")
    stock1_by_stk = defaultdict(list)
    for rec in t1:
        s = rec.get("stkcod")
        if s:
            stock1_by_stk[s].append(rec)

    # Find a sample devolution stock header and trace back
    # Get first FIN surgery with devol
    sample_done = 0
    for cod, devs in devols_by_cod.items():
        if sample_done >= 5:
            break
        cir_rec = cir_by_cod.get(cod)
        if not cir_rec:
            continue
        if (cir_rec.get("cirestado") or "").strip() not in ("FIN", "REA"):
            continue
        # Print full sequence
        print(f"\n{'='*60}")
        print(f"CIRCOD {cod}: estado={cir_rec.get('cirestado')} cirfec={cir_rec.get('cirfec')} feccar={cir_rec.get('cirfeccar')} feclog={cir_rec.get('cirfeclog')}")
        stocks = stocks_by_cod.get(cod, [])
        print(f"  STOCK records ({len(stocks)}):")
        for s in stocks:
            print(f"    STK {s.get('stkcod')} TIP={s.get('stktip')} E/S={s.get('stkes')} DEV={s.get('stkdev')} COM={s.get('stkcom')} "
                  f"fec={s.get('stkfec')} vtacod={s.get('stkvtacod')} obs={(s.get('stkobs') or '')[:40]!r} "
                  f"conce={(s.get('stkconce') or '')[:40]!r} usr={s.get('stkusr')}")
            movs = stock1_by_stk.get(s.get("stkcod"), [])
            for m in movs[:8]:
                print(f"      MOV ord={m.get('movord')} art={m.get('artcod')} can={m.get('movcan')} E/S={m.get('moves')} "
                      f"U={m.get('movuni')} cer={m.get('movcer')} stkref={m.get('movstkcod')}/{m.get('movmovord')} "
                      f"fec={m.get('movfec')}")
            if len(movs) > 8:
                print(f"      ... ({len(movs)-8} more movs)")
        sample_done += 1

    # Summary metrics
    total_fin = sum(1 for c in cir_by_cod.values() if (c.get("cirestado") or "").strip() == "FIN")
    fin_with_stock = sum(1 for c in cir_by_cod.values() if (c.get("cirestado") or "").strip() == "FIN" and c.get("circod") in stocks_by_cod)
    fin_with_devol = sum(1 for c in cir_by_cod.values() if (c.get("cirestado") or "").strip() == "FIN" and c.get("circod") in devols_by_cod)
    print(f"\n\nFIN 2026 total: {total_fin}, con_stock: {fin_with_stock}, con_devol: {fin_with_devol}")

    # When are devoluciones created? Temporal check:
    # CIRFEC (surgery date) vs STOCK.STKFEC for the devol record
    devol_before_surgery = 0
    devol_after_surgery = 0
    devol_no_surgery_date = 0
    for cod, devs in devols_by_cod.items():
        cir_rec = cir_by_cod.get(cod)
        if not cir_rec:
            continue
        fec_cir = cir_rec.get("cirfec")
        if not isinstance(fec_cir, date):
            devol_no_surgery_date += 1
            continue
        for d in devs:
            fec_stk = d.get("stkfec")
            if isinstance(fec_stk, date):
                if fec_stk < fec_cir:
                    devol_before_surgery += 1
                else:
                    devol_after_surgery += 1
    print(f"\nDevolución temporal vs CIRFEC: before={devol_before_surgery}, after={devol_after_surgery}, no_cir_date={devol_no_surgery_date}")


if __name__ == "__main__":
    main()
