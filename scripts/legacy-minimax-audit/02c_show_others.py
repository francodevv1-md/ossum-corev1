"""Print more table profiles."""
import json
P = r"E:\OSSUM_COR_ANTIGRAVITY\ux-ui\.tmp\consultar-plus-minimax-audit\02_core_profiles.json"
with open(P, encoding="utf-8") as f:
    data = json.load(f)

for tname in ['STOCK', 'VARHIS', 'HISREG', 'HISCON', 'HISCOS', 'HISCAM', 'HISPRE',
              'OBRAS', 'MEDPAG', 'CONDPAG', 'VIAJANTE', 'TRANSPOR', 'LOCALIDA',
              'PROVINCI', 'EMPRESA', 'SUCURSALES', 'CONCEP']:
    p = data.get(tname, {})
    if not p: continue
    print(f"\n## {tname}: {p.get('total_records', '?')} rec, {p.get('fields_count', '?')} campos")
    print(f"{'field':18s} {'type':4s} {'len':>4s} {'NN':>6s} {'Cov%':>6s} {'Dist':>5s}")
    for f in p['fields']:
        print(f"{f['name']:18s} {f['type']:4s} {f['len']:>4d} {f['non_null']:>6d} {f['coverage_pct']:>6.1f} {f['distinct_sampled']:>5d}")
    print("Top low-card values:")
    for f in p['fields']:
        if 0 < f['distinct_sampled'] <= 30 and f['coverage_pct'] > 0:
            for v, c in f['top_values'][:6]:
                print(f"  {f['name']}: \"{v}\" = {c}")
