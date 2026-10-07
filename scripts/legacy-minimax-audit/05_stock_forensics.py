"""Phase 5: Deep forensics STOCK/STOCK1. Analyze all combinations of STKTIP/STKES/STKDEV x MOVES/MOVUNI/MOVCER/MOVCON.
Also analyze temporal sequences within a surgery code (CIRCOD).
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


def analyze_stock_full():
    """Full STOCK analysis."""
    t = load_dbf("STOCK")
    combos = Counter()
    stktip_x_stkes = Counter()
    stktip_x_stkdev = Counter()
    stkes_x_stkdev = Counter()
    triple = Counter()
    by_stktip = Counter()
    by_stkes = Counter()
    by_stkdev = Counter()
    by_stkcom = Counter()
    stktip_descriptions = defaultdict(list)
    stkcom_x_stktip = Counter()
    stkcom_x_stkes = Counter()
    stkconce_samples = defaultdict(list)
    # Get sample stkobs by combination
    obs_samples = defaultdict(list)
    # For surgeries: filter to records with CIRCOD set
    surgery_stock_combos = Counter()
    surgery_count = 0
    non_surgery_count = 0
    for rec in t:
        stktip = (rec.get("stktip") or "").strip()
        stkes = (rec.get("stkes") or "").strip()
        stkdev = (rec.get("stkdev") or "").strip()
        stkcom = (rec.get("stkcom") or "").strip()
        circod = rec.get("stkcircod")
        by_stktip[stktip] += 1
        by_stkes[stkes] += 1
        by_stkdev[stkdev] += 1
        by_stkcom[stkcom] += 1
        stktip_x_stkes[(stktip, stkes)] += 1
        stktip_x_stkdev[(stktip, stkdev)] += 1
        stkes_x_stkdev[(stkes, stkdev)] += 1
        triple[(stktip, stkes, stkdev)] += 1
        combos[(stktip, stkes, stkdev, stkcom)] += 1
        stkcom_x_stktip[(stktip, stkcom)] += 1
        stkcom_x_stkes[(stkes, stkcom)] += 1
        # Sample stkobs per combo
        obs = rec.get("stkobs") or ""
        if obs and len(obs_samples[(stktip, stkes, stkdev)]) < 30:
            obs_samples[(stktip, stkes, stkdev)].append(obs[:80])
        conce = rec.get("stkconce") or ""
        if conce and len(stkconce_samples[(stktip, stkes)]) < 10:
            stkconce_samples[(stktip, stkes)].append(conce[:80])
        if circod and circod > 0:
            surgery_count += 1
            surgery_stock_combos[(stktip, stkes, stkdev, stkcom)] += 1
        else:
            non_surgery_count += 1
    return {
        "total_records": sum(by_stktip.values()),
        "by_stktip": dict(by_stktip),
        "by_stkes": dict(by_stkes),
        "by_stkdev": dict(by_stkdev),
        "by_stkcom": dict(by_stkcom),
        "stktip_x_stkes": {f"{a}|{b}": c for (a, b), c in stktip_x_stkes.items()},
        "stktip_x_stkdev": {f"{a}|{b}": c for (a, b), c in stktip_x_stkdev.items()},
        "stkes_x_stkdev": {f"{a}|{b}": c for (a, b), c in stkes_x_stkdev.items()},
        "triple": {f"{a}|{b}|{c}": n for (a, b, c), n in triple.items()},
        "all_combos": {f"{a}|{b}|{c}|{d}": n for (a, b, c, d), n in combos.items()},
        "stkcom_x_stktip": {f"{a}|{b}": c for (a, b), c in stkcom_x_stktip.items()},
        "stkcom_x_stkes": {f"{a}|{b}": c for (a, b), c in stkcom_x_stkes.items()},
        "obs_samples": {f"{a}|{b}|{c}": v for (a, b, c), v in obs_samples.items()},
        "stkconce_samples": {f"{a}|{b}": v for (a, b), v in stkconce_samples.items()},
        "surgery_stock_combos": {f"{a}|{b}|{c}|{d}": n for (a, b, c, d), n in surgery_stock_combos.items()},
        "surgery_count": surgery_count,
        "non_surgery_count": non_surgery_count,
    }


def analyze_stock1_sample(n=20000):
    """Sample STOCK1 to understand MOVES/MOVUNI/MOVCER/MOVCON/MOVSTKCOD combinations."""
    t = load_dbf("STOCK1")
    moves_x_movuni = Counter()
    moves_x_movcer = Counter()
    movcon_dist = Counter()
    moves_dist = Counter()
    movuni_dist = Counter()
    movcer_dist = Counter()
    # The MOVSTKCOD/MOVMOVORD pair is for reversals
    reversal_with_stkcod = 0
    reversal_no_stkcod = 0
    reverse_combos = Counter()
    surgery_count = 0
    non_surgery_count = 0
    by_stkcod = 0
    moves_x_dev_proxy = Counter()  # E/S x S/N
    cero_count = 0
    cero_sample = []
    sample_count = 0
    for rec in t:
        sample_count += 1
        if sample_count > n:
            break
        moves = (rec.get("moves") or "").strip()
        movuni = (rec.get("movuni") or "").strip()
        movcer = (rec.get("movcer") or "").strip()
        movcon = rec.get("movcon")
        movstkcod = rec.get("movstkcod") or 0
        movmovord = rec.get("movmovord") or 0
        if movstkcod > 0:
            reversal_with_stkcod += 1
            reverse_combos[(moves, movstkcod > 0)] += 1
        else:
            reversal_no_stkcod += 1
        moves_dist[moves] += 1
        movuni_dist[movuni] += 1
        movcer_dist[movcer] += 1
        if movcon is not None:
            movcon_dist[movcon] += 1
        moves_x_movuni[(moves, movuni)] += 1
        moves_x_movcer[(moves, movcer)] += 1
        # Check if MOVCAN negative
        movcan = rec.get("movcan") or 0
        if movcan == 0 or movcan == 0.0:
            cero_count += 1
            if len(cero_sample) < 10:
                cero_sample.append({"stkcod": rec.get("stkcod"), "movord": rec.get("movord"),
                                    "moves": moves, "movcan": movcan, "movcer": movcer,
                                    "movcon": movcon, "movuni": movuni})
    return {
        "sample_size": sample_count,
        "moves_dist": dict(moves_dist),
        "movuni_dist": dict(movuni_dist),
        "movcer_dist": dict(movcer_dist),
        "movcon_dist": dict(movcon_dist),
        "moves_x_movuni": {f"{a}|{b}": c for (a, b), c in moves_x_movuni.items()},
        "moves_x_movcer": {f"{a}|{b}": c for (a, b), c in moves_x_movcer.items()},
        "reversal_with_stkcod": reversal_with_stkcod,
        "reversal_no_stkcod": reversal_no_stkcod,
        "cero_count": cero_count,
        "cero_sample": cero_sample,
    }


def main():
    print("STOCK full analysis...")
    s = analyze_stock_full()
    print(f"  total records: {s['total_records']}")
    print(f"  STKTIP distribution: {s['by_stktip']}")
    print(f"  STKES distribution: {s['by_stkes']}")
    print(f"  STKDEV distribution: {s['by_stkdev']}")
    print(f"  STKCOM distribution: {s['by_stkcom']}")
    print(f"  Triple combos: {s['triple']}")
    print(f"  Surgery records: {s['surgery_count']}, non-surgery: {s['non_surgery_count']}")
    print()
    print("STKTIP x STKES:")
    for k, v in sorted(s['stktip_x_stkes'].items()):
        print(f"  {k}: {v}")
    print("STKTIP x STKDEV:")
    for k, v in sorted(s['stktip_x_stkdev'].items()):
        print(f"  {k}: {v}")
    print("STKES x STKDEV:")
    for k, v in sorted(s['stkes_x_stkdev'].items()):
        print(f"  {k}: {v}")
    print()
    print("STOCK surgery combos:")
    for k, v in sorted(s['surgery_stock_combos'].items()):
        print(f"  {k}: {v}")
    print()
    print("Sample stkconce (description of comprobante):")
    for k, v in s['stkconce_samples'].items():
        print(f"  {k}: {v[:5]}")
    print()
    print("STOCK1 sample analysis...")
    s1 = analyze_stock1_sample(n=30000)
    print(f"  MOVES distribution: {s1['moves_dist']}")
    print(f"  MOVUNI distribution: {s1['movuni_dist']}")
    print(f"  MOVCER distribution: {s1['movcer_dist']}")
    print(f"  MOVCON distribution: {s1['movcon_dist']}")
    print(f"  MOVES x MOVUNI: {s1['moves_x_movuni']}")
    print(f"  MOVES x MOVCER: {s1['moves_x_movcer']}")
    print(f"  Reversal with stkcod: {s1['reversal_with_stkcod']}, no stkcod: {s1['reversal_no_stkcod']}")
    out = {"stock": s, "stock1_sample": s1}
    out_path = OUT_DIR / "05_stock_forensics.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print(f"\nSaved {out_path}")


if __name__ == "__main__":
    main()
