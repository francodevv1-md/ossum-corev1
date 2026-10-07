"""Phase 12 prep: Check if legacy has doctor, hospital, obra social catalogs.
CIRMEDCOD = 5 char, 5900 records, 200 distinct sampled -> does it match CLIENTE.CLICOD?
CIRHOSCOD = 5 char, 4687 records, 135 distinct sampled -> matches CLIENTE.CLICOD?
CIROSCOD = 5 char, 7512 records, 173 distinct sampled -> matches CLIENTE.CLICOD?

Also check: Article mapping (ARTCOD in legacy vs OSSUM Article.identifier)
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
    clientes = load_dbf("CLIENTE")
    cliente_by_cod = {rec.get("clicod"): rec for rec in clientes if rec.get("clicod")}
    print(f"Total CLIENTE: {len(cliente_by_cod)}")

    # For CIRUGIA, analyze each FK field
    cirmedcod = Counter()
    cirhoscod = Counter()
    ciroscod = Counter()
    cirpaccod = Counter()
    circlinro = Counter()
    for rec in cir:
        for fld, dst in [("cirmedcod", cirmedcod), ("cirhoscod", cirhoscod), ("ciroscod", ciroscod),
                         ("cirpaccod", cirpaccod)]:
            v = (rec.get(fld) or "").strip()
            if v: dst[v] += 1
    print(f"Distinct CIRMEDCOD: {len(cirmedcod)}")
    print(f"Distinct CIRHOSCOD: {len(cirhoscod)}")
    print(f"Distinct CIROSCOD: {len(ciroscod)}")
    print(f"Distinct CIRPACCOD: {len(cirpaccod)}")

    # For each FK, check coverage in CLIENTE
    for fld_name, fk_dict in [("CIRMEDCOD", cirmedcod), ("CIRHOSCOD", cirhoscod),
                              ("CIROSCOD", ciroscod), ("CIRPACCOD", cirpaccod)]:
        total = sum(fk_dict.values())
        matched = sum(c for v, c in fk_dict.items() if v in cliente_by_cod)
        orphan = sum(c for v, c in fk_dict.items() if v not in cliente_by_cod)
        print(f"\n{fld_name} vs CLIENTE:")
        print(f"  Total references: {total}")
        print(f"  Matched in CLIENTE: {matched} ({100*matched/total:.1f}%)")
        print(f"  Orphan: {orphan} ({100*orphan/total:.1f}%)")
        # Sample orphans
        orphan_vals = [v for v, c in fk_dict.items() if v not in cliente_by_cod][:10]
        print(f"  Sample orphans: {orphan_vals}")
        # Check if matched clients have special markers
        sample_matched = list(fk_dict.keys())[:5]
        for v in sample_matched:
            cli = cliente_by_cod.get(v)
            if cli:
                print(f"  Sample {v}: name='{cli.get('clinom')}' cir='{cli.get('clicir')}' "
                      f"dni={cli.get('clidni')} act={cli.get('cliact')}")

    # Check if any of these codes appear in specific other tables (like MEDPAG, etc.)
    # Also analyze CLIATRI for hint on roles
    print("\n## CLIATRI sample (for attribute names indicating role):")
    cliatri = load_dbf("CLIATRI")
    atr_by_des = Counter()
    for rec in cliatri:
        atr = (rec.get("atrdes") or "").strip()
        if atr: atr_by_des[atr] += 1
    for k, v in atr_by_des.most_common(20):
        print(f"  {k}: {v}")

    # Article: how many unique articles exist?
    articulos = load_dbf("ARTICULO")
    art_by_cod = {rec.get("artcod"): rec for rec in articulos if rec.get("artcod")}
    print(f"\nTotal ARTICULO: {len(art_by_cod)}")


if __name__ == "__main__":
    main()
