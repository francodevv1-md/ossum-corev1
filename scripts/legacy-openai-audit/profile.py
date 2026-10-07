"""Read-only DBF inventory and coded-field profiler. Never writes under SOURCE."""
import argparse
import collections
import datetime
import hashlib
import json
import mmap
from pathlib import Path
import struct

SOURCE = Path(r"E:\OSSUM_COR_ANTIGRAVITY\Backup_DistriCorr_29092026")
OUT = Path(r"E:\OSSUM_COR_ANTIGRAVITY\ux-ui\.tmp\consultar-plus-openai-audit")


def table(path):
    with path.open("rb") as file:
        header = file.read(32)
        count, header_size, record_size = struct.unpack_from("<IHH", header, 4)
        fields = []
        while True:
            descriptor = file.read(32)
            if not descriptor or descriptor[0] == 13:
                break
            fields.append({"name": descriptor[:11].split(b"\0")[0].decode("ascii", "replace"),
                           "type": chr(descriptor[11]), "length": descriptor[16], "decimals": descriptor[17]})
        length = path.stat().st_size
        usable = max(0, (length - header_size) // record_size) if record_size else 0
        with mmap.mmap(file.fileno(), 0, access=mmap.ACCESS_READ) as data:
            for i in range(min(count, usable)):
                start = header_size + i * record_size
                record = data[start:start + record_size]
                if len(record) < record_size:
                    break
                values = {}
                offset = 1
                for field in fields:
                    raw = record[offset:offset + field["length"]]
                    offset += field["length"]
                    if field["type"] in "ICYBTQ" and field["length"] in (4, 8):
                        value = raw.hex() if raw.strip(b"\0 ") else ""
                    else:
                        value = raw.strip(b" \0").decode("cp1252", "replace")
                    values[field["name"]] = value
                yield header, count, usable, fields, record[:1] == b"*", values


def analyze():
    files = sorted((p for p in SOURCE.rglob("*") if p.is_file()), key=lambda p: str(p).lower())
    inventory = []
    profiles = {}
    focus = {"CIRUGIA", "CLIENTE", "ARTICULO", "STOCK", "STOCK1", "CUENTAS", "CUENTASD", "CUENTASH", "CUENTASC", "COBROS", "DEBCRE", "CLICIA", "ARTATRI", "HISCAM", "HISREG", "HISCOS", "HISPRE", "VARHIS"}
    for p in files:
        item = {"path": str(p.relative_to(SOURCE)), "extension": p.suffix.lower(), "bytes": p.stat().st_size,
                "mtime": datetime.datetime.fromtimestamp(p.stat().st_mtime).isoformat()}
        inventory.append(item)
        if p.suffix.lower() != ".dbf":
            continue
        key = p.stem.upper()
        record = {"path": item["path"], "bytes": item["bytes"], "deleted": 0, "read": 0, "error": None}
        counters = collections.defaultdict(collections.Counter)
        nonempty = collections.Counter()
        years = collections.defaultdict(collections.Counter)
        try:
            it = table(p)
            for header, declared, usable, fields, deleted, values in it:
                if record["read"] == 0:
                    record.update(version=header[0], codepage_mark=header[29], declared=declared,
                                  physically_available=usable, header_bytes=struct.unpack_from("<H", header, 8)[0],
                                  record_bytes=struct.unpack_from("<H", header, 10)[0], fields=fields)
                record["read"] += 1
                record["deleted"] += int(deleted)
                if deleted:
                    continue
                for name, value in values.items():
                    if not value:
                        continue
                    nonempty[name] += 1
                    if key in focus and name in {"CIRESTADO", "STKTIP", "STKES", "STKDEV", "STKCOM", "MOVES", "MOVUNI", "EMPCOD", "MOVEMPCOD", "CIRAUT", "CIRFACTES", "CTATIP", "CTACOM"}:
                        counters[name][value] += 1
                    if len(value) == 8 and value.isdigit() and 1900 <= int(value[:4]) <= 2100:
                        years[name][value[:4]] += 1
            if not record["read"]:
                with p.open("rb") as file:
                    h = file.read(32)
                record.update(version=h[0], codepage_mark=h[29], declared=struct.unpack_from("<I", h, 4)[0],
                              physically_available=max(0, (item["bytes"] - struct.unpack_from("<H", h, 8)[0]) // max(1, struct.unpack_from("<H", h, 10)[0])), fields=[])
            record["nonempty"] = dict(nonempty)
            record["years"] = {k: dict(sorted(v.items())) for k, v in years.items()}
            if key in focus:
                record["top_codes"] = {k: {"distinct": len(v), "top": v.most_common(30)} for k, v in counters.items()
                                       if len(v) <= 100 or k in ("CIRESTADO", "STKTIP", "STKES", "STKDEV", "STKCOM", "MOVES", "MOVUNI")}
        except Exception as exc:
            record["error"] = str(exc)
        profiles[key] = record
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "inventory.json").write_text(json.dumps(inventory, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / "profiles.json").write_text(json.dumps(profiles, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"files": len(files), "dbf": sum(p.suffix.lower() == ".dbf" for p in files),
                      "declared_rows": sum(v.get("declared", 0) for v in profiles.values()),
                      "errors": {k: v["error"] for k, v in profiles.items() if v["error"]},
                      "focus_rows": {k: profiles[k].get("read") for k in focus if k in profiles}}, indent=2))


if __name__ == "__main__":
    assert SOURCE.is_dir() and not OUT.is_relative_to(SOURCE)
    analyze()
