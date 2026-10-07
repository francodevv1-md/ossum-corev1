"""Show full sequences for sample 2026 surgeries."""
import json
P = r"E:\OSSUM_COR_ANTIGRAVITY\ux-ui\.tmp\consultar-plus-minimax-audit\05c_surgery_sequences.json"
with open(P, encoding="utf-8") as f:
    data = json.load(f)


def show(cod, max_lines=30):
    print(f"\n{'='*70}")
    print(f"=== CIRCOD {cod} ===")
    items = data.get(str(cod), [])
    if not items:
        print("  (no stock records)")
        return
    for item in items[:max_lines]:
        if item.get("mov"):
            print(f"  MOV ord={item['movord']} art={item['artcod']} can={item['movcan']} "
                  f"E/S={item['moves']} U={item['movuni']} cer={item['movcer']} "
                  f"stkref={item['movstkcod']}/{item['movmovord']} fec={item['movfec']} "
                  f"vtacod={item['movvtacod']}")
        else:
            print(f"  STK {item['stkcod']} TIP={item['stktip']} E/S={item['stkes']} "
                  f"DEV={item['stkdev']} COM={item['stkcom']} fec={item['stkfec']} "
                  f"vtacod={item['stkvtacod']} obs={item['stkobs'][:40]!r} "
                  f"conce={(item['stkconce'] or '')[:40]!r} usr={item['stkusr']}")
    if len(items) > max_lines:
        print(f"  ... ({len(items)-max_lines} more lines)")


# Show one of each category
for cod in [5135, 5136, 5137, 5138, 5140, 5145, 5155, 5163, 5654, 5990, 6247, 6411, 6814, 6832, 6927, 7248, 5134, 5139, 5143, 5177, 5194, 5262, 6766]:
    show(cod, max_lines=40)
