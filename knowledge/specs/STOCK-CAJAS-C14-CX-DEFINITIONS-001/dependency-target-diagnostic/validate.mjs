import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SPEC = resolve(HERE, "..");
const ROW_FILE = join(HERE, "cx02-proposal-rows.cjl1");
const INVENTORY_FILE = join(HERE, "all-cx-target-shapes.cj1");
const C13_EVIDENCE_FILE = join(HERE, "c13-physical-relation-evidence.cj1");
const MANIFEST_FILE = join(HERE, "manifest.cj1");
const HASHES_FILE = join(HERE, "hashes.sha256");
const APPROVED_PROPOSAL_DIR = join(SPEC, "cx02-exact-rendering-proposal");
const RENDERING_MANIFEST_FILE = join(APPROVED_PROPOSAL_DIR, "rendering-manifest.cj1");
const ROW_SCHEMA = "C14P-ROW-V2C-STAGED-SFO1-EAV1-BS1-TEI1-PCA1-DT1";
const ROW_SET_DOMAIN = "C14P-TEMP-SLICE-CX02-V1-TEI1-PCA1-DT1";
const STABLE_SET_DOMAIN = "C14P-STAGED-SEED-STABLE-ROW-SET-V2C-SFO1-EAV1-BS1-DT1";
const EXPECTED_SLICE_HASH = "46cc34c2d62d858e7714108030298cb642a0b0e78760d3ff11b0b74fc94b3dd5";
const APPROVED_ROOT = "28834eafa15bf1f99227421892cbef18734a047642212fbafc1ca01f1d6139c2";
const C13_COMMIT = "0faf2f55e178f1b111c5ae108380a505a68c8feb";
const C13_SCHEMA_BLOB = "47313a8a85ac71ac56df93ce212593820cb95a13";
const C13_SCHEMA_PATH = "prisma/schema.prisma";
const EXTERNAL_EVIDENCE_IDS = ["C14P2-GLOBAL-EVIDENCE-0001", "C14P2-GLOBAL-EVIDENCE-0002", "C14P2-GLOBAL-EVIDENCE-0003", "C14P2-GLOBAL-EVIDENCE-0004", "C14P2-GLOBAL-EVIDENCE-0005"];
const DEP_HASHES = [
  "74d92d2963e7debf07d59fc1d5d59b71e46eac490f91dc8ad0b60c2218976868",
  "e35b07c9c1327b27ae9d291841498046a97184a6d1633413f93da42b10137707",
  "cc0299332f0f5433dd5e27affd3831ccd883d24a9074171bb7e5eb24390f49bb",
  "197435ed6d3e649e79839d761e50887977e0d7b2a26f470ebe1fcfcb9024cc86",
  "e826062b79489be846838129575223f42d0cf243fd4fe19bf96ce5611dad81fd",
  "58e37524f775ed35c8f45968f8ea8958a5573f621ff7fb07b6fc10a10be2c000",
];
const EXPECTED_TARGETS = [
  "function:fn_stock_lot_append_only",
  "function:fn_stock_lot_observation_append_only",
  "function:fn_stock_lot_review_append_only",
  "function:fn_stock_lot_review_coherence",
  "\"public\".\"StockLotObservation\"",
  "\"public\".\"StockLot\"",
];
const PROFILE_KIND_RANK = [
  "EVIDENCE", "PROVENANCE", "PROPOSED_DECISION", "DECISION_ALTERNATIVE", "PHYSICAL_IDENTIFIER", "OWNER", "ATTACHMENT",
  "OBJECT_INVENTORY", "SEED_SOURCE", "OBJECT", "BODY", "SOURCE_SPAN", "LOCATOR", "ATOM", "ATOM_OCCURRENCE", "BOOLEAN",
  "EXPRESSION_ROOT", "LOOP", "EXTENSION_DECISION_POINT", "DECISION_POINT", "DECISION_OUTCOME", "BRANCH", "ACTION", "DEPENDENCY", "EVENT", "ERROR",
];
const SEED_OUTPUT_KIND_RANK = [...PROFILE_KIND_RANK, "DEFERRED_CATALOG_OBJECT"];
const SEMANTIC_ID_CONTRACT = new Map([
  ["PROVENANCE", ["provenanceId", "C14PP"]], ["PHYSICAL_IDENTIFIER", ["physicalIdentifierId", "C14PM"]],
  ["OWNER", ["ownerId", "C14PK"]], ["ATTACHMENT", ["attachmentId", "C14PH"]], ["OBJECT_INVENTORY", ["inventoryId", "C14PI"]],
  ["SEED_SOURCE", ["seedSourceId", "C14PZ"]], ["BODY", ["bodyId", "C14PB"]], ["SOURCE_SPAN", ["sourceSpanId", "C14PS"]],
  ["LOCATOR", ["locatorId", "C14PQ"]], ["ATOM", ["atomId", "C14PA"]], ["ATOM_OCCURRENCE", ["occurrenceId", "C14PO"]],
  ["BOOLEAN", ["booleanNodeId", "C14PN"]], ["EXPRESSION_ROOT", ["expressionRootId", "C14PE"]],
  ["DECISION_POINT", ["decisionPointId", "C14PD"]], ["DECISION_OUTCOME", ["decisionOutcomeId", "C14PU"]],
  ["BRANCH", ["branchId", "C14PR"]], ["ACTION", ["actionId", "C14PX"]], ["DEPENDENCY", ["dependencyId", "C14PY"]],
  ["EVENT", ["eventId", "C14PV"]], ["ERROR", ["errorId", "C14PF"]],
]);

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function gitBlobSha1(bytes) {
  return createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`, "ascii"), bytes])).digest("hex");
}

function quoteString(value) {
  return JSON.stringify(value)
    .replaceAll("\\n", "\\u000a")
    .replaceAll("\\r", "\\u000d")
    .replaceAll("\\t", "\\u0009");
}

export function canonicalValue(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalValue).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${quoteString(key)}:${canonicalValue(value[key])}`).join(",")}}`;
  }
  if (typeof value === "number" && (!Number.isSafeInteger(value) || Object.is(value, -0))) throw new Error("CJ1 rejects non-safe integers");
  return typeof value === "string" ? quoteString(value.normalize("NFC")) : JSON.stringify(value);
}

export function canonicalLine(value) {
  return Buffer.from(`${canonicalValue(value)}\n`, "utf8");
}

export function domainHash(domain, bytes) {
  return sha256(Buffer.concat([Buffer.from(domain, "ascii"), Buffer.from([0]), bytes]));
}

export function hashRow(row) {
  const core = structuredClone(row);
  delete core.rowSha256;
  return domainHash(core.schemaVersion, canonicalLine(core));
}

export function serializeRows(rows) {
  return Buffer.concat(rows.map(canonicalLine));
}

function parseCjl1(bytes, errors) {
  if (bytes.length === 0 || bytes.at(-1) !== 0x0a || bytes.includes(0x0d) || bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) errors.push("CJL1 byte profile");
  try {
    return bytes.toString("utf8").trimEnd().split("\n").map(JSON.parse);
  } catch (error) {
    errors.push(`CJL1 parse: ${error.message}`);
    return [];
  }
}

function add(errors, condition, message) {
  if (!condition) errors.push(message);
}

function stableIdentityProjection(value, semanticIdField, key = "") {
  if (["rowId", "rowSha256", "ordinal", "schemaVersion", semanticIdField].includes(key) || key.endsWith("RowId") || key.endsWith("RowIds") || key === "stableRowIds") return undefined;
  if (Array.isArray(value)) return value.map((entry) => stableIdentityProjection(entry, semanticIdField)).filter((entry) => entry !== undefined);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .map(([childKey, childValue]) => [childKey, stableIdentityProjection(childValue, semanticIdField, childKey)])
      .filter(([, childValue]) => childValue !== undefined));
  }
  return value;
}

function resolveImmutableObjectOrdinal(row, ids, rows, seen = new Set()) {
  if (!row || seen.has(row)) return 0;
  seen.add(row);
  const pathOrdinal = Number.parseInt(row.fragmentPath?.match(/(\d{4})\.sqlfrag$/)?.[1] ?? row.expectedFragmentPath?.match(/(\d{4})\.sqlfrag$/)?.[1] ?? "0", 10);
  if (pathOrdinal > 0) return pathOrdinal;
  for (const field of ["objectRowId", "ownerObjectRowId", "sourceObjectRowId", "triggerObjectRowId", "bodyRowId", "expressionRootRowId", "decisionSiteRowId", "sourceSpanRowId", "actionSpanRowId", "branchSpanRowId", "declarationSpanRowId", "errorSpanRowId", "siteSpanRowId"]) {
    if (row[field]) {
      const resolved = resolveImmutableObjectOrdinal(ids.get(row[field]), ids, rows, seen);
      if (resolved > 0) return resolved;
    }
  }
  for (const field of ["sourceSpanRowIds", "locatorRowIds", "occurrenceRowIds"]) {
    for (const id of row[field] ?? []) {
      const resolved = resolveImmutableObjectOrdinal(ids.get(id), ids, rows, seen);
      if (resolved > 0) return resolved;
    }
  }
  const reverse = rows.find((candidate) => candidate.kind === "OBJECT" && (
    candidate.ownerRowId === row.rowId || candidate.physicalIdentifierRowId === row.rowId || candidate.attachmentRowId === row.rowId
    || candidate.inventoryRowId === row.rowId || candidate.seedSourceRowIds?.includes(row.rowId)
  ));
  return reverse ? resolveImmutableObjectOrdinal(reverse, ids, rows, seen) : 0;
}

function resolveImmutableSourceRange(row, ids, seen = new Set()) {
  if (!row || seen.has(row)) return [-1, -1];
  seen.add(row);
  if (Number.isInteger(row.startByte) && Number.isInteger(row.endByte)) return [row.startByte, row.endByte];
  for (const field of ["sourceSpanRowId", "actionSpanRowId", "bodySpanRowId", "branchSpanRowId", "declarationSpanRowId", "errorSpanRowId", "siteSpanRowId"]) {
    if (row[field]) {
      const range = resolveImmutableSourceRange(ids.get(row[field]), ids, seen);
      if (range[0] >= 0) return range;
    }
  }
  for (const field of ["sourceSpanRowIds", "conditionValueSpanRowIds", "locatorRowIds", "occurrenceRowIds"]) {
    const ranges = (row[field] ?? []).map((id) => resolveImmutableSourceRange(ids.get(id), ids, new Set(seen))).filter(([start]) => start >= 0);
    if (ranges.length > 0) return [Math.min(...ranges.map(([start]) => start)), Math.max(...ranges.map(([, end]) => end))];
  }
  return [-1, -1];
}

function immutableSourceDescriptor(row, inventoryIndex, ids, rows) {
  const semanticIdField = SEMANTIC_ID_CONTRACT.get(row.kind)?.[0] ?? "";
  const projection = stableIdentityProjection(row, semanticIdField);
  const subtype = row.spanKind ?? row.identifierClass ?? row.objectClass ?? row.seedClass ?? row.sourceMode ?? row.nodeKind ?? row.siteKind
    ?? row.outcomeKind ?? row.actionKind ?? row.dependencyKind ?? row.eventKind ?? row.errorKind ?? row.ownerKind ?? row.kind;
  const [startByte, endByte] = resolveImmutableSourceRange(row, ids);
  const objectOrdinal = resolveImmutableObjectOrdinal(row, ids, rows);
  return {
    endByte,
    inventoryIndex,
    kindRank: PROFILE_KIND_RANK.indexOf(row.kind),
    objectOrdinal,
    stableTieSha256: domainHash("C14-DT1-STABLE-IDENTITY-TIE-V1", canonicalLine(projection)),
    startByte,
    subtype,
  };
}

function verifyStableRowIdentities(rows, expectedRows, errors) {
  const immutableIds = new Map(expectedRows.map((row) => [row.rowId, row]));
  const ordinalByKind = new Map();
  const canonicalSlots = expectedRows.map((expected, inventoryIndex) => {
    const ordinal = (ordinalByKind.get(expected.kind) ?? 0) + 1;
    ordinalByKind.set(expected.kind, ordinal);
    return { descriptor: immutableSourceDescriptor(expected, inventoryIndex, immutableIds, expectedRows), expected, ordinal };
  });
  const rowIdPattern = new RegExp(`^C14P2-(CX02)-(${PROFILE_KIND_RANK.join("|")})-(\\d{4})$`);
  let canonicalGlobalOrder = rows.length === canonicalSlots.length;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const slot = canonicalSlots[index];
    const match = rowIdPattern.exec(row.rowId);
    add(errors, Boolean(match), `stable rowId grammar ${row.rowId}`);
    add(errors, row.cx === "CX02", `stable rowId CX/profile ${row.rowId}`);
    add(errors, match?.[2] === row.kind, `stable rowId kind ${row.rowId}`);
    add(errors, match ? Number(match[3]) === row.ordinal && match[3] === String(row.ordinal).padStart(4, "0") : false, `stable rowId ordinal digits ${row.rowId}`);
    if (!slot) {
      canonicalGlobalOrder = false;
      continue;
    }
    const semanticContract = SEMANTIC_ID_CONTRACT.get(row.kind);
    const expectedRowId = `C14P2-CX02-${row.kind}-${String(slot.ordinal).padStart(4, "0")}`;
    add(errors, row.ordinal === slot.ordinal && row.rowId === expectedRowId, `derived stable identity ${row.rowId}`);
    if (semanticContract) {
      const [field, prefix] = semanticContract;
      add(errors, row[field] === `${prefix}-CX02-${String(slot.ordinal).padStart(4, "0")}`, `derived semantic identity ${row.rowId}.${field}`);
    }
    const rowProjection = stableIdentityProjection(row, semanticContract?.[0] ?? "");
    const expectedProjection = stableIdentityProjection(slot.expected, SEMANTIC_ID_CONTRACT.get(slot.expected.kind)?.[0] ?? "");
    const sameImmutableSource = row.kind === slot.expected.kind && canonicalValue(rowProjection) === canonicalValue(expectedProjection);
    canonicalGlobalOrder &&= row.rowId === slot.expected.rowId && sameImmutableSource;
    add(errors, sameImmutableSource, `immutable source identity slot ${index + 1}`);
    if (index > 0) {
      const previous = canonicalSlots[index - 1];
      add(errors, previous.descriptor.kindRank < slot.descriptor.kindRank || (previous.descriptor.kindRank === slot.descriptor.kindRank && previous.ordinal < slot.ordinal), `immutable canonical slot order ${index + 1}`);
    }
  }
  add(errors, canonicalGlobalOrder, "global CJL1 canonical row order");
  return { kindCount: ordinalByKind.size, rowCount: canonicalSlots.length };
}

function verifySeedAllocation(rows, expectedRows, ids, errors) {
  const expectedIds = new Map(expectedRows.map((row) => [row.rowId, row]));
  const expectedSeeds = expectedRows.filter((row) => row.kind === "SEED_SOURCE");
  const candidateSeeds = rows.filter((row) => row.kind === "SEED_SOURCE");
  const expectedByUnit = new Map(expectedSeeds.map((seed) => [seed.sourceUnitId, seed]));
  const candidateByUnit = new Map(candidateSeeds.map((seed) => [seed.sourceUnitId, seed]));
  const expectedEmitterByRowId = new Map();
  const actualEmitterByRowId = new Map();
  let outputSlotCount = 0;
  let referenceMembershipCount = 0;
  add(errors, candidateSeeds.length === expectedSeeds.length && candidateByUnit.size === expectedByUnit.size, "seed source inventory cardinality");
  for (const expectedSeed of expectedSeeds) {
    const seed = candidateByUnit.get(expectedSeed.sourceUnitId);
    const sourceObject = expectedRows.find((row) => row.kind === "OBJECT" && row.objectId === expectedSeed.sourceUnitId);
    const expectedClass = sourceObject?.objectClass === "check" ? "RULE" : sourceObject?.objectClass === "function" ? "FUNCTION_BODY" : sourceObject?.objectClass === "trigger" ? "TRIGGER_ATTACHMENT" : null;
    add(errors, Boolean(seed), `approved seed source unit ${expectedSeed.sourceUnitId}`);
    if (!seed) continue;
    add(errors, expectedClass !== null && seed.seedClass === expectedClass && seed.sourceDecisionId === expectedSeed.sourceDecisionId && seed.sourceDecisionId === "CX02-R01..R13", `approved seed decision/class ${seed.rowId}`);
    add(errors, sourceObject?.ownerRowId === seed.expectedOwnerRowId && seed.expectedOwnerRowId === expectedSeed.expectedOwnerRowId, `approved seed owner ${seed.rowId}`);
    add(errors, canonicalValue(seed.evidenceRowIds) === canonicalValue(EXTERNAL_EVIDENCE_IDS) && canonicalValue(seed.evidenceRowIds) === canonicalValue(expectedSeed.evidenceRowIds), `approved seed evidence ${seed.rowId}`);
    add(errors, seed.sourceSemanticStatement === expectedSeed.sourceSemanticStatement && seed.sourceSemanticSha256 === expectedSeed.sourceSemanticSha256, `approved seed source semantics ${seed.rowId}`);
    add(errors, seed.expectedOutputs.length === SEED_OUTPUT_KIND_RANK.length, `seed output kind count ${seed.rowId}`);
    for (let index = 0; index < SEED_OUTPUT_KIND_RANK.length; index += 1) {
      const output = seed.expectedOutputs[index];
      const expectedOutput = expectedSeed.expectedOutputs[index];
      const kind = SEED_OUTPUT_KIND_RANK[index];
      add(errors, output?.kind === kind && expectedOutput?.kind === kind, `seed output kind order ${seed.rowId}/${kind}`);
      if (!output || !expectedOutput) continue;
      const expectedKeys = ["cardinality", "kind", "mode", "stableRowIds", "stableRowSetSha256"];
      outputSlotCount += 1;
      if (output.mode === "REFERENCES_SHARED") referenceMembershipCount += output.stableRowIds.length;
      add(errors, Object.keys(output).sort().join("\0") === expectedKeys.sort().join("\0"), `seed output schema ${seed.rowId}/${kind}`);
      add(errors, output.cardinality === output.stableRowIds.length && new Set(output.stableRowIds).size === output.stableRowIds.length, `seed output cardinality/unique ${seed.rowId}/${kind}`);
      add(errors, canonicalValue(output.stableRowIds) === canonicalValue([...output.stableRowIds].sort()), `seed output stable order ${seed.rowId}/${kind}`);
      add(errors, output.stableRowIds.every((id) => ids.get(id)?.kind === kind), `seed output kind closure ${seed.rowId}/${kind}`);
      const core = { cardinality: output.cardinality, kind: output.kind, mode: output.mode, stableRowIds: output.stableRowIds };
      add(errors, output.stableRowSetSha256 === domainHash(STABLE_SET_DOMAIN, canonicalLine(core)), `seed stable set ${seed.rowId}/${kind}`);
      add(errors, output.mode === expectedOutput.mode && output.cardinality === expectedOutput.cardinality && canonicalValue(output.stableRowIds) === canonicalValue(expectedOutput.stableRowIds) && output.stableRowSetSha256 === expectedOutput.stableRowSetSha256, `approved seed partition ${seed.rowId}/${kind}`);
      for (const id of expectedOutput.mode === "EMITS" ? expectedOutput.stableRowIds : []) {
        add(errors, !expectedEmitterByRowId.has(id), `immutable duplicate emitter ${id}`);
        expectedEmitterByRowId.set(id, expectedSeed.rowId);
      }
      for (const id of output.mode === "EMITS" ? output.stableRowIds : []) {
        const emitters = actualEmitterByRowId.get(id) ?? [];
        emitters.push(seed.rowId);
        actualEmitterByRowId.set(id, emitters);
      }
    }
  }
  let inverseMembershipRowCount = 0;
  let inverseAbsentRowCount = 0;
  let inverseMultiMembershipRowCount = 0;
  for (const row of rows) {
    const expectedRow = expectedIds.get(row.rowId);
    const expectedEmitter = expectedEmitterByRowId.get(row.rowId);
    const actualEmitters = actualEmitterByRowId.get(row.rowId) ?? [];
    add(errors, Boolean(expectedEmitter) && actualEmitters.length === 1 && actualEmitters[0] === expectedEmitter, `complete seed emission ${row.rowId}`);
    if (Object.hasOwn(expectedRow ?? {}, "seedSourceRowIds")) {
      inverseMembershipRowCount += 1;
      if (expectedRow.seedSourceRowIds.length > 1) inverseMultiMembershipRowCount += 1;
      add(errors, canonicalValue(row.seedSourceRowIds) === canonicalValue(expectedRow.seedSourceRowIds) && canonicalValue(row.seedSourceRowIds) === canonicalValue([expectedEmitter]), `inverse seed membership ${row.rowId}`);
    } else {
      inverseAbsentRowCount += 1;
      add(errors, !Object.hasOwn(row, "seedSourceRowIds"), `approved zero inverse seed membership ${row.rowId}`);
    }
  }
  for (const id of actualEmitterByRowId.keys()) add(errors, expectedIds.has(id), `unexpected seed emission ${id}`);
  return { emissionCount: actualEmitterByRowId.size, inverseAbsentRowCount, inverseMembershipRowCount, inverseMultiMembershipRowCount, outputSlotCount, referenceMembershipCount, seedSourceCount: candidateSeeds.length };
}

function verifyObjectGraphs(rows, expectedRows, ids, errors) {
  const referenceFields = [...new Set([...FK_KINDS.keys(), "authorityEvidenceRowIds", "evidenceRowIds", "subjectRowIds"])].sort();
  let referenceFieldCount = 0;
  let referenceValueCount = 0;
  for (const expected of expectedRows) {
    const row = ids.get(expected.rowId);
    for (const field of referenceFields) {
      if (!Object.hasOwn(expected, field)) continue;
      referenceFieldCount += 1;
      const expectedValue = expected[field];
      referenceValueCount += Array.isArray(expectedValue) ? expectedValue.length : expectedValue === null ? 0 : 1;
      add(errors, canonicalValue(row?.[field]) === canonicalValue(expectedValue), `immutable object graph reference ${expected.rowId}.${field}`);
    }
  }
  const manifestBytes = readFileSync(RENDERING_MANIFEST_FILE);
  const manifest = JSON.parse(manifestBytes);
  add(errors, canonicalLine(manifest).equals(manifestBytes), "rendering manifest CJ1");
  add(errors, manifest.authorityBindings?.TEI === "237c7c5e18e4a3cf22d223c3d77b117efa400014", "TEI authority binding");
  add(errors, manifest.objectInventory?.length === 11, "approved object inventory count");
  const used = { attachment: new Set(), body: new Set(), declaration: new Set(), inventory: new Set(), locator: new Set(), physical: new Set(), seed: new Set() };
  const relationOwnerSets = new Map();
  for (const entry of manifest.objectInventory ?? []) {
    const [ordinal, objectId, ownerIdentity, approvedLeafPath, byteLength, , approvedLeafSha256] = entry;
    const object = rows.find((row) => row.kind === "OBJECT" && row.objectId === objectId);
    const expectedObject = expectedRows.find((row) => row.kind === "OBJECT" && row.objectId === objectId);
    add(errors, Boolean(object) && Boolean(expectedObject), `approved object graph identity ${objectId}`);
    if (!object || !expectedObject) continue;
    const inventory = ids.get(object.inventoryRowId);
    const owner = ids.get(object.ownerRowId);
    const physical = ids.get(object.physicalIdentifierRowId);
    const attachment = ids.get(object.attachmentRowId);
    const body = object.bodyRowId === null ? null : ids.get(object.bodyRowId);
    const declaration = ids.get(object.declarationSpanRowId);
    const locator = object.locatorRowIds?.length === 1 ? ids.get(object.locatorRowIds[0]) : null;
    const seed = object.seedSourceRowIds?.length === 1 ? ids.get(object.seedSourceRowIds[0]) : null;
    const relationName = ownerIdentity.split(".")[1];
    const relation = rows.find((row) => row.kind === "PHYSICAL_IDENTIFIER" && row.identifierClass === "RELATION" && row.renderedIdentity === `"public"."${relationName}"`);
    const expectedClass = objectId.split(":")[0];
    const expectedPhysicalClass = expectedClass === "constraintTrigger" ? "CONSTRAINT_TRIGGER" : expectedClass.toUpperCase();
    const localName = objectId.split(":")[1];
    const expectedRenderedIdentity = expectedClass === "function" ? `"public"."${localName}"` : `${relation?.renderedIdentity}:"${localName}"`;
    const expectedPath = `fragments/CX02/${String(ordinal).padStart(4, "0")}.sqlfrag`;
    const fragmentBytes = readFileSync(join(APPROVED_PROPOSAL_DIR, approvedLeafPath));
    add(errors, object.ordinal === ordinal && object.cx === "CX02" && object.objectClass === expectedClass && object.fragmentPath === expectedPath, `object graph scalar identity ${objectId}`);
    add(errors, fragmentBytes.length === byteLength && sha256(fragmentBytes) === approvedLeafSha256, `object graph approved fragment ${objectId}`);
    add(errors, inventory?.kind === "OBJECT_INVENTORY" && inventory.objectId === objectId && inventory.objectClass === expectedClass && inventory.ordinal === ordinal && inventory.expectedFragmentPath === expectedPath && inventory.ownerRowId === object.ownerRowId && inventory.physicalIdentifierRowId === object.physicalIdentifierRowId && inventory.attachmentRowId === object.attachmentRowId && canonicalValue(inventory.seedSourceRowIds) === canonicalValue(object.seedSourceRowIds), `object/inventory bijection ${objectId}`);
    add(errors, physical?.kind === "PHYSICAL_IDENTIFIER" && physical.identifierClass === expectedPhysicalClass && physical.localName === localName && physical.schemaName === "public" && physical.renderedIdentity === expectedRenderedIdentity && physical.relationPhysicalIdentifierRowId === (expectedClass === "function" ? null : relation?.rowId), `object physical identity ${objectId}`);
    add(errors, owner?.kind === "OWNER" && relation?.kind === "PHYSICAL_IDENTIFIER" && canonicalValue(owner.ownerPhysicalIdentifierRowIds) === canonicalValue([relation.rowId]) && owner.primaryOwnerPhysicalIdentifierRowId === relation.rowId && attachment?.ownerRowId === owner.rowId, `object relation owner ${objectId}`);
    add(errors, attachment?.kind === "ATTACHMENT" && attachment.ordinal === ordinal && seed?.kind === "SEED_SOURCE" && seed.sourceUnitId === objectId && seed.expectedOwnerRowId === owner.rowId, `object attachment/seed ${objectId}`);
    add(errors, declaration?.kind === "SOURCE_SPAN" && declaration.objectRowId === object.rowId && declaration.fragmentPath === expectedPath && declaration.startByte === 0 && declaration.endByte === fragmentBytes.length && declaration.lfTerminatedSha256 === approvedLeafSha256, `object declaration fragment ${objectId}`);
    add(errors, locator?.kind === "LOCATOR" && locator.sourceSpanRowIds?.includes(declaration?.rowId) && locator.subjectRowIds?.includes(object.rowId) && locator.sourceFragment?.fragmentPath === expectedPath && locator.sourceFragment?.byteLength === fragmentBytes.length && locator.sourceFragment?.fragmentSha256 === domainHash("C14P-OBJECT-BLOCK-V2", fragmentBytes), `object declaration locator ${objectId}`);
    if (expectedClass === "function") add(errors, body?.kind === "BODY" && body.objectRowId === object.rowId && body.objectId === objectId && body.fragmentPath === expectedPath && body.bodySpanRowId === declaration?.rowId && locator?.subjectRowIds?.includes(body.rowId), `function body bijection ${objectId}`);
    else add(errors, object.bodyRowId === null && body === null, `non-function body absence ${objectId}`);
    for (const [key, id] of [["inventory", object.inventoryRowId], ["physical", object.physicalIdentifierRowId], ["attachment", object.attachmentRowId], ["declaration", object.declarationSpanRowId], ["locator", locator?.rowId], ["seed", seed?.rowId]]) {
      add(errors, Boolean(id) && !used[key].has(id), `object graph unique ${key} ${objectId}`);
      if (id) used[key].add(id);
    }
    if (body) {
      add(errors, !used.body.has(body.rowId), `object graph unique body ${objectId}`);
      used.body.add(body.rowId);
    }
    const ownerObjects = relationOwnerSets.get(owner.rowId) ?? [];
    ownerObjects.push(object.rowId);
    relationOwnerSets.set(owner.rowId, ownerObjects);
  }
  add(errors, used.inventory.size === 11 && used.physical.size === 11 && used.attachment.size === 11 && used.declaration.size === 11 && used.locator.size === 11 && used.seed.size === 11 && used.body.size === 4, "complete object graph bijections");
  const expectedOwnerSets = new Map([["C14P2-CX02-OWNER-0001", [1, 5, 9]], ["C14P2-CX02-OWNER-0002", [2, 3, 6, 7, 10, 11]], ["C14P2-CX02-OWNER-0003", [4, 8]]]);
  for (const [ownerId, ordinals] of expectedOwnerSets) add(errors, canonicalValue(relationOwnerSets.get(ownerId) ?? []) === canonicalValue(ordinals.map((ordinal) => `C14P2-CX02-OBJECT-${String(ordinal).padStart(4, "0")}`)), `relation owner object set ${ownerId}`);
  const dependencies = rows.filter((row) => row.kind === "DEPENDENCY").map((dep) => {
    const source = ids.get(dep.sourceObjectRowId)?.objectId;
    const target = dep.targetKind === "GENERATED_OBJECT" ? ids.get(dep.targetObjectRowId)?.objectId : `public.${ids.get(dep.targetPhysicalIdentifierRowId)?.localName}`;
    return [source, dep.dependencyKind, target];
  });
  add(errors, canonicalValue(dependencies) === canonicalValue(manifest.dependencyInventory), "object graph dependency inventory");
  const events = rows.filter((row) => row.kind === "EVENT").map((event) => [ids.get(event.triggerObjectRowId)?.objectId, event.timing, event.level, event.eventKind, event.updateMode]);
  add(errors, canonicalValue(events) === canonicalValue(manifest.eventInventory), "object graph event inventory");
  const teiBindings = [];
  for (const [, functionId, triggerId, eventKinds] of manifest.errorSiteInventory ?? []) {
    const functionObject = rows.find((row) => row.kind === "OBJECT" && row.objectId === functionId);
    const triggerObject = rows.find((row) => row.kind === "OBJECT" && row.objectId === triggerId);
    const error = rows.find((row) => row.kind === "ERROR" && row.invariantId === functionId);
    const expectedBindings = eventKinds.map((eventKind) => `C14TEO-CX02-F${String(functionObject?.ordinal).padStart(4, "0")}-T${String(triggerObject?.ordinal).padStart(4, "0")}-${eventKind}`);
    add(errors, canonicalValue(error?.runtimeTriggerOperationOutcomeIds) === canonicalValue(expectedBindings), `TEI function/trigger binding ${functionId}`);
    teiBindings.push(...expectedBindings);
  }
  add(errors, teiBindings.length === 8 && new Set(teiBindings).size === 8, "TEI binding closure");
  return { bodyCount: used.body.size, graphCount: manifest.objectInventory?.length ?? 0, referenceFieldCount, referenceValueCount, relationOwnerSetCount: relationOwnerSets.size, teiBindingCount: teiBindings.length };
}

export const FK_KINDS = new Map([
  ["actionRowIds", "ACTION"], ["actionSpanRowId", "SOURCE_SPAN"], ["applicableAtomRowIds", "ATOM"],
  ["atomOccurrenceRowId", "ATOM_OCCURRENCE"], ["atomRowId", "ATOM"], ["attachmentRowId", "ATTACHMENT"],
  ["bodyRowId", "BODY"], ["bodySpanRowId", "SOURCE_SPAN"], ["booleanNodeRowId", "BOOLEAN"],
  ["branchRowId", "BRANCH"], ["branchRowIds", "BRANCH"], ["branchSpanRowId", "SOURCE_SPAN"],
  ["conditionExpressionRootRowId", "EXPRESSION_ROOT"], ["conditionLocatorRowIds", "LOCATOR"], ["conditionValueSpanRowIds", "SOURCE_SPAN"],
  ["decisionOutcomeRowId", "DECISION_OUTCOME"], ["decisionPointRowIds", "DECISION_POINT"], ["decisionSiteRowId", "DECISION_POINT"],
  ["declarationSpanRowId", "SOURCE_SPAN"], ["dependencyRowIds", "DEPENDENCY"], ["errorRowId", "ERROR"],
  ["errorRowIds", "ERROR"], ["errorSpanRowId", "SOURCE_SPAN"], ["eventRowIds", "EVENT"],
  ["exceptionHandlerOutcomeRowIds", "DECISION_OUTCOME"], ["expectedOwnerRowId", "OWNER"], ["expressionRootRowId", "EXPRESSION_ROOT"],
  ["expressionRootRowIds", "EXPRESSION_ROOT"], ["extensionDecisionPointRowId", "EXTENSION_DECISION_POINT"], ["inventoryRowId", "OBJECT_INVENTORY"],
  ["leafOccurrenceRowIds", "ATOM_OCCURRENCE"], ["locatorRowId", "LOCATOR"], ["locatorRowIds", "LOCATOR"],
  ["loopRowIds", "LOOP"], ["nestedDecisionPointRowIds", "DECISION_POINT"], ["objectRowId", "OBJECT"],
  ["occurrenceRowIds", "ATOM_OCCURRENCE"], ["outcomeRowIds", "DECISION_OUTCOME"], ["ownerObjectRowId", "OBJECT"],
  ["ownerPhysicalIdentifierRowIds", "PHYSICAL_IDENTIFIER"], ["ownerRowId", "OWNER"], ["parentBooleanNodeRowId", "BOOLEAN"],
  ["parentDecisionPointRowId", "DECISION_POINT"], ["physicalIdentifierRowId", "PHYSICAL_IDENTIFIER"], ["primaryOwnerPhysicalIdentifierRowId", "PHYSICAL_IDENTIFIER"],
  ["provenanceRowId", "PROVENANCE"], ["relationPhysicalIdentifierRowId", "PHYSICAL_IDENTIFIER"], ["rootBooleanNodeRowId", "BOOLEAN"],
  ["seedSourceRowIds", "SEED_SOURCE"], ["selectedUpdateColumnPhysicalRowIds", "PHYSICAL_IDENTIFIER"], ["siteSpanRowId", "SOURCE_SPAN"],
  ["sourceObjectRowId", "OBJECT"], ["sourceSpanRowId", "SOURCE_SPAN"], ["sourceSpanRowIds", "SOURCE_SPAN"],
  ["targetLoopRowId", "LOOP"], ["targetObjectRowId", "OBJECT"], ["targetOwnerRowId", "OWNER"],
  ["targetPhysicalIdentifierRowId", "PHYSICAL_IDENTIFIER"], ["triggerObjectRowId", "OBJECT"], ["u02BReferenceColumnPhysicalRowIds", "PHYSICAL_IDENTIFIER"],
  ["updateColumnPhysicalRowIds", "PHYSICAL_IDENTIFIER"], ["versionSourceLocatorRowId", "LOCATOR"],
]);

function verifyFkKinds(rows, ids, errors) {
  for (const row of rows) {
    for (const [field, expectedKind] of FK_KINDS) {
      if (!(field in row) || row[field] === null) continue;
      const values = Array.isArray(row[field]) ? row[field] : [row[field]];
      for (const value of values) {
        const target = ids.get(value);
        add(errors, target?.kind === expectedKind, `FK kind ${row.rowId}.${field}->${value} expected ${expectedKind}`);
      }
    }
    if (Array.isArray(row.subjectRowIds)) {
      for (const value of row.subjectRowIds) add(errors, ids.has(value), `subject FK ${row.rowId}->${value}`);
    }
    if (Array.isArray(row.evidenceRowIds)) add(errors, canonicalValue(row.evidenceRowIds) === canonicalValue(EXTERNAL_EVIDENCE_IDS), `external evidence chain ${row.rowId}`);
    if (Array.isArray(row.authorityEvidenceRowIds)) add(errors, canonicalValue(row.authorityEvidenceRowIds) === canonicalValue(EXTERNAL_EVIDENCE_IDS), `authority evidence chain ${row.rowId}`);
    for (const field of ["selectedUpdateColumnPhysicalRowIds", "u02BReferenceColumnPhysicalRowIds", "updateColumnPhysicalRowIds"]) {
      for (const value of row[field] ?? []) add(errors, ids.get(value)?.identifierClass === "COLUMN", `FK physical class ${row.rowId}.${field}->${value} expected COLUMN`);
    }
    if (row.relationPhysicalIdentifierRowId) add(errors, ids.get(row.relationPhysicalIdentifierRowId)?.identifierClass === "RELATION", `FK physical class ${row.rowId}.relationPhysicalIdentifierRowId expected RELATION`);
    if (row.kind === "OWNER") {
      for (const value of row.ownerPhysicalIdentifierRowIds) add(errors, ids.get(value)?.identifierClass === "RELATION", `FK physical class ${row.rowId}.ownerPhysicalIdentifierRowIds expected RELATION`);
    }
    if (row.triggerObjectRowId) add(errors, ["trigger", "constraintTrigger"].includes(ids.get(row.triggerObjectRowId)?.objectClass), `FK object class ${row.rowId}.triggerObjectRowId expected trigger`);
  }
}

function findExactSpan(rows, fragmentPath, startByte, endByte, objectRowId) {
  return rows.find((row) => row.kind === "SOURCE_SPAN" && row.fragmentPath === fragmentPath && row.objectRowId === objectRowId && row.startByte === startByte && row.endByte === endByte);
}

function containingExistsBounds(bytes, occurrenceStart) {
  const startByte = bytes.lastIndexOf(Buffer.from("EXISTS (", "ascii"), occurrenceStart);
  if (startByte < 0) return null;
  let depth = 0;
  let inDoubleQuote = false;
  let inSingleQuote = false;
  for (let index = startByte + 7; index < bytes.length; index += 1) {
    const byte = bytes[index];
    if (inDoubleQuote) {
      if (byte === 0x22 && bytes[index + 1] === 0x22) index += 1;
      else if (byte === 0x22) inDoubleQuote = false;
      continue;
    }
    if (inSingleQuote) {
      if (byte === 0x27 && bytes[index + 1] === 0x27) index += 1;
      else if (byte === 0x27) inSingleQuote = false;
      continue;
    }
    if (byte === 0x22) inDoubleQuote = true;
    else if (byte === 0x27) inSingleQuote = true;
    else if (byte === 0x28) depth += 1;
    else if (byte === 0x29) {
      depth -= 1;
      if (depth === 0) return { endByte: index + 1, startByte };
    }
  }
  return null;
}

function approvedLeafHashes() {
  return new Map(readFileSync(join(APPROVED_PROPOSAL_DIR, "hashes.sha256"), "utf8")
    .split("\n")
    .filter((line) => /^[0-9a-f]{64}  .+$/.test(line))
    .map((line) => {
      const [digest, path] = line.split("  ");
      return [path, digest];
    }));
}

function objectFragmentLeaf(object) {
  const ordinal = String(object.ordinal).padStart(2, "0");
  const name = object.objectId.split(":")[1].replaceAll("_", "-");
  const objectClass = object.objectClass === "constraintTrigger" ? "constraint-trigger" : object.objectClass;
  return `${ordinal}-${objectClass}-${name}.sqlfrag`;
}

function occurrenceFragment(object, options, leafHashes, errors) {
  const approvedLeafPath = objectFragmentLeaf(object);
  const expectedStagedPath = `fragments/CX02/${String(object.ordinal).padStart(4, "0")}.sqlfrag`;
  const override = options.fragmentBytesByPath?.[approvedLeafPath]
    ?? options.fragmentBytesByPath?.[expectedStagedPath]
    ?? (object.objectId === "function:fn_stock_lot_review_coherence" ? options.fragmentBytes : undefined);
  let bytes;
  try {
    bytes = Buffer.from(override ?? readFileSync(join(APPROVED_PROPOSAL_DIR, approvedLeafPath)));
  } catch (error) {
    errors.push(`approved occurrence leaf ${approvedLeafPath}: ${error.message}`);
    bytes = Buffer.alloc(0);
  }
  const approvedLeafSha256 = leafHashes.get(approvedLeafPath);
  add(errors, Boolean(approvedLeafSha256), `approved occurrence leaf ledger ${approvedLeafPath}`);
  add(errors, sha256(bytes) === approvedLeafSha256, `approved occurrence leaf hash ${approvedLeafPath}`);
  add(errors, object.fragmentPath === expectedStagedPath, `approved occurrence object fragment path ${object.rowId}`);
  return { approvedLeafPath, approvedLeafSha256, bytes, expectedStagedPath };
}

function lfTerminated(bytes) {
  return bytes.at(-1) === 0x0a ? bytes : Buffer.concat([bytes, Buffer.from("\n")]);
}

function byteCoordinates(bytes, offset) {
  const prefix = bytes.subarray(0, offset);
  const lastLf = prefix.lastIndexOf(0x0a);
  return { column: offset - lastLf, line: 1 + [...prefix].filter((byte) => byte === 0x0a).length };
}

function verifyOccurrenceByteClosure(rows, ids, occurrence, errors) {
  const { bytes, expectedStagedPath } = occurrence.fragment;
  const object = ids.get(occurrence.sourceObjectRowId);
  const span = ids.get(occurrence.sourceSpanRowId);
  const locator = ids.get(occurrence.locatorRowId);
  if (!object || !span || !locator) return;
  const raw = bytes.subarray(span.startByte, span.endByte);
  const rawLf = lfTerminated(raw);
  const start = byteCoordinates(bytes, span.startByte);
  const end = byteCoordinates(bytes, span.endByte);
  const expectedSpanKind = occurrence.dependencyKind === "EXECUTES" ? "OBJECT" : "BOOLEAN";
  add(errors, span.fragmentPath === expectedStagedPath && span.objectRowId === object.rowId && span.spanKind === expectedSpanKind, `source span identity ${span.rowId}`);
  add(errors, span.startByte === occurrence.spanStartByte && span.endByte === occurrence.spanEndByte && span.startByte <= occurrence.startByte && span.endByte >= occurrence.endByte, `source span offsets ${span.rowId}`);
  add(errors, span.startLine === start.line && span.startColumn === start.column && span.endLine === end.line && span.endColumn === end.column, `source span coordinates ${span.rowId}`);
  add(errors, domainHash("C14P-SOURCE-SPAN-V2", raw) === span.rawSha256, `source span raw hash ${span.rowId}`);
  add(errors, sha256(rawLf) === span.lfTerminatedSha256, `source span LF hash ${span.rowId}`);
  if (span.spanKind === "BOOLEAN") {
    const normalized = Buffer.from(`${raw.toString("utf8").trim().replace(/\s+/g, " ")}\n`, "utf8");
    add(errors, domainHash("C14P-NORMALIZED-SPAN-V2", normalized) === span.normalizedSha256, `source span normalized hash ${span.rowId}`);
  } else {
    add(errors, span.normalizedSha256 === null, `source span normalized null ${span.rowId}`);
  }
  add(errors, locator.sourceMode === "PROPOSAL_FRAGMENT" && canonicalValue(locator.sourceSpanRowIds) === canonicalValue([span.rowId]), `occurrence locator span relationship ${locator.rowId}`);
  add(errors, locator.sourceFragment?.fragmentPath === expectedStagedPath && locator.sourceFragment?.byteLength === bytes.length && locator.sourceFragment?.fragmentSha256 === domainHash("C14P-OBJECT-BLOCK-V2", bytes), `occurrence locator source fragment ${locator.rowId}`);
  add(errors, locator.fragmentByteLength === raw.length && locator.fragmentSha256 === sha256(rawLf), `occurrence locator fragment bytes ${locator.rowId}`);
  if (occurrence.dependencyKind === "EXECUTES") {
    add(errors, object.declarationSpanRowId === span.rowId && canonicalValue(object.locatorRowIds) === canonicalValue([locator.rowId]) && canonicalValue(locator.subjectRowIds) === canonicalValue([object.rowId]), `EXECUTES containing identity ${span.rowId}`);
  } else {
    const booleanRows = locator.subjectRowIds?.map((id) => ids.get(id)).filter((row) => row?.kind === "BOOLEAN") ?? [];
    const occurrenceRows = locator.subjectRowIds?.map((id) => ids.get(id)).filter((row) => row?.kind === "ATOM_OCCURRENCE") ?? [];
    const atomRows = locator.subjectRowIds?.map((id) => ids.get(id)).filter((row) => row?.kind === "ATOM") ?? [];
    add(errors, locator.subjectRowIds?.length === 3 && booleanRows.length === 1 && booleanRows[0].sourceSpanRowId === span.rowId && occurrenceRows.length === 1 && occurrenceRows[0].sourceSpanRowId === span.rowId && occurrenceRows[0].booleanNodeRowId === booleanRows[0].rowId && atomRows.length === 1 && occurrenceRows[0].atomRowId === atomRows[0].rowId, `READS containing identity ${span.rowId}`);
  }
}

function parseDependencyOccurrences(rows, ids, options, errors) {
  const occurrences = [];
  const leafHashes = approvedLeafHashes();
  for (const object of rows.filter((row) => row.kind === "OBJECT" && ["trigger", "constraintTrigger"].includes(row.objectClass))) {
    const fragment = occurrenceFragment(object, options, leafHashes, errors);
    const bytes = fragment.bytes;
    const text = bytes.toString("utf8");
    const matches = [...text.matchAll(/EXECUTE FUNCTION ("public"\."([^"]+)")\(\)/g)];
    add(errors, matches.length === 1, `EXECUTES occurrence cardinality ${object.rowId}`);
    for (const match of matches) {
      const endByte = match.index + Buffer.byteLength(match[0]);
      const spanStartByte = 0;
      const spanEndByte = bytes.length;
      const span = findExactSpan(rows, object.fragmentPath, spanStartByte, spanEndByte, object.rowId);
      add(errors, Boolean(span), `exact EXECUTES source span ${object.rowId}`);
      occurrences.push({ dependencyKind: "EXECUTES", endByte, fragment, sourceObjectRowId: object.rowId, sourceSpanRowId: span?.rowId, spanEndByte, spanStartByte, startByte: match.index, targetIdentity: `function:${match[2]}`, targetKind: "GENERATED_OBJECT" });
    }
  }
  const sourceObject = rows.find((row) => row.kind === "OBJECT" && row.objectId === "function:fn_stock_lot_review_coherence");
  const fragment = occurrenceFragment(sourceObject, options, leafHashes, errors);
  const text = fragment.bytes.toString("utf8");
  for (const match of text.matchAll(/FROM ("public"\."(?:StockLotObservation|StockLot)") AS "([^"]+)"/g)) {
    const endByte = match.index + Buffer.byteLength(match[0]);
    const bounds = containingExistsBounds(fragment.bytes, match.index);
    add(errors, Boolean(bounds), `parser READS Boolean bounds ${match.index}`);
    const span = bounds ? findExactSpan(rows, sourceObject.fragmentPath, bounds.startByte, bounds.endByte, sourceObject.rowId) : undefined;
    add(errors, Boolean(span), `exact READS source span ${match.index}`);
    occurrences.push({ alias: match[2], dependencyKind: "READS", endByte, fragment, sourceObjectRowId: sourceObject.rowId, sourceSpanRowId: span?.rowId, spanEndByte: bounds?.endByte, spanStartByte: bounds?.startByte, startByte: match.index, targetIdentity: match[1], targetKind: "PHYSICAL_RELATION" });
  }
  add(errors, occurrences.length === 8, "complete parser dependency occurrence count");
  for (const occurrence of occurrences) {
    const locators = rows.filter((row) => row.kind === "LOCATOR" && row.sourceSpanRowIds?.includes(occurrence.sourceSpanRowId));
    add(errors, locators.length === 1 && canonicalValue(locators[0].sourceSpanRowIds) === canonicalValue([occurrence.sourceSpanRowId]), `complete occurrence locator ${occurrence.sourceSpanRowId}`);
    occurrence.locatorRowId = locators[0]?.rowId;
    verifyOccurrenceByteClosure(rows, ids, occurrence, errors);
  }
  return occurrences;
}

function verifyC13Evidence(options, ids, errors) {
  const evidenceBytes = options.c13EvidenceBytes ?? readFileSync(C13_EVIDENCE_FILE);
  let evidence;
  try { evidence = JSON.parse(evidenceBytes); } catch (error) { errors.push(`C13 evidence parse: ${error.message}`); return; }
  add(errors, canonicalLine(evidence).equals(evidenceBytes), "C13 evidence CJ1");
  add(errors, evidence.git?.commit === C13_COMMIT, "C13 commit");
  add(errors, evidence.git?.schemaBlob === C13_SCHEMA_BLOB, "C13 schema blob");
  add(errors, evidence.git?.path === C13_SCHEMA_PATH, "C13 schema path");
  const expectedRelations = [
    ["StockLotObservation", "C14P2-CX02-PHYSICAL_IDENTIFIER-0001", "C14P2-CX02-OWNER-0001", 77200, 79779, "262ebb6ee9641d2b5e2932d835133098f5b7bcc86f5646ccf513b7e74e5594b0"],
    ["StockLotReview", "C14P2-CX02-PHYSICAL_IDENTIFIER-0002", "C14P2-CX02-OWNER-0002", 79780, 82237, "d73181c448daac08d55acd2ba9ae256e20a31472e2157060cc6b6f5db26e5543"],
    ["StockLot", "C14P2-CX02-PHYSICAL_IDENTIFIER-0003", "C14P2-CX02-OWNER-0003", 82238, 83824, "f0ace0f682263f9989e4c79c3a77e24e5cf1815be99e66affce3333c9d716aa2"],
  ];
  add(errors, evidence.relations?.length === 3, "C13 relation evidence count");
  for (const [index, expected] of expectedRelations.entries()) {
    const relation = evidence.relations?.[index];
    const [name, physicalId, ownerId, startByte, endByte, fragmentSha256] = expected;
    add(errors, relation?.modelName === name && relation?.physicalIdentifierRowId === physicalId && relation?.ownerRowId === ownerId, `C13 relation identity ${name}`);
    add(errors, relation?.locatorId === `C13-SCHEMA-MODEL-${name}` && relation?.startByte === startByte && relation?.endByte === endByte && relation?.fragmentSha256 === fragmentSha256, `C13 locator ${name}`);
    add(errors, relation?.cx === "CX02" && relation?.schemaName === "public" && relation?.companyField === "companyId" && relation?.renderedIdentity === `"public"."${name}"` && relation?.mappingMode === "PRISMA_MODEL_NAME_NO_MAP", `C13 company/CX/rendering ${name}`);
    const physical = ids.get(physicalId);
    const owner = ids.get(ownerId);
    const provenance = ids.get(relation?.provenanceRowId);
    add(errors, physical?.kind === "PHYSICAL_IDENTIFIER" && physical?.identifierClass === "RELATION" && physical?.provenanceRowId === relation?.provenanceRowId, `C13 physical provenance ${name}`);
    add(errors, owner?.kind === "OWNER" && owner?.provenanceRowId === relation?.provenanceRowId && owner?.ownerPhysicalIdentifierRowIds?.length === 1 && owner.ownerPhysicalIdentifierRowIds[0] === physicalId, `C13 owner provenance ${name}`);
    add(errors, provenance?.kind === "PROVENANCE" && provenance?.evidenceRowIds?.every((id) => EXTERNAL_EVIDENCE_IDS.includes(id)) && provenance?.subjectRowIds?.includes(physicalId) && provenance?.subjectRowIds?.includes(ownerId), `C13 provenance chain ${name}`);
  }
  if (options.verifyGitEvidence === false) return;
  const repoRoot = resolve(SPEC, "..", "..", "..");
  let schemaBytes;
  try {
    const resolved = execFileSync("git", ["rev-parse", `${C13_COMMIT}:${C13_SCHEMA_PATH}`], { cwd: repoRoot, encoding: "utf8" }).trim();
    add(errors, resolved === C13_SCHEMA_BLOB, "C13 commit/path resolution");
    schemaBytes = execFileSync("git", ["cat-file", "blob", C13_SCHEMA_BLOB], { cwd: repoRoot });
  } catch (error) {
    errors.push(`C13 Git evidence read: ${error.message}`);
    return;
  }
  add(errors, gitBlobSha1(schemaBytes) === C13_SCHEMA_BLOB && schemaBytes.length === evidence.git.blobByteLength && sha256(schemaBytes) === evidence.git.blobSha256, "C13 Git blob bytes/hash");
  for (const relation of evidence.relations) {
    const fragment = schemaBytes.subarray(relation.startByte, relation.endByte);
    const text = fragment.toString("utf8");
    add(errors, sha256(fragment) === relation.fragmentSha256 && text.startsWith(`model ${relation.modelName} {`) && text.endsWith("}\n") && /^\s+companyId\s+/m.test(text) && !text.includes("@@map"), `C13 model fragment ${relation.modelName}`);
  }
}

function targetIdentity(dep, ids) {
  if (dep.targetKind === "GENERATED_OBJECT") return ids.get(dep.targetObjectRowId)?.objectId ?? "";
  return ids.get(dep.targetPhysicalIdentifierRowId)?.renderedIdentity ?? "";
}

function verifyApprovedRoot(errors) {
  const dir = join(SPEC, "cx02-exact-rendering-proposal");
  const lines = readFileSync(join(dir, "hashes.sha256")).toString("utf8").split(/(?<=\n)/);
  const data = lines.slice(0, 13);
  add(errors, data.length === 13 && data.every((line) => /^[0-9a-f]{64}  .+\n$/.test(line)), "approved root hash-line schema");
  for (const line of data) {
    const [digest, path] = line.trimEnd().split("  ");
    add(errors, sha256(readFileSync(join(dir, path))) === digest, `approved root leaf ${path}`);
  }
  add(errors, domainHash("CX02-EXACT-RENDERING-PROPOSAL-ROOT-V1", Buffer.from(data.join(""), "utf8")) === APPROVED_ROOT, "approved CX02 root equality");
}

function verifyArtifactEnvelope(errors) {
  const manifestBytes = readFileSync(MANIFEST_FILE);
  const manifest = JSON.parse(manifestBytes);
  add(errors, canonicalLine(manifest).equals(manifestBytes), "manifest CJ1");
  for (const leaf of manifest.leaves) add(errors, sha256(readFileSync(join(HERE, leaf.path))) === leaf.sha256, `manifest leaf ${leaf.path}`);
  const hashBytes = readFileSync(HASHES_FILE);
  const lines = hashBytes.toString("utf8").split(/(?<=\n)/);
  const data = lines.slice(0, manifest.leaves.length + 1);
  add(errors, data.length === manifest.leaves.length + 1, "hash coverage count");
  const expected = [...manifest.leaves.map((leaf) => `${leaf.sha256}  ${leaf.path}\n`), `${sha256(manifestBytes)}  manifest.cj1\n`];
  add(errors, data.join("") === expected.join(""), "hash coverage bytes");
  const root = domainHash(manifest.detachedRootDomain, Buffer.from(data.join(""), "utf8"));
  add(errors, lines.at(-1) === `# detached-diagnostic-root-sha256: ${root}\n`, "detached diagnostic root");
}

