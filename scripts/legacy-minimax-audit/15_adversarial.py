"""Phase 15: Auditoría adversarial. Look for:
- Duplicates: same CIRCOD twice?
- Impossible dates: cirfec < cirfeccar (creation date after surgery date) more than X days
- cirfec in the past beyond legacy window
- CIRDOC weird patterns
- Stock with circular reference (STK 1 references 1)
- Same SURGERY with contradictory STATUS
- Patient/doctor/hospital with cliact='N' (inactive)
"""
import json
from pathlib import Path
from collections import Counter, defaultdict
from datetime import date, timedelta
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
    cir_by_cod = defaultdict(list)
    bad_dates = []
    far_future = []
    far_past = []
    no_cirfec = 0
    no_feccar = 0
    cirfec_before_feccar = []
    cirfec_after_log = []
    feclog_no_cirfec = []
    cirpaccod_inactive = []
    cirmedcod_inactive = []
    cirdoc_weird = []
    ausrid_dist = Counter()
    pacientes_inact = 0
    medicos_inact = 0
    hosp_inact = 0
    obrasoc_inact = 0

    clientes = load_dbf("CLIENTE")
    cliente_act = {}
    for rec in clientes:
        cliente_act[rec.get("clicod")] = (rec.get("cliact") or "").strip()

    for rec in cir:
        cod = rec.get("circod")
        cir_by_cod[cod].append(rec)
        cirfec = rec.get("cirfec")
        feccar = rec.get("cirfeccar")
        feclog = rec.get("cirfeclog")
        ausr = (rec.get("ausrid") or "").strip()
        if ausr: ausrid_dist[ausr] += 1
        # Bad dates
        if isinstance(cirfec, date) and isinstance(feccar, date):
            if cirfec < feccar - timedelta(days=365):
                cirfec_before_feccar.append((cod, cirfec, feccar))
        if isinstance(feclog, date) and isinstance(cirfec, date):
            if feclog > cirfec + timedelta(days=30):
                cirfec_after_log.append((cod, feclog, cirfec))
        if isinstance(feclog, date) and not isinstance(cirfec, date):
            feclog_no_cirfec.append(cod)
        if not isinstance(cirfec, date):
            no_cirfec += 1
        else:
            if cirfec.year < 2010:
                far_past.append(cod)
            if cirfec.year > 2026:
                far_future.append(cod)
        if not isinstance(feccar, date):
            no_feccar += 1
        # Check contact act
        pac = (rec.get("cirpaccod") or "").strip()
        med = (rec.get("cirmedcod") or "").strip()
        hos = (rec.get("cirhoscod") or "").strip()
        os_ = (rec.get("ciroscod") or "").strip()
        if pac and cliente_act.get(pac) == "N":
            cirpaccod_inactive.append(cod)
            pacientes_inact += 1
        if med and cliente_act.get(med) == "N":
            medicos_inact += 1
        if hos and cliente_act.get(hos) == "N":
            hosp_inact += 1
        if os_ and cliente_act.get(os_) == "N":
            obrasoc_inact += 1
        # CIRDOC pattern
        cirdoc = rec.get("cirdoc") or ""
        if cirdoc and len(cirdoc) != 12 and cirdoc not in ("SNSNSNSNSNSN", "SSSSSSSSSSSS"):
            cirdoc_weird.append((cod, cirdoc))

    # Duplicates
    dups = {k: v for k, v in cir_by_cod.items() if len(v) > 1}
    print(f"Total CIRUGIA: {sum(len(v) for v in cir_by_cod.values())}")
    print(f"Distinct CIRCOD: {len(cir_by_cod)}")
    print(f"CIRCOD duplicated: {len(dups)}")
    if dups:
        for k, v in list(dups.items())[:5]:
            print(f"  CIRCOD {k}: {len(v)} records")
            for r in v:
                print(f"    estado={r.get('cirestado')} cirfec={r.get('cirfec')} feccar={r.get('cirfeccar')}")
    print()
    print(f"Sin cirfec: {no_cirfec}")
    print(f"Sin feccar: {no_feccar}")
    print(f"cirfec antes 2010: {len(far_past)}")
    print(f"cirfec después 2026: {len(far_future)}")
    print(f"feclog sin cirfec: {len(feclog_no_cirfec)}")
    print(f"feclog muy después de cirfec (>30d): {len(cirfec_after_log)}")
    print(f"cirfec < feccar-365d: {len(cirfec_before_feccar)}")
    print(f"Pacientes inactivos: {pacientes_inact}, muestras: {cirpaccod_inactive[:5]}")
    print(f"Médicos inactivos: {medicos_inact}")
    print(f"Hospitales inactivos: {hosp_inact}")
    print(f"Obras sociales inactivas: {obrasoc_inact}")
    print(f"CIRDOC raros: {len(cirdoc_weird)}")
    if cirdoc_weird:
        for cod, cirdoc in cirdoc_weird[:10]:
            print(f"  CIRCOD {cod}: cirdoc={cirdoc!r}")
    print()
    print(f"AUSRID distribution:")
    for u, c in ausrid_dist.most_common():
        print(f"  {u}: {c}")

    # Stock circular references
    stock = load_dbf("STOCK")
    stock1 = load_dbf("STOCK1")
    stock_by_cod = {rec.get("stkcod"): rec for rec in stock if rec.get("stkcod")}
    circular = 0
    for rec in stock1:
        ms = rec.get("movstkcod")
        mo = rec.get("movmovord")
        cur_stk = rec.get("stkcod")
        cur_mov = rec.get("movord")
        if ms and cur_stk and ms == cur_stk:
            circular += 1
    print(f"\nCircular stock1 references (movstkcod==stkcod): {circular}")

    out = {
        "total_cirugia": sum(len(v) for v in cir_by_cod.values()),
        "distinct_cod": len(cir_by_cod),
        "duplicates": len(dups),
        "sin_cirfec": no_cirfec,
        "sin_feccar": no_feccar,
        "cirfec_far_past": len(far_past),
        "cirfec_far_future": len(far_future),
        "feclog_no_cirfec": len(feclog_no_cirfec),
        "cirfec_after_log": len(cirfec_after_log),
        "cirfec_before_feccar_extreme": len(cirfec_before_feccar),
        "pacientes_inactivos": pacientes_inact,
        "medicos_inactivos": medicos_inact,
        "hosp_inactivos": hosp_inact,
        "obrasoc_inactivas": obrasoc_inact,
        "cirdoc_weird_count": len(cirdoc_weird),
        "stock_circular_refs": circular,
    }
    with open(OUT_DIR / "15_auditoria_adversarial.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print(f"\nSaved {OUT_DIR / '15_auditoria_adversarial.json'}")


if __name__ == "__main__":
    main()
