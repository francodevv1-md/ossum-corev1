"""Aggregate-only cross-table forensic measurements; skip deleted records."""
import collections
import json
from pathlib import Path
from profile import SOURCE, OUT, table


def rows(name):
    path = next(p for p in SOURCE.iterdir() if p.stem.upper() == name and p.suffix.lower() == ".dbf")
    return (values for _, _, _, _, deleted, values in table(path) if not deleted)


def valid(value):
    return bool(value and value != "0" and value != "00000")


def join(items, field, target):
    present = [row[field] for row in items if valid(row.get(field))]
    return {"evaluated": len(present), "matched": sum(v in target for v in present),
            "orphan": sum(v not in target for v in present), "distinct": len(set(present))}


def main():
    surgeries = list(rows("CIRUGIA"))
    contacts = list(rows("CLIENTE"))
    articles = list(rows("ARTICULO"))
    stock = list(rows("STOCK"))
    details = list(rows("STOCK1"))
    accounts = list(rows("CUENTAS"))
    account_details = list(rows("CUENTASD"))
    refs = {"CIRCOD": {r["CIRCOD"] for r in surgeries},
            "CLICOD": {r["CLICOD"] for r in contacts},
            "ARTCOD": {r["ARTCOD"] for r in articles},
            "STKCOD": {r["STKCOD"] for r in stock},
            "VTACOD": {r.get("VTACOD") for r in accounts}}
    result = {"source_rows": {n: len(r) for n, r in (("CIRUGIA", surgeries), ("CLIENTE", contacts), ("ARTICULO", articles), ("STOCK", stock), ("STOCK1", details), ("CUENTAS", accounts), ("CUENTASD", account_details))},
              "key_duplicates": {name: len(rows_) - len(refs[name]) for name, rows_ in (("CIRCOD", surgeries), ("CLICOD", contacts), ("ARTCOD", articles), ("STKCOD", stock), ("VTACOD", accounts))},
              "joins": {}, "surgeries": {}, "stock": {}}
    for field in ("CIRPACCOD", "CIRMEDCOD", "CIRHOSCOD", "CIROSCOD", "CIRCLICOD"):
        result["joins"]["CIRUGIA." + field + "->CLIENTE.CLICOD"] = join(surgeries, field, refs["CLICOD"])
    result["joins"]["STOCK.STKCIRCOD->CIRUGIA.CIRCOD"] = join(stock, "STKCIRCOD", refs["CIRCOD"])
    result["joins"]["STOCK1.STKCOD->STOCK.STKCOD"] = join(details, "STKCOD", refs["STKCOD"])
    result["joins"]["STOCK1.ARTCOD->ARTICULO.ARTCOD"] = join(details, "ARTCOD", refs["ARTCOD"])
    result["joins"]["CIRUGIA.CIRFVCOD->CUENTAS.VTACOD"] = join(surgeries, "CIRFVCOD", refs["VTACOD"])
    for field in ("VTACOD", "CUCOD", "CUECOD"):
        if account_details and field in account_details[0]:
            result["joins"]["CUENTASD." + field + "->CUENTAS.VTACOD"] = join(account_details, field, refs["VTACOD"])
    if accounts and "VTACIRCOD" in accounts[0]:
        result["joins"]["CUENTAS.VTACIRCOD->CIRUGIA.CIRCOD"] = join(accounts, "VTACIRCOD", refs["CIRCOD"])
        linked_invoices = {r["VTACIRCOD"] for r in accounts if valid(r["VTACIRCOD"])}
        for cohort, predicate in (("loaded_2026", lambda r: r["CIRFECCAR"].startswith("2026")),
                                  ("scheduled_2026", lambda r: r["CIRFEC"].startswith("2026"))):
            population = [r for r in surgeries if predicate(r)]
            result["surgeries"][cohort + "_linked_accounts"] = sum(r["CIRCOD"] in linked_invoices for r in population)
    for field in ("CIRFECCAR", "CIRFEC", "CIRFECLOG"):
        result["surgeries"][field + "_2026"] = sum(r[field].startswith("2026") for r in surgeries)
    result["surgeries"]["cross"] = {"loaded_2026_scheduled_2026": sum(r["CIRFECCAR"].startswith("2026") and r["CIRFEC"].startswith("2026") for r in surgeries),
                                   "loaded_before_2026_scheduled_2026": sum(r["CIRFECCAR"] < "20260101" and r["CIRFEC"].startswith("2026") for r in surgeries),
                                   "loaded_2026_scheduled_after": sum(r["CIRFECCAR"].startswith("2026") and r["CIRFEC"] > "20261231" for r in surgeries)}
    for label, subset in (("loaded_2026", [r for r in surgeries if r["CIRFECCAR"].startswith("2026")]),
                          ("scheduled_2026", [r for r in surgeries if r["CIRFEC"].startswith("2026")]),
                          ("sep_dec_scheduled_2026", [r for r in surgeries if "20260901" <= r["CIRFEC"] <= "20261231"]),
                          ("jun_sep_scheduled_2026", [r for r in surgeries if "20260601" <= r["CIRFEC"] <= "20260930"])):
        result["surgeries"][label] = {"total": len(subset), "states": dict(collections.Counter(r["CIRESTADO"] for r in subset)),
                                      "by_month": dict(sorted(collections.Counter(r["CIRFEC"][:6] for r in subset if r["CIRFEC"]).items())),
                                      "patient_codes": len({r["CIRPACCOD"] for r in subset if valid(r["CIRPACCOD"])}),
                                      "stock_headers": sum(valid(s.get("STKCIRCOD")) and s["STKCIRCOD"] in {r["CIRCOD"] for r in subset} for s in stock)}
    for label, subset in (("all", stock), ("linked", [s for s in stock if valid(s["STKCIRCOD"]) ])):
        result["stock"][label] = {"total": len(subset), "combos": {"|".join(k): v for k, v in collections.Counter((s["STKCOM"], s["STKTIP"], s["STKES"], s["STKDEV"]) for s in subset).most_common()},
                                  "states": {"|".join(k): v for k, v in collections.Counter((s["STKCOM"], s["STKES"]) for s in subset).most_common()}}
    detail_by_stk = collections.Counter(d["STKCOD"] for d in details)
    result["stock"]["detail_match"] = {"headers_with_details": sum(s["STKCOD"] in detail_by_stk for s in stock),
                                        "details_2026": sum(d["MOVFEC"].startswith("2026") for d in details)}
    result["surgeries"]["loaded_2026_by_month"] = dict(sorted(collections.Counter(r["CIRFECCAR"][:6] for r in surgeries if r["CIRFECCAR"].startswith("2026")).items()))
    result["surgeries"]["scheduled_2026_realized_or_finalized"] = sum(r["CIRFEC"].startswith("2026") and r["CIRESTADO"] in ("REA", "FIN") for r in surgeries)
    result["surgeries"]["loaded_2026_not_realized_or_finalized"] = sum(r["CIRFECCAR"].startswith("2026") and r["CIRESTADO"] not in ("REA", "FIN") for r in surgeries)
    result["stock"]["linked_by_surgery_status"] = {"|".join(k): v for k, v in collections.Counter((next((r["CIRESTADO"] for r in surgeries if r["CIRCOD"] == s["STKCIRCOD"]), "ORPHAN"), s["STKCOM"], s["STKDEV"]) for s in stock if valid(s["STKCIRCOD"])).most_common()}
    for label, subset in (("scheduled_2026", [r for r in surgeries if r["CIRFEC"].startswith("2026")]),
                          ("jun_sep_scheduled_2026", [r for r in surgeries if "20260601" <= r["CIRFEC"] <= "20260930"])):
        stock_ids = {s["STKCOD"] for s in stock if s["STKCIRCOD"] in {r["CIRCOD"] for r in subset}}
        selected_details = [d for d in details if d["STKCOD"] in stock_ids]
        result["surgeries"][label]["stock_details"] = len(selected_details)
        result["surgeries"][label]["article_codes"] = len({d["ARTCOD"] for d in selected_details})
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "metrics.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"source_rows": result["source_rows"], "joins": result["joins"], "surgeries": result["surgeries"]}, indent=2))


if __name__ == "__main__":
    assert SOURCE.is_dir() and not OUT.is_relative_to(SOURCE)
    main()
