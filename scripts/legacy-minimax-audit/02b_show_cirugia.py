"""Print CIRUGIA profile from saved JSON."""
import json
P = r"E:\OSSUM_COR_ANTIGRAVITY\ux-ui\.tmp\consultar-plus-minimax-audit\02_core_profiles.json"
with open(P, encoding="utf-8") as f:
    data = json.load(f)

def show(name, max_fields=None):
    p = data[name]
    print(f"\n{'='*70}")
    print(f"## {name}: {p.get('total_records', '?'):,} registros, {p.get('fields_count', '?')} campos")
    print(f"{'='*70}")
    if "date_min" in p:
        print("Date ranges:")
        for k, v in p["date_min"].items():
            print(f"  {k}: {v} -> {p['date_max'].get(k, '?')}")
    print()
    print(f"{'field':18s} {'type':4s} {'len':>4s} {'NN':>6s} {'Cov%':>6s} {'Dist':>5s}")
    print("-" * 60)
    fields = p["fields"]
    if max_fields:
        fields = fields[:max_fields]
    for f in fields:
        print(f"{f['name']:18s} {f['type']:4s} {f['len']:>4d} {f['non_null']:>6d} {f['coverage_pct']:>6.1f} {f['distinct_sampled']:>5d}")
    print()
    print("Top values for low-cardinality fields:")
    for f in p["fields"]:
        if 0 < f["distinct_sampled"] <= 30 and f["coverage_pct"] > 0:
            top = f["top_values"]
            if top:
                print(f"  {f['name']}:")
                for v, c in top[:15]:
                    print(f"    '{v}' = {c}")

for n in ["CIRUGIA", "CIRTIP", "CIRNOTAS"]:
    show(n)
    print("\n\n")
