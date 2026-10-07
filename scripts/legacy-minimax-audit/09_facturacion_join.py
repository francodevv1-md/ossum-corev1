"""Phase 10: Verify the billing chain.
1. CIRUGIA -> STOCK -> CUENTAS (via STKVTACOD)
2. CUENTAS -> CIRUGIA (via VTACIRCOD, reverse FK)
3. Coverage analysis: of 2026 FIN/REA surgeries, how many have invoices?
4. CUENTASD line analysis (articles per invoice)
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
    cir_2026 = {}
    for rec in cir:
        feccar = rec.get("cirfeccar")
        fec = rec.get("cirfec")
        if not (isinstance(feccar, date) and feccar.year == 2026) and not (isinstance(fec, date) and fec.year == 2026):
            continue
        cod = rec.get("circod")
        cir_2026[cod] = rec
    print(f"2026 surgeries: {len(cir_2026)}")

    # Load CUENTAS and index by VTACIRCOD and VTACOD
    cuentas = load_dbf("CUENTAS")
    vta_by_cod = {}
    vta_by_circod = defaultdict(list)
    vta_tipos = Counter()
    vta_comprob = Counter()
    vta_sucursales = Counter()
    for rec in cuentas:
        v = rec.get("vtacod")
        if v:
            vta_by_cod[v] = rec
        c = rec.get("vtacircod")
        if c:
            vta_by_circod[c].append(rec)
        vta_tipos[str(rec.get("vtatip") or "").strip()] += 1
        vta_comprob[str(rec.get("vtacom") or "").strip()] += 1
        vta_sucursales[str(rec.get("vtasuc") or "").strip()] += 1
    print(f"\nCUENTAS: {len(vta_by_cod)} unique vtacod, {sum(len(v) for v in vta_by_circod.values())} with circod FK")
    print(f"VTATIP distribution: {dict(vta_tipos)}")
    print(f"VTACOM (comprobante) distribution: {dict(vta_comprob)}")
    print(f"VTASUC distribution: {dict(vta_sucursales)}")
    print(f"VTAs with CIRUGIA FK: {len(vta_by_circod)}")

    # For 2026 surgeries, how many have CUENTAS via VTACIRCOD?
    cir_with_vta = 0
    cir_by_estado = Counter()
    cir_with_vta_by_estado = Counter()
    cir_vta_count = Counter()  # how many invoices per surgery
    for cod, rec in cir_2026.items():
        est = (rec.get("cirestado") or "").strip()
        cir_by_estado[est] += 1
        vtas = vta_by_circod.get(cod, [])
        if vtas:
            cir_with_vta += 1
            cir_with_vta_by_estado[est] += 1
            cir_vta_count[len(vtas)] += 1
        else:
            cir_vta_count[0] += 1
    print(f"\n2026 surgeries con factura: {cir_with_vta}/{len(cir_2026)}")
    print(f"Por estado cirugias vs con factura:")
    for est in sorted(set(list(cir_by_estado.keys()) + list(cir_with_vta_by_estado.keys()))):
        print(f"  {est}: {cir_with_vta_by_estado[est]}/{cir_by_estado[est]} ({100*cir_with_vta_by_estado[est]/max(cir_by_estado[est],1):.1f}%)")
    print(f"\nVTAs por cirugia:")
    for n, c in sorted(cir_vta_count.items()):
        print(f"  {n} VTAs: {c} cirugías")

    # CUENTASD analysis: for invoices with circod, how many lines per invoice?
    cuentasd = load_dbf("CUENTASD")
    det_by_vta = defaultdict(list)
    art_distinct = set()
    for rec in cuentasd:
        v = rec.get("vtacod")
        if v:
            det_by_vta[v].append(rec)
            a = (rec.get("artcod") or "").strip()
            if a: art_distinct.add(a)
    print(f"\nCUENTASD lines: {sum(len(v) for v in det_by_vta.values())}, distinct articles: {len(art_distinct)}")
    # For VTAs linked to 2026 FIN surgeries, distribution of detail lines
    lines_per_vta_fin = []
    for cod, rec in cir_2026.items():
        if (rec.get("cirestado") or "").strip() != "FIN":
            continue
        vtas = vta_by_circod.get(cod, [])
        for v in vtas:
            lines_per_vta_fin.append(len(det_by_vta.get(v.get("vtacod"), [])))
    if lines_per_vta_fin:
        print(f"Lines per invoice (FIN 2026): avg={sum(lines_per_vta_fin)/len(lines_per_vta_fin):.1f}, "
              f"min={min(lines_per_vta_fin)}, max={max(lines_per_vta_fin)}, n={len(lines_per_vta_fin)}")
    # NU
    # Save key relationships
    out = {
        "cir_2026_total": len(cir_2026),
        "cir_2026_with_vta": cir_with_vta,
        "cir_2026_by_estado": dict(cir_by_estado),
        "cir_2026_with_vta_by_estado": dict(cir_with_vta_by_estado),
        "cir_vta_count_dist": dict(cir_vta_count),
        "vta_total": len(vta_by_cod),
        "vta_with_circod": len(vta_by_circod),
        "vta_tipos": dict(vta_tipos),
        "vta_comprob": dict(vta_comprob),
        "vta_sucursales": dict(vta_sucursales),
    }
    with open(OUT_DIR / "09_facturacion.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print(f"\nSaved {OUT_DIR / '09_facturacion.json'}")


if __name__ == "__main__":
    main()
