"""Show 2026 surgery stats."""
import json
P = r"E:\OSSUM_COR_ANTIGRAVITY\ux-ui\.tmp\consultar-plus-minimax-audit\04_cirugias_2026.json"
with open(P, encoding="utf-8") as f:
    d = json.load(f)
print('2026 by month (fecha CIRUGIA - cirfec):')
for k in sorted([k for k in d['by_year_month_fec_cirugia'].keys() if k.startswith('2026')]):
    print(f'  {k}: {d["by_year_month_fec_cirugia"][k]}')
print()
print('2026 by month (fecha carga - cirfeccar):')
for k in sorted([k for k in d['by_year_month_carga'].keys() if k.startswith('2026')]):
    print(f'  {k}: {d["by_year_month_carga"][k]}')
print()
print('Total cirugías cargadas por año:')
for y in sorted(d['by_year'].keys()):
    print(f'  {y}: {d["by_year"][y]}')
print()
print('By year estado (todos los estados):')
for y in sorted(d['by_year_estado'].keys()):
    print(f'  {y}: {d["by_year_estado"][y]}')
print()
print(f'CIR 2026 totales: {sum(d["cir_2026_counts"].values())}')
print(f'CIR 2026 counts: {d["cir_2026_counts"]}')
print()
print('FIN 2026 sample circods:', d['cir_2026_circod_by_estado']['FIN'])
print('REA 2026 sample circods:', d['cir_2026_circod_by_estado']['REA'])
print('CAN 2026 sample circods:', d['cir_2026_circod_by_estado']['CAN'])
print('SUS 2026 sample circods:', d['cir_2026_circod_by_estado']['SUS'])
