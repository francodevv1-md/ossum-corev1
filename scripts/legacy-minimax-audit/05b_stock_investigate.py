"""Deeper analysis: STKTIP C, sequence for known 2026 surgeries."""
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


def investigate_C():
    """Investigate STKTIP C records - get all stkobs and stkconce."""
    t = load_dbf("STOCK")
    c_samples = []
    c_obs = Counter()
    c_conce = []
    by_stkes = Counter()
    by_stkdev = Counter()
    by_stkcom = Counter()
    for rec in t:
        if (rec.get("stktip") or "").strip() == "C":
            c_samples.append({
                "stkcod": rec.get("stkcod"),
                "stkes": rec.get("stkes"),
                "stkdev": rec.get("stkdev"),
                "stkcom": rec.get("stkcom"),
                "stkcircod": rec.get("stkcircod"),
                "stkvtacod": rec.get("stkvtacod"),
                "stkfec": rec.get("stkfec"),
                "stkobs": (rec.get("stkobs") or "")[:120],
                "stkconce": (rec.get("stkconce") or "")[:120],
                "stknro": rec.get("stknro"),
                "stkusr": rec.get("stkusr"),
            })
            obs = (rec.get("stkobs") or "").strip()
            if obs: c_obs[obs[:80]] += 1
            conce = (rec.get("stkconce") or "").strip()
            if conce: c_conce.append(conce[:120])
            by_stkes[(rec.get("stkes") or "").strip()] += 1
            by_stkdev[(rec.get("stkdev") or "").strip()] += 1
            by_stkcom[(rec.get("stkcom") or "").strip()] += 1
    return {
        "total_C": len(c_samples),
        "by_stkes": dict(by_stkes),
        "by_stkdev": dict(by_stkdev),
        "by_stkcom": dict(by_stkcom),
        "obs_top": c_obs.most_common(20),
        "conce_samples": c_conce[:30],
        "samples": c_samples[:30],
    }


def analyze_surgery_sequences(circods):
    """For specific surgeries, build the STOCK/STOCK1 sequence."""
    t_stock = load_dbf("STOCK")
    t_stock1 = load_dbf("STOCK1")
    # Build stock headers by circod
    stock_by_circod = defaultdict(list)
    for rec in t_stock:
        c = rec.get("stkcircod")
        if c and c in circods:
            stock_by_circod[c].append(rec)
    # Build stock1 movements by stkcod
    stock1_by_stkcod = defaultdict(list)
    for rec in t_stock1:
        s = rec.get("stkcod")
        if s:
            stock1_by_stkcod[s].append(rec)
    results = {}
    for cod in circods:
        stocks = stock_by_circod.get(cod, [])
        seq = []
        for s in stocks:
            stkcod = s.get("stkcod")
            seq.append({
                "stkcod": stkcod,
                "stktip": (s.get("stktip") or "").strip(),
                "stkes": (s.get("stkes") or "").strip(),
                "stkdev": (s.get("stkdev") or "").strip(),
                "stkcom": (s.get("stkcom") or "").strip(),
                "stkfec": s.get("stkfec"),
                "stkusr": (s.get("stkusr") or "").strip(),
                "stkvtacod": s.get("stkvtacod"),
                "stkobs": (s.get("stkobs") or "")[:80],
                "stkconce": (s.get("stkconce") or "")[:80],
                "stknro": s.get("stknro"),
            })
            # Add movements
            movs = stock1_by_stkcod.get(stkcod, [])
            for m in sorted(movs, key=lambda r: r.get("movord") or 0):
                seq.append({
                    "mov": True,
                    "movord": m.get("movord"),
                    "artcod": (m.get("artcod") or "").strip(),
                    "movcan": m.get("movcan"),
                    "moves": (m.get("moves") or "").strip(),
                    "movuni": (m.get("movuni") or "").strip(),
                    "movcer": (m.get("movcer") or "").strip(),
                    "movstkcod": m.get("movstkcod"),
                    "movmovord": m.get("movmovord"),
                    "movfec": m.get("movfec"),
                    "movvtacod": m.get("movvtacod"),
                    "movpedcod": m.get("movpedcod"),
                    "movpedord": m.get("movpedord"),
                })
        results[cod] = seq
    return results


def main():
    print("STKTIP C investigation...")
    c = investigate_C()
    print(f"  Total C records: {c['total_C']}")
    print(f"  By STKES: {c['by_stkes']}")
    print(f"  By STKDEV: {c['by_stkdev']}")
    print(f"  By STKCOM: {c['by_stkcom']}")
    print(f"  Obs top: {c['obs_top'][:10]}")
    print(f"  Conce samples: {c['conce_samples'][:10]}")
    print()
    # Save the analysis
    with open(OUT_DIR / "05b_stktip_c.json", "w", encoding="utf-8") as f:
        json.dump(c, f, indent=2, ensure_ascii=False, default=str)
    # Sample 2026 surgeries for sequence analysis
    with open(OUT_DIR / "04_cirugias_2026.json", encoding="utf-8") as f:
        cir = json.load(f)
    # Get some 2026 FIN, REA, CAN, SUS sample circods
    fin_2026 = [c for c in cir["cir_2026_circod_full"]["FIN"] if isinstance(c, int)][:5]
    rea_2026 = [c for c in cir["cir_2026_circod_full"]["REA"] if isinstance(c, int)][:5]
    can_2026 = [c for c in cir["cir_2026_circod_full"]["CAN"] if isinstance(c, int)][:5]
    sus_2026 = [c for c in cir["cir_2026_circod_full"]["SUS"] if isinstance(c, int)][:5]
    sau_2026 = [c for c in cir["cir_2026_circod_full"]["SAU"] if isinstance(c, int)][:3]
    sample_circods = set(fin_2026 + rea_2026 + can_2026 + sus_2026 + sau_2026)
    print(f"Sample circods for sequence analysis: {sorted(sample_circods)}")
    print()
    print("Loading STOCK/STOCK1 for sequence analysis (this takes a moment)...")
    sequences = analyze_surgery_sequences(sample_circods)
    out_seq = {}
    for cod in sorted(sample_circods):
        out_seq[cod] = sequences[cod]
    with open(OUT_DIR / "05c_surgery_sequences.json", "w", encoding="utf-8") as f:
        json.dump(out_seq, f, indent=2, ensure_ascii=False, default=str)
    print(f"Saved sequences to {OUT_DIR / '05c_surgery_sequences.json'}")
    print()
    # Show one FIN sequence as example
    if fin_2026:
        sample = fin_2026[0]
        print(f"\n=== EXAMPLE: Surgery CIRCOD {sample} (FIN 2026) ===")
        for item in sequences[sample][:40]:
            if item.get("mov"):
                print(f"  MOV ord={item['movord']} art={item['artcod']} can={item['movcan']} "
                      f"E/S={item['moves']} U={item['movuni']} cer={item['movcer']} "
                      f"stkref={item['movstkcod']}/{item['movmovord']} fec={item['movfec']}")
            else:
                print(f"  STK {item['stkcod']} TIP={item['stktip']} E/S={item['stkes']} "
                      f"DEV={item['stkdev']} COM={item['stkcom']} fec={item['stkfec']} "
                      f"vtacod={item['stkvtacod']} obs={item['stkobs'][:30]}")


if __name__ == "__main__":
    main()
