"""Show more table schemas."""
import json
P = r"E:\OSSUM_COR_ANTIGRAVITY\ux-ui\.tmp\consultar-plus-minimax-audit\03_big_tables_header.json"
with open(P, encoding="utf-8") as f:
    data = json.load(f)

for name in ['ASIENTOS', 'ASIENTO1', 'OBSASO', 'ADMUSR', 'ADMGRP', 'ADMGRP1', 'CAMBIO',
             'NECCOM', 'PREFUSR', 'NUMERATO', 'ADMMAP', 'HISVAL', 'ARTICULO', 'CLIENTE',
             'INVENTA1', 'BANCOS']:
    s = data['schemas'].get(name)
    if not s:
        print(f"\n## {name}: NOT IN INVENTORY")
        continue
    if 'error' in s:
        print(f"\n## {name}: ERROR {s['error']}")
        continue
    print(f"\n## {name}: {s['num_records']:,} rec | {len(s['fields'])} campos | memo={s['has_memo']}")
    for f in s['fields']:
        print(f"  {f['name']:20s} {f['type']:3s} L{f['len']:>3d} dec={f.get('dec', 0)}")