export function validateDiagnostic(options = {}) {
  const errors = [];
  const rowsBytes = options.rowsBytes ?? readFileSync(ROW_FILE);
  const rows = parseCjl1(rowsBytes, errors);
  const expectedRows = parseCjl1(readFileSync(ROW_FILE), []);
  const coherenceFragment = options.fragmentBytes ?? readFileSync(join(APPROVED_PROPOSAL_DIR, "07-function-fn-stock-lot-review-coherence.sqlfrag"));
  const ids = new Map(rows.map((row) => [row.rowId, row]));
  const expectedIds = new Map(expectedRows.map((row) => [row.rowId, row]));
  add(errors, rows.length === 385, "row count");
  add(errors, ids.size === rows.length, "duplicate rowId");
  add(errors, [...ids.keys()].every((id) => expectedIds.has(id)) && [...expectedIds.keys()].every((id) => ids.has(id)), "missing or extra row");
  const identitySummary = verifyStableRowIdentities(rows, expectedRows, errors);
  for (const row of rows) {
    add(errors, row.schemaVersion === ROW_SCHEMA, `stale schema domain ${row.rowId}`);
    add(errors, hashRow(row) === row.rowSha256, `row hash ${row.rowId}`);
    add(errors, canonicalLine(row).subarray(0, -1).equals(Buffer.from(canonicalValue(row))), `row canonicality ${row.rowId}`);
    const expected = expectedIds.get(row.rowId);
    if (expected) add(errors, Object.keys(row).sort().join("\0") === Object.keys(expected).sort().join("\0"), `physical/unknown column injection ${row.rowId}`);
  }
  verifyFkKinds(rows, ids, errors);
  verifyC13Evidence(options, ids, errors);
  const seedSummary = verifySeedAllocation(rows, expectedRows, ids, errors);
  const graphSummary = verifyObjectGraphs(rows, expectedRows, ids, errors);
  if (options.enforceExpectedSliceHash !== false) {
    add(errors, rowsBytes.length === 358089, "slice byte length");
    add(errors, domainHash(ROW_SET_DOMAIN, rowsBytes) === EXPECTED_SLICE_HASH, "slice hash");
  }
  const kindCount = (kind) => rows.filter((row) => row.kind === kind).length;
  add(errors, kindCount("LOCATOR") === 66, "locator count");
  add(errors, kindCount("DEPENDENCY") === 6, "dependency count");
  const deps = rows.filter((row) => row.kind === "DEPENDENCY");
  const parsedOccurrences = parseDependencyOccurrences(rows, ids, options, errors);
  const occurrenceUseCounts = new Map(parsedOccurrences.map((occurrence) => [occurrence.sourceSpanRowId, 0]));
  const kindRank = new Map(["EXECUTES", "READS", "WRITES", "VALIDATES", "REQUIRES"].map((kind, index) => [kind, index]));
  const matrix = new Set(["EXECUTES|trigger|GENERATED_OBJECT|function", "EXECUTES|constraintTrigger|GENERATED_OBJECT|function", "READS|function|PHYSICAL_RELATION|RELATION", "WRITES|function|PHYSICAL_RELATION|RELATION", "VALIDATES|check|GENERATED_OBJECT|extension", "VALIDATES|exclusion|GENERATED_OBJECT|extension", "REQUIRES|extension|GENERATED_OBJECT|extension"]);
  const edgeKeys = new Set();
  for (const dep of deps) {
    const generated = dep.targetKind === "GENERATED_OBJECT";
    const keys = generated
      ? ["cx", "dependencyId", "dependencyKind", "kind", "ordinal", "provenanceRowId", "rowId", "rowSha256", "schemaVersion", "seedSourceRowIds", "sourceObjectRowId", "sourceSpanRowIds", "targetKind", "targetObjectRowId"]
      : ["cx", "dependencyId", "dependencyKind", "kind", "ordinal", "provenanceRowId", "rowId", "rowSha256", "schemaVersion", "seedSourceRowIds", "sourceObjectRowId", "sourceSpanRowIds", "targetKind", "targetOwnerRowId", "targetPhysicalIdentifierRowId", "tenantScope"];
    add(errors, Object.keys(dep).sort().join("\0") === keys.sort().join("\0"), `dependency tagged-union schema ${dep.rowId}`);
    add(errors, /^C14PY-CX02-\d{4}$/.test(dep.dependencyId) && dep.cx === "CX02", `dependency CX ${dep.rowId}`);
    const source = ids.get(dep.sourceObjectRowId);
    const target = ids.get(generated ? dep.targetObjectRowId : dep.targetPhysicalIdentifierRowId);
    add(errors, source?.kind === "OBJECT" && source.cx === dep.cx, `source FK/CX ${dep.rowId}`);
    add(errors, target?.kind === (generated ? "OBJECT" : "PHYSICAL_IDENTIFIER") && target.cx === dep.cx, `target FK/CX ${dep.rowId}`);
    const targetClass = generated ? target?.objectClass : target?.identifierClass;
    add(errors, matrix.has(`${dep.dependencyKind}|${source?.objectClass}|${dep.targetKind}|${targetClass}`), `kind x target matrix ${dep.rowId}`);
    add(errors, ["EXECUTES", "READS", "WRITES", "VALIDATES", "REQUIRES"].includes(dep.dependencyKind), `dependency alias ${dep.rowId}`);
    add(errors, ["GENERATED_OBJECT", "PHYSICAL_RELATION"].includes(dep.targetKind), `target alias ${dep.rowId}`);
    const identity = targetIdentity(dep, ids);
    add(errors, identity === EXPECTED_TARGETS[dep.ordinal - 1], `target substitution ${dep.rowId}`);
    const edgeKey = `${source?.objectId}\0${dep.dependencyKind}\0${dep.targetKind}\0${identity}`;
    add(errors, !edgeKeys.has(edgeKey), `D9 duplicate edge ${dep.rowId}`);
    edgeKeys.add(edgeKey);
    add(errors, dep.sourceSpanRowIds.length > 0 && new Set(dep.sourceSpanRowIds).size === dep.sourceSpanRowIds.length, `source span duplicate/empty ${dep.rowId}`);
    const spans = dep.sourceSpanRowIds.map((id) => ids.get(id));
    add(errors, spans.every((span) => span?.kind === "SOURCE_SPAN" && span.cx === dep.cx && span.objectRowId === dep.sourceObjectRowId), `source span FK/owner ${dep.rowId}`);
    add(errors, spans.every((span, index) => index === 0 || spans[index - 1].startByte < span.startByte), `source span order ${dep.rowId}`);
    const parserEdgeOccurrences = parsedOccurrences
      .filter((occurrence) => occurrence.sourceObjectRowId === dep.sourceObjectRowId && occurrence.dependencyKind === dep.dependencyKind && occurrence.targetKind === dep.targetKind && occurrence.targetIdentity === identity)
      .sort((a, b) => a.startByte - b.startByte);
    add(errors, canonicalValue(dep.sourceSpanRowIds) === canonicalValue(parserEdgeOccurrences.map((occurrence) => occurrence.sourceSpanRowId)), `complete reference occurrence equality ${dep.rowId}`);
    for (const occurrence of parserEdgeOccurrences) occurrenceUseCounts.set(occurrence.sourceSpanRowId, (occurrenceUseCounts.get(occurrence.sourceSpanRowId) ?? 0) + 1);
    if (!generated) {
      add(errors, dep.tenantScope === "COMPANY_EXACT", `tenant scope ${dep.rowId}`);
      add(errors, target?.identifierClass === "RELATION" && target?.schemaName === "public" && target?.relationPhysicalIdentifierRowId === null, `physical relation class ${dep.rowId}`);
      add(errors, target?.renderedIdentity === `"public"."${target?.localName}"`, `physical relation rendered identity/alias ${dep.rowId}`);
      const owner = ids.get(dep.targetOwnerRowId);
      add(errors, owner?.kind === "OWNER" && owner.cx === dep.cx && owner.companyScoped === true && owner.ownerKind === "RELATION", `physical owner/company ${dep.rowId}`);
      add(errors, owner?.ownerPhysicalIdentifierRowIds?.length === 1 && owner.ownerPhysicalIdentifierRowIds[0] === target.rowId && owner.primaryOwnerPhysicalIdentifierRowId === target.rowId, `physical owner singleton ${dep.rowId}`);
      for (const span of spans) {
        const raw = coherenceFragment.subarray(span.startByte, span.endByte);
        const text = raw.toString("utf8");
        add(errors, typeof target?.renderedIdentity === "string" && text.includes(target.renderedIdentity), `target substitution/evidence ${dep.rowId}/${span.rowId}`);
        add(errors, /"[A-Za-z]+"\."companyId" = NEW\."companyId"/.test(text), `company evidence ${dep.rowId}/${span.rowId}`);
        add(errors, domainHash("C14P-SOURCE-SPAN-V2", raw) === span.rawSha256, `source span raw hash ${span.rowId}`);
        const locators = rows.filter((row) => row.kind === "LOCATOR" && row.sourceSpanRowIds?.includes(span.rowId));
        add(errors, locators.length === 1 && locators[0].sourceMode === "PROPOSAL_FRAGMENT", `locator coverage ${span.rowId}`);
      }
    }
  }
  add(errors, parsedOccurrences.every((occurrence) => occurrence.sourceSpanRowId && occurrenceUseCounts.get(occurrence.sourceSpanRowId) === 1), "complete parser occurrence ownership");
  add(errors, deps.every((dep, index) => dep.ordinal === index + 1 && dep.rowId === `C14P2-CX02-DEPENDENCY-${String(index + 1).padStart(4, "0")}`), "D9 dependency ordering");
  add(errors, deps.every((dep, index) => index === 0 || kindRank.get(deps[index - 1].dependencyKind) <= kindRank.get(dep.dependencyKind)), "D9 dependency kind ordering");
  if (options.enforceExactDependencies !== false) add(errors, deps.every((dep, index) => dep.rowSha256 === DEP_HASHES[index]), "exact dependency row hashes");
  const inventoryBytes = options.inventoryBytes ?? readFileSync(INVENTORY_FILE);
  const inventory = JSON.parse(inventoryBytes);
  add(errors, canonicalLine(inventory).equals(inventoryBytes), "all-CX inventory CJ1");
  add(errors, inventory.cxInventory.length === 13 && inventory.cxInventory.every((entry, index) => entry.cx === `CX${String(index + 1).padStart(2, "0")}`), "all-CX finite order");
  const objectTotals = Object.fromEntries(Object.keys(inventory.auditScope.databaseObjectClassCounts).map((key) => [key, inventory.cxInventory.reduce((sum, entry) => sum + entry.objectClassCounts[key], 0)]));
  add(errors, Object.entries(inventory.auditScope.databaseObjectClassCounts).every(([key, value]) => objectTotals[key] === value), "all-CX object class totals");
  add(errors, Object.values(objectTotals).reduce((a, b) => a + b, 0) === 169, "all-CX object total");
  add(errors, inventory.cxInventory.reduce((sum, entry) => sum + entry.executesEdgeCount, 0) === 59, "all-CX EXECUTES total");
  const exact = inventory.cxInventory.flatMap((entry) => entry.exactRows);
  add(errors, exact.length === 6 && exact.every((edge, index) => edge.dependencyId === deps[index].dependencyId && edge.dependencyKind === deps[index].dependencyKind && edge.targetKind === deps[index].targetKind && edge.sourceObjectId === ids.get(deps[index].sourceObjectRowId).objectId && edge.targetIdentity === targetIdentity(deps[index], ids)), "all-CX exact-row consistency");
  add(errors, inventory.authorityBindings.cx02ApprovedRenderingRootSha256 === APPROVED_ROOT, "inventory approved root binding");
  add(errors, inventory.authorityBindings.c13SchemaBlob === "47313a8a85ac71ac56df93ce212593820cb95a13", "C13 evidence binding");
  if (options.verifyApprovedRoot !== false) verifyApprovedRoot(errors);
  if (options.verifyArtifactEnvelope !== false) verifyArtifactEnvelope(errors);
  return { errors, ok: errors.length === 0, summary: { allocationEmissionCount: seedSummary.emissionCount, allocationInverseAbsentCount: seedSummary.inverseAbsentRowCount, allocationInverseMembershipCount: seedSummary.inverseMembershipRowCount, allocationInverseMultiCount: seedSummary.inverseMultiMembershipRowCount, allocationOutputSlotCount: seedSummary.outputSlotCount, allocationReferenceMembershipCount: seedSummary.referenceMembershipCount, allocationSeedSourceCount: seedSummary.seedSourceCount, allCxCount: 13, dependencyCount: deps.length, dependencyOccurrenceCount: parsedOccurrences.length, graphBodyCount: graphSummary.bodyCount, graphObjectCount: graphSummary.graphCount, graphReferenceFieldCount: graphSummary.referenceFieldCount, graphReferenceValueCount: graphSummary.referenceValueCount, graphRelationOwnerSetCount: graphSummary.relationOwnerSetCount, graphTeiBindingCount: graphSummary.teiBindingCount, identityKindCount: identitySummary.kindCount, identityRowCount: identitySummary.rowCount, locatorCount: kindCount("LOCATOR"), rowCount: rows.length, sliceSha256: domainHash(ROW_SET_DOMAIN, rowsBytes) } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateDiagnostic();
  console.log(JSON.stringify({ verdict: result.ok ? "PASS" : "FAIL", ...result.summary, failures: result.errors }, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}
