"""Phase 12 cont.: Check overlap of CLIENTE codes across roles.
A single CLIENTE may be patient AND doctor AND hospital.
This affects how we map to OSSUM Contact.
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
    role_per_cod = defaultdict(set)  # cod -> set of roles
    role_stats = Counter()  # role count
    for rec in cir:
        for fld, role in [("cirpaccod", "patient"), ("cirmedcod", "doctor"),
                          ("cirhoscod", "hospital"), ("ciroscod", "payer")]:
            v = (rec.get(fld) or "").strip()
            if v:
                role_per_cod[v].add(role)
                role_stats[role] += 1

    # Distribution of multi-role CLIENTEs
    multi_role_dist = Counter()
    multi_role_examples = []
    for cod, roles in role_per_cod.items():
        multi_role_dist[len(roles)] += 1
        if len(roles) > 1 and len(multi_role_examples) < 20:
            multi_role_examples.append((cod, sorted(roles)))
    print("Multi-role distribution (how many CLIENTE appear in N different roles):")
    for n, c in sorted(multi_role_dist.items()):
        print(f"  {n} role(s): {c} CLIENTEs")
    print()
    print("Sample multi-role CLIENTEs:")
    for cod, roles in multi_role_examples[:20]:
        print(f"  {cod}: {roles}")
    print()

    # CIRUGIA stats: distinct counts and overlap
    print("Distinct codes per role:")
    for role, count in role_stats.items():
        n_distinct = len([c for c, r in role_per_cod.items() if role in r])
        print(f"  {role}: {count} references, {n_distinct} distinct")

    # Check VIAJANTE for vendor/coordinator
    viaj = load_dbf("VIAJANTE")
    print(f"\nVIAJANTE codes:")
    for rec in viaj:
        print(f"  {rec.get('viacod')}: {rec.get('vianom')}")

    # Check stock usability fields
    t = load_dbf("STOCK")
    user_dist = Counter()
    for rec in t:
        u = (rec.get("stkusr") or "").strip()
        if u: user_dist[u] += 1
    print(f"\nSTOCK users: {len(user_dist)} distinct")
    for u, c in user_dist.most_common(15):
        print(f"  {u}: {c}")

    # AUTHORING user in CIRUGIA (ausrid)
    ausr = load_dbf("ADMUSR")
    user_codes = {}
    for rec in ausr:
        user_codes[rec.get("ausrid")] = rec.get("ausrdsc")
    print(f"\nADMUSR: {len(user_codes)} users")
    for k, v in sorted(user_codes.items())[:30]:
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
