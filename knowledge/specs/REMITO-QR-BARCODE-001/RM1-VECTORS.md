# RM1 / RF1 Design-Proof Vectors

Status: **SEALED**  
Scope: deterministic design proof only; this artifact does not authorize implementation.

## Reference implementations

- Implementation A: Node.js `v25.2.1`; explicit MSB-first, bit-by-bit CRC update and `node:crypto` SHA-256.
- Implementation B: Python `3.14.0`; table-free polynomial long division over GF(2) and `hashlib` SHA-256.
- CRC parameters: width 5, polynomial low bits `0x09` / full polynomial `0x29`, init `0x09`, non-reflected, direct/non-augmented, xorout `0x00`.

Implementation A core:

```js
let r = 0x09
for (const value of [1, ...bodyValues]) {
  for (let k = 4; k >= 0; k--) {
    const feedback = ((r >> 4) & 1) ^ ((value >> k) & 1)
    r = (r << 1) & 0x1f
    if (feedback) r ^= 0x09
  }
}
```

Implementation B core (`message` is the 85-bit integer `00001 || body`):

```python
def polynomial_mod(dividend):
    while dividend.bit_length() - 1 >= 5:
        dividend ^= 0x29 << (dividend.bit_length() - 1 - 5)
    return dividend

crc = polynomial_mod((0x09 << 85) ^ (message << 5))
```

Both implementations construct RF1 independently as `header || record*`, where each record is `UTF8(name) || 3d || ASCII(byteLength) || 3a || UTF8(value) || 0a`, then hash the resulting bytes.

## RM1 sealed vectors

| Vector | Random bytes hex | Body | CRC decimal / hex | Symbol | Canonical locator |
|---|---|---|---:|---|---|
| RM1-1 | `00000000000000000000` | `0000000000000000` | `11 / 0x0b` | `B` | `RM1-0000-0000-0000-0000-B` |
| RM1-2 | `ffffffffffffffffffff` | `ZZZZZZZZZZZZZZZZ` | `17 / 0x11` | `H` | `RM1-ZZZZ-ZZZZ-ZZZZ-ZZZZ-H` |
| RM1-3 | `0123456789abcdeffedc` | `04HMASW9NF6YZZPW` | `20 / 0x14` | `M` | `RM1-04HM-ASW9-NF6Y-ZZPW-M` |
| RM1-4 | `rm104hmasw9nf6yzzpwm` | — | — | — | `RM1-04HM-ASW9-NF6Y-ZZPW-M` |

The CRC-5/EPC standard check over ASCII `123456789` is `0x00` in both implementations.

## RF1-1 sealed vector

| Field | Normalized value | UTF-8 bytes |
|---|---|---:|
| `fingerprintVersion` | `RF1` | 3 |
| `issuerDisplayName` | `Distribuidora Ágil S.A.` | 24 |
| `issuerTaxId` | `30123456789` | 11 |
| `documentType` | `REMITO_SALIDA` | 13 |
| `issuedDate` | `2026-08-11` | 10 |
| `remitoShortCode` | `RM1-04HM-ASW9-NF6Y-ZZPW-M` | 25 |
| `verificationVersion` | `1` | 1 |

Header bytes: `33`  
Record bytes, including prefix and LF: `25 + 46 + 27 + 30 + 25 + 45 + 24 = 222`  
Total canonical bytes: `255`

Exact canonical bytes hex:

```text
4f5353554d2d52454d49544f2d5055424c49432d46494e4745525052494e54000a66696e6765727072696e7456657273696f6e3d333a5246310a697373756572446973706c61794e616d653d32343a446973747269627569646f726120c38167696c20532e412e0a69737375657254617849643d31313a33303132333435363738390a646f63756d656e74547970653d31333a52454d49544f5f53414c4944410a697373756564446174653d31303a323032362d30382d31310a72656d69746f53686f7274436f64653d32353a524d312d3034484d2d415357392d4e4636592d5a5a50572d4d0a766572696669636174696f6e56657273696f6e3d313a310a
```

Lowercase SHA-256:

```text
9c02d28682f66646a8e2d3521319d4ac5b50a20bdf9100262e0e96cc7ddcf25a
```

API representation:

```text
sha256:9c02d28682f66646a8e2d3521319d4ac5b50a20bdf9100262e0e96cc7ddcf25a
```

## Independent comparison and grammar audit

| Check | Node.js A | Python B | Result |
|---|---|---|---|
| RM1-1 CRC / locator | `11`, `...-B` | `11`, `...-B` | PASS |
| RM1-2 CRC / locator | `17`, `...-H` | `17`, `...-H` | PASS |
| RM1-3 CRC / locator | `20`, `...-M` | `20`, `...-M` | PASS |
| RM1-4 normalized output | exact RM1-3 | exact RM1-3 | PASS |
| RF1 canonical bytes | 255 bytes, exact hex above | 255 bytes, exact hex above | PASS |
| RF1 SHA-256 | `9c02…f25a` | `9c02…f25a` | PASS |

Deterministic command outputs also confirmed: alphabet `32` symbols; random input `10` bytes / `80` bits; body `16` symbols / `80` bits; CRC message `85` bits; locator `25` ASCII bytes; header `33` bytes and exact DESIGN hex; RF1 field lengths `3/24/11/13/10/25/1`; 32-byte base64url values encode to `43` unpadded characters and decode to `32` bytes; public-token domain is `26` bytes, uint32 is `4` bytes, HMAC input is `62` bytes, SHA-256 is `32` bytes / `64` hex characters, and canonical IPv4/IPv6 address inputs are `4/16` bytes.

**Seal result: PASS.** Both independently structured CRC calculations and both independent RF1 byte/hash calculations agree exactly. Every explicit DESIGN byte/bit/character grammar constant is consistent; no contradiction was found.
