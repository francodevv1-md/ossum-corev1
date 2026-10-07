"""
Inventory all DBF files in legacy backup (READ-ONLY).
Header-only inspection: records, encoding, fields, deleted flag, memo presence, index.
Output: JSON inventory + Markdown summary.
"""
import os, json, sys
from pathlib import Path
from dbfread import DBF

BACKUP = Path(r"E:\OSSUM_COR_ANTIGRAVITY\Backup_DistriCorr_29092026")
OUT_DIR = Path(r"E:\OSSUM_COR_ANTIGRAVITY\ux-ui\.tmp\consultar-plus-minimax-audit")
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_JSON = OUT_DIR / "00_inventory.json"
OUT_MD = OUT_DIR / "00_inventory.md"


def scan():
    """Return list of dicts describing each .DBF in the backup."""
    items = []
    for dbf_path in sorted(BACKUP.glob("*.DBF")):
        # Also support lowercased .dbf
        candidates = [dbf_path]
        low = dbf_path.with_suffix(".dbf")
        if low.exists() and low != dbf_path:
            candidates.append(low)
        # Use whichever exists first (prefer uppercase)
        target = candidates[0]
        entry = {"name_upper": dbf_path.name, "name_lower": low.name, "size_bytes": dbf_path.stat().st_size}
        try:
            t = DBF(str(target), load=False, lowernames=True, ignore_missing_memofile=True)
            hdr = t.header
            entry["header"] = {
                "dbversion": hdr.dbversion,
                "year": hdr.year,
                "month": hdr.month,
                "day": hdr.day,
                "numrecords": hdr.numrecords,
                "headerlen": hdr.headerlen,
                "recordlen": hdr.recordlen,
                "mdx_flag": hdr.mdx_flag,
                "language_driver": hdr.language_driver,
            }
            entry["encoding"] = t.encoding
            entry["num_fields"] = len(t.fields)
            entry["fields"] = [
                {"name": f.name, "type": f.type, "len": f.length, "dec": getattr(f, 'decimal_count', 0) or 0}
                for f in t.fields
            ]
            entry["field_names"] = [f.name for f in t.fields]
            entry["has_memo"] = t.memofilename is not None
            entry["memo_file"] = Path(t.memofilename).name if t.memofilename else None
            # Index file siblings
            base = target.with_suffix("")
            cdx_upper = base.with_suffix(".CDX")
            cdx_lower = base.with_suffix(".cdx")
            entry["has_cdx"] = cdx_upper.exists() or cdx_lower.exists()
            entry["cdx_file"] = cdx_upper.name if cdx_upper.exists() else (cdx_lower.name if cdx_lower.exists() else None)
            # Try to detect deleted records efficiently (iterate, stop early if too many)
            try:
                deleted = 0
                with open(str(target), "rb") as fh:
                    # Records start at headerlen. First byte of each record = deletion flag.
                    hl = hdr.headerlen
                    rl = hdr.recordlen
                    fh.seek(hl)
                    chunk_size = 1024 * 1024  # 1MB
                    records_per_chunk = chunk_size // rl
                    bytes_read = 0
                    count = 0
                    total = hdr.numrecords
                    buf = b""
                    pos = hl
                    while count < total:
                        need = (total - count) * rl
                        to_read = min(need, chunk_size)
                        buf = fh.read(to_read)
                        if not buf:
                            break
                        # Each rl bytes: first byte is deletion marker
                        for i in range(0, len(buf), rl):
                            if i >= len(buf):
                                break
                            if buf[i] == ord('*'):
                                deleted += 1
                            count += 1
                            if count >= total:
                                break
                        bytes_read += to_read
                entry["deleted_records"] = deleted
            except Exception as e:
                entry["deleted_records"] = None
                entry["deleted_error"] = str(e)
        except Exception as e:
            entry["error"] = str(e)
            entry["error_type"] = type(e).__name__
        items.append(entry)
    return items


def to_markdown(items):
    lines = []
    lines.append("# Inventario independiente — Backup Legacy Districorr\n")
    lines.append(f"**Origen:** `{BACKUP}`")
    lines.append(f"**Total archivos DBF:** {len(items)}\n")
    err = [x for x in items if x.get("error")]
    ok = [x for x in items if not x.get("error")]
    if err:
        lines.append(f"**Con error al leer header:** {len(err)}\n")
    if ok:
        total_rec = sum((x["header"]["numrecords"] for x in ok), 0)
        lines.append(f"**Total registros (suma):** {total_rec:,}\n")
    lines.append("## Tablas ordenadas por nombre\n")
    lines.append("| # | Tabla | Registros | Deleted | Bytes | Fields | Encoding | Memo | CDX |")
    lines.append("|---|-------|----------:|--------:|------:|-------:|----------|------|-----|")
    for i, x in enumerate(ok, 1):
        h = x["header"]
        lines.append(
            f"| {i} | {x['name_upper']} | {h['numrecords']:,} | {x.get('deleted_records', '-') or 0} | "
            f"{x['size_bytes']:,} | {x['num_fields']} | {x['encoding']} | "
            f"{'Y' if x['has_memo'] else 'N'} | {'Y' if x['has_cdx'] else 'N'} |"
        )
    if err:
        lines.append("\n## Errores\n")
        for x in err:
            lines.append(f"- `{x['name_upper']}` → {x['error_type']}: {x['error']}")
    return "\n".join(lines)


if __name__ == "__main__":
    items = scan()
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    md = to_markdown(items)
    with open(OUT_MD, "w", encoding="utf-8") as f:
        f.write(md)
    print(f"Inventory: {len(items)} DBF, output -> {OUT_JSON}, {OUT_MD}")
