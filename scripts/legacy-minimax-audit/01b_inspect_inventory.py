"""Quick inspection of inventory."""
import json
from pathlib import Path

INV = Path(r"E:\OSSUM_COR_ANTIGRAVITY\ux-ui\.tmp\consultar-plus-minimax-audit\00_inventory.json")

with open(INV, encoding="utf-8") as f:
    inv = json.load(f)
ok = [x for x in inv if not x.get("error")]
err = [x for x in inv if x.get("error")]
print(f"Total: {len(inv)}, OK: {len(ok)}, errors: {len(err)}")
total_rec = sum(x["header"]["numrecords"] for x in ok)
print(f"Total registros: {total_rec:,}")
print()
print("Top 30 tablas por registros:")
for x in sorted(ok, key=lambda x: -x["header"]["numrecords"])[:30]:
    h = x["header"]
    print(f"  {x['name_upper']:32s} {h['numrecords']:>12,} rec | {x['num_fields']:3d} campos | memo={x['has_memo']} | del={x.get('deleted_records', 0)}")
print()
print("Tablas relevantes para cirugía:")
nombres = ["CIRUGIA", "CLIENTE", "STOCK", "STOCK1", "CLIATRI", "ARTICULO", "CIRNOTAS",
           "ARTATRI", "ATRIENT", "STOCKH", "CIRTIP", "STOCK2", "STOCKMIN",
           "HISREG", "HISCON", "HISCOS", "HISCAM", "HISPRE", "HISVAL",
           "VARHIS", "HISEST", "FORMHIS", "FORMULA1", "FORMU", "CIRCUIT",
           "CIRCUIT1", "CIRCUIT2", "PREARTPR", "PRECIOAR", "CLIATRI",
           "CODARTPR", "BANCOS", "CONDPAG", "MEDPAG", "OPERARIO", "VIAJANTE",
           "TRANSPOR", "SUCURSALES", "EMPRESA", "LOCALIDA", "PROVINCI",
           "OBRAS", "MEDPAG", "CENCOS", "CONCEPTO", "CONCEP", "HISCAM"]
for n in nombres:
    matches = [x for x in ok if x["name_upper"].upper() == f"{n}.DBF"]
    for x in matches:
        h = x["header"]
        print(f"  {x['name_upper']:32s} {h['numrecords']:>12,} rec | {x['num_fields']:3d} campos | memo={x['has_memo']}")
print()
print("Tablas con STOCK en el nombre (incluyendo STOCK1):")
for x in ok:
    if "STOCK" in x["name_upper"].upper():
        h = x["header"]
        print(f"  {x['name_upper']:32s} {h['numrecords']:>12,} rec | {x['num_fields']:3d} campos | memo={x['has_memo']}")
print()
print(f"Errores: {len(err)}")
for x in err[:5]:
    print(f"  {x['name_upper']}: {x['error_type']}: {x['error']}")
