"""Show key big tables: STOCK1, STOCKH, CLIATRI, ARTATRI, FORMULA1, ATRIENT, CLIENTE, ARTICULO."""
import json
P = r"E:\OSSUM_COR_ANTIGRAVITY\ux-ui\.tmp\consultar-plus-minimax-audit\03_big_tables_header.json"
with open(P, encoding="utf-8") as f:
    data = json.load(f)

def show_schema(name):
    s = data["schemas"].get(name, {})
    print(f"\n## {name}: {s.get('num_records', '?'):,} rec | {len(s.get('fields', []))} campos | memo={s.get('has_memo')}")
    print(f"  Fields ({len(s.get('fields', []))}):")
    for f in s.get("fields", []):
        print(f"    {f['name']:20s} {f['type']:3s} L{f['len']:>3d} dec={f.get('dec', 0)}")

def show_sample(name):
    s = data["samples"].get(name, {})
    if "sample_error" in s:
        print(f"\n## {name}: ERROR {s['sample_error']}")
        if "schema" in s:
            show_schema(name)
        return
    print(f"\n## {name} sample (n={s.get('sampled', '?')}):")
    for f in s.get("fields", []):
        print(f"  {f['name']:20s} {f['type']:3s} NN={f['non_null_sampled']:>4d} distinct={f['distinct_sampled']:>4d} min={f.get('min')} max={f.get('max')}")
        if 0 < f['distinct_sampled'] <= 30:
            for v, c in f.get("top_values", [])[:8]:
                print(f"     '{v}' = {c}")

for n in ["STOCK1", "STOCKH", "FORMHIS", "FORMULA1", "CLIATRI", "ARTATRI"]:
    show_schema(n)
    show_sample(n)
