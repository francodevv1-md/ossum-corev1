import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalLine, domainHash, FK_KINDS, hashRow, serializeRows, validateDiagnostic } from "./validate.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const original = readFileSync(join(HERE, "cx02-proposal-rows.cjl1"));
const approvedDir = join(HERE, "..", "cx02-exact-rendering-proposal");
const coherenceFragment = readFileSync(join(approvedDir, "07-function-fn-stock-lot-review-coherence.sqlfrag"));
const trigger08Fragment = readFileSync(join(approvedDir, "08-trigger-trg-stock-lot-append-only.sqlfrag"));
const trigger11Fragment = readFileSync(join(approvedDir, "11-trigger-trg-stock-lot-review-coherence.sqlfrag"));
const c13Evidence = readFileSync(join(HERE, "c13-physical-relation-evidence.cj1"));
const parse = () => original.toString("utf8").trimEnd().split("\n").map(JSON.parse);
const semanticOptions = { enforceExactDependencies: false, enforceExpectedSliceHash: false, verifyApprovedRoot: false, verifyArtifactEnvelope: false, verifyGitEvidence: false };
const stableSetDomain = "C14P-STAGED-SEED-STABLE-ROW-SET-V2C-SFO1-EAV1-BS1-DT1";
const semanticIdField = new Map([
  ["SOURCE_SPAN", "sourceSpanId"], ["LOCATOR", "locatorId"], ["DEPENDENCY", "dependencyId"],
  ["PHYSICAL_IDENTIFIER", "physicalIdentifierId"], ["OWNER", "ownerId"], ["ATOM", "atomId"],
  ["ATOM_OCCURRENCE", "occurrenceId"], ["DECISION_OUTCOME", "decisionOutcomeId"],
]);

function mutate(rowId, change, { rehash = true } = {}) {
  const rows = parse();
  const row = rows.find((candidate) => candidate.rowId === rowId);
  change(row, rows);
  if (rehash) row.rowSha256 = hashRow(row);
  return serializeRows(rows);
}

function mutateRows(change) {
  const rows = parse();
  change(rows);
  for (const row of rows) row.rowSha256 = hashRow(row);
  return serializeRows(rows);
}

function rehashRows(rows) {
  for (const seed of rows.filter((row) => row.kind === "SEED_SOURCE")) {
    for (const output of seed.expectedOutputs) {
      const core = { cardinality: output.cardinality, kind: output.kind, mode: output.mode, stableRowIds: output.stableRowIds };
      output.stableRowSetSha256 = domainHash(stableSetDomain, canonicalLine(core));
    }
  }
  for (const row of rows) row.rowSha256 = hashRow(row);
  return serializeRows(rows);
}

function coordinatedStableIdentitySwap(pairs, { moveRows = false } = {}) {
  const originalRows = parse();
  const originalById = new Map(originalRows.map((row) => [row.rowId, structuredClone(row)]));
  const replacements = new Map(pairs.flatMap(([left, right]) => [[left, right], [right, left]]));
  const replace = (value) => {
    if (typeof value === "string") return replacements.get(value) ?? value;
    if (Array.isArray(value)) return value.map(replace);
    if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, replace(entry)]));
    return value;
  };
  const rows = originalRows.map(replace);
  for (const [left, right] of pairs) {
    const leftIndex = originalRows.findIndex((row) => row.rowId === left);
    const rightIndex = originalRows.findIndex((row) => row.rowId === right);
    const leftOriginal = originalById.get(left);
    const rightOriginal = originalById.get(right);
    rows[leftIndex].ordinal = rightOriginal.ordinal;
    rows[rightIndex].ordinal = leftOriginal.ordinal;
    const field = semanticIdField.get(leftOriginal.kind);
    if (field) {
      rows[leftIndex][field] = rightOriginal[field];
      rows[rightIndex][field] = leftOriginal[field];
    }
    if (moveRows) [rows[leftIndex], rows[rightIndex]] = [rows[rightIndex], rows[leftIndex]];
  }
  return rehashRows(rows);
}

function mutateAllocation(change) {
  const rows = parse();
  change(rows);
  return rehashRows(rows);
}

function swapSeedEmissions(rows, kind, leftId, rightId, { rewriteInverse = false } = {}) {
  const seeds = rows.filter((row) => row.kind === "SEED_SOURCE");
  const leftSeed = seeds.find((seed) => seed.expectedOutputs.find((output) => output.kind === kind)?.stableRowIds.includes(leftId));
  const rightSeed = seeds.find((seed) => seed.expectedOutputs.find((output) => output.kind === kind)?.stableRowIds.includes(rightId));
  const leftOutput = leftSeed.expectedOutputs.find((output) => output.kind === kind);
  const rightOutput = rightSeed.expectedOutputs.find((output) => output.kind === kind);
  const leftIndex = leftOutput.stableRowIds.indexOf(leftId);
  const rightIndex = rightOutput.stableRowIds.indexOf(rightId);
  leftOutput.stableRowIds[leftIndex] = rightId;
  rightOutput.stableRowIds[rightIndex] = leftId;
  if (rewriteInverse) {
    rows.find((row) => row.rowId === leftId).seedSourceRowIds = [rightSeed.rowId];
    rows.find((row) => row.rowId === rightId).seedSourceRowIds = [leftSeed.rowId];
  }
}

function mutateC13(change) {
  const evidence = JSON.parse(c13Evidence);
  change(evidence);
  return canonicalLine(evidence);
}

function fails(bytes, fragment) {
  const result = validateDiagnostic({ ...semanticOptions, rowsBytes: bytes });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes(fragment)), `${fragment}: ${result.errors.join(" | ")}`);
}

function failsWithOptions(options, fragment) {
  const result = validateDiagnostic({ ...semanticOptions, ...options });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes(fragment)), `${fragment}: ${result.errors.join(" | ")}`);
}

test("positive exact diagnostic", () => assert.equal(validateDiagnostic().ok, true));
test("rejects target substitution", () => fails(mutate("C14P2-CX02-DEPENDENCY-0001", (row) => { row.targetObjectRowId = "C14P2-CX02-OBJECT-0005"; }), "target substitution"));
test("rejects wrong physical relation", () => fails(mutate("C14P2-CX02-DEPENDENCY-0005", (row) => { row.targetPhysicalIdentifierRowId = "C14P2-CX02-PHYSICAL_IDENTIFIER-0003"; }), "target substitution"));
test("rejects wrong physical class", () => fails(mutate("C14P2-CX02-PHYSICAL_IDENTIFIER-0001", (row) => { row.identifierClass = "COLUMN"; }), "physical relation class"));
test("rejects wrong owner", () => fails(mutate("C14P2-CX02-DEPENDENCY-0005", (row) => { row.targetOwnerRowId = "C14P2-CX02-OWNER-0002"; }), "physical owner singleton"));
test("rejects wrong tenant", () => fails(mutate("C14P2-CX02-DEPENDENCY-0005", (row) => { row.tenantScope = "GLOBAL"; }), "tenant scope"));
test("rejects wrong CX", () => fails(mutate("C14P2-CX02-DEPENDENCY-0005", (row) => { row.cx = "CX03"; }), "dependency CX"));
test("rejects invalid kind x target", () => fails(mutate("C14P2-CX02-DEPENDENCY-0001", (row) => { row.dependencyKind = "READS"; }), "kind x target matrix"));
test("rejects duplicate edge", () => fails(mutate("C14P2-CX02-DEPENDENCY-0002", (row) => { row.sourceObjectRowId = "C14P2-CX02-OBJECT-0008"; row.targetObjectRowId = "C14P2-CX02-OBJECT-0004"; }), "D9 duplicate edge"));
test("rejects reordered spans", () => fails(mutate("C14P2-CX02-DEPENDENCY-0005", (row) => { row.sourceSpanRowIds.reverse(); }), "source span order"));
test("rejects duplicate spans", () => fails(mutate("C14P2-CX02-DEPENDENCY-0005", (row) => { row.sourceSpanRowIds[1] = row.sourceSpanRowIds[0]; }), "source span duplicate"));
test("rejects dependency alias", () => fails(mutate("C14P2-CX02-DEPENDENCY-0001", (row) => { row.dependencyKind = "CALLS"; }), "dependency alias"));
test("rejects target alias", () => fails(mutate("C14P2-CX02-DEPENDENCY-0005", (row) => { row.targetKind = "RELATION"; }), "target alias"));
test("rejects alias-only physical evidence", () => {
  const fragmentBytes = Buffer.from(coherenceFragment.toString("utf8").replace('"public"."StockLotObservation"', '"alias_"."StockLotObservation"'));
  const result = validateDiagnostic({ ...semanticOptions, fragmentBytes, rowsBytes: original });
  assert.ok(result.errors.some((error) => error.includes("target substitution/evidence")));
});
test("rejects cross-company evidence", () => {
  const fragmentBytes = Buffer.from(coherenceFragment.toString("utf8").replace('"leftObservation"."companyId" = NEW."companyId"', '"leftObservation"."companyId" = OLD."companyId"'));
  const result = validateDiagnostic({ ...semanticOptions, fragmentBytes, rowsBytes: original });
  assert.ok(result.errors.some((error) => error.includes("company evidence")));
});
test("rejects stale domain", () => fails(mutate("C14P2-CX02-OBJECT-0001", (row) => { row.schemaVersion = "C14P-ROW-V2C-STAGED-SFO1-EAV1-BS1-TEI1-PCA1"; }), "stale schema domain"));
test("rejects stale row hash", () => fails(mutate("C14P2-CX02-OBJECT-0001", (row) => { row.ordinal = 99; }, { rehash: false }), "row hash"));
test("rejects missing row", () => { const rows = parse(); rows.pop(); fails(serializeRows(rows), "row count"); });
test("rejects extra row", () => { const rows = parse(); const extra = structuredClone(rows.at(-1)); extra.rowId = "C14P2-CX02-ERROR-9999"; extra.rowSha256 = hashRow(extra); rows.push(extra); fails(serializeRows(rows), "row count"); });
test("rejects physical column injection", () => fails(mutate("C14P2-CX02-DEPENDENCY-0005", (row) => { row.targetPhysicalColumnRowId = "C14P2-CX02-PHYSICAL_IDENTIFIER-0004"; }), "physical/unknown column injection"));
test("rejects repeated READ occurrence omission after full rehash", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-DEPENDENCY-0005").sourceSpanRowIds.splice(1, 1); }), "complete reference occurrence equality"));
test("rejects PHYSICAL_IDENTIFIER provenance wrong-kind after full rehash", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-PHYSICAL_IDENTIFIER-0001").provenanceRowId = "C14P2-CX02-OBJECT-0001"; }), "FK kind"));
test("rejects fake relation OBJECT substitution", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-PHYSICAL_IDENTIFIER-0001").kind = "OBJECT"; }), "target FK/CX"));
test("rejects missing occurrence locator source reference", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-LOCATOR-0033").sourceSpanRowIds = []; }), "complete occurrence locator"));
test("rejects wrong C13 locator", () => {
  const result = validateDiagnostic({ ...semanticOptions, c13EvidenceBytes: mutateC13((evidence) => { evidence.relations[0].locatorId = "C13-SCHEMA-MODEL-WRONG"; }), rowsBytes: original });
  assert.ok(result.errors.some((error) => error.includes("C13 locator")));
});
test("rejects wrong C13 schema blob", () => {
  const result = validateDiagnostic({ ...semanticOptions, c13EvidenceBytes: mutateC13((evidence) => { evidence.git.schemaBlob = "0000000000000000000000000000000000000000"; }), rowsBytes: original });
  assert.ok(result.errors.some((error) => error.includes("C13 schema blob")));
});
test("rejects wrong C13 schema path", () => {
  const result = validateDiagnostic({ ...semanticOptions, c13EvidenceBytes: mutateC13((evidence) => { evidence.git.path = "prisma/wrong.prisma"; }), rowsBytes: original });
  assert.ok(result.errors.some((error) => error.includes("C13 schema path")));
});
test("rejects incomplete OWNER provenance after full rehash", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-OWNER-0001").provenanceRowId = "C14P2-CX02-OBJECT-0001"; }), "C13 owner provenance"));
test("rejects extra unreferenced dependency evidence", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-DEPENDENCY-0005").sourceSpanRowIds.push("C14P2-CX02-SOURCE_SPAN-0051"); }), "complete reference occurrence equality"));
test("rejects incomplete external provenance chain", () => fails(mutateRows((rows) => { rows.find((row) => row.kind === "PROVENANCE").evidenceRowIds.pop(); }), "external evidence chain"));
test("rejects EXECUTES raw span hash bypass after full rehash", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-SOURCE_SPAN-0008").rawSha256 = "0".repeat(64); }), "source span raw hash"));
test("rejects EXECUTES locator source-fragment hash bypass after full rehash", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-LOCATOR-0008").sourceFragment.fragmentSha256 = "0".repeat(64); }), "occurrence locator source fragment"));
test("rejects occurrence LF hash mutation after full rehash", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-SOURCE_SPAN-0008").lfTerminatedSha256 = "0".repeat(64); }), "source span LF hash"));
test("rejects READS normalized hash mutation after full rehash", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-SOURCE_SPAN-0049").normalizedSha256 = "0".repeat(64); }), "source span normalized hash"));
test("rejects occurrence coordinate mutation after full rehash", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-SOURCE_SPAN-0008").endLine = 4; }), "source span coordinates"));
test("rejects occurrence span offset mutation after full rehash", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-SOURCE_SPAN-0008").startByte = 1; }), "exact EXECUTES source span"));
test("rejects occurrence locator path mutation after full rehash", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-LOCATOR-0008").sourceFragment.fragmentPath = "fragments/CX02/0011.sqlfrag"; }), "occurrence locator source fragment"));
test("rejects occurrence locator length mutation after full rehash", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-LOCATOR-0008").sourceFragment.byteLength = 175; }), "occurrence locator source fragment"));
test("rejects occurrence locator span length mutation after full rehash", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-LOCATOR-0008").fragmentByteLength = 158; }), "occurrence locator fragment bytes"));
test("rejects occurrence locator span hash mutation after full rehash", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-LOCATOR-0008").fragmentSha256 = "0".repeat(64); }), "occurrence locator fragment bytes"));
test("rejects occurrence object fragment path mutation after full rehash", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-OBJECT-0008").fragmentPath = "fragments/CX02/0011.sqlfrag"; }), "approved occurrence object fragment path"));
test("rejects occurrence object identity mutation after full rehash", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-OBJECT-0008").declarationSpanRowId = "C14P2-CX02-SOURCE_SPAN-0011"; }), "EXECUTES containing identity"));
test("rejects occurrence locator relationship mutation after full rehash", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-LOCATOR-0008").subjectRowIds = ["C14P2-CX02-OBJECT-0011"]; }), "EXECUTES containing identity"));
test("rejects approved occurrence leaf swap", () => failsWithOptions({ fragmentBytesByPath: { "08-trigger-trg-stock-lot-append-only.sqlfrag": trigger11Fragment }, rowsBytes: original }, "approved occurrence leaf hash"));
test("rejects same-length approved occurrence substitution", () => {
  const replacement = Buffer.from(trigger08Fragment);
  replacement[20] ^= 1;
  failsWithOptions({ fragmentBytesByPath: { "08-trigger-trg-stock-lot-append-only.sqlfrag": replacement }, rowsBytes: original }, "approved occurrence leaf hash");
});
test("rejects malformed stable rowId grammar after full rehash", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-ERROR-0007").rowId = "C14P2-CX02-ERROR-007"; }), "stable rowId grammar"));
test("rejects row kind that disagrees with stable rowId after full rehash", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-SOURCE_SPAN-0008").kind = "LOCATOR"; }), "stable rowId kind"));
test("rejects semantic ID that disagrees with derived ordinal after full rehash", () => fails(mutateRows((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-ATOM_OCCURRENCE-0018").occurrenceId = "C14PO-CX02-0019"; }), "derived semantic identity"));
test("rejects global CJL1 row reorder with unchanged row hashes", () => fails(mutateRows((rows) => { [rows[1], rows[2]] = [rows[2], rows[1]]; }), "global CJL1 canonical row order"));
test("rejects coordinated SOURCE_SPAN stable identity swap after full rehash", () => fails(coordinatedStableIdentitySwap([["C14P2-CX02-SOURCE_SPAN-0008", "C14P2-CX02-SOURCE_SPAN-0009"]]), "derived stable identity"));
test("rejects coordinated LOCATOR stable identity swap after full rehash", () => fails(coordinatedStableIdentitySwap([["C14P2-CX02-LOCATOR-0008", "C14P2-CX02-LOCATOR-0009"]]), "derived stable identity"));
test("rejects coordinated DEPENDENCY stable identity swap after full rehash", () => fails(coordinatedStableIdentitySwap([["C14P2-CX02-DEPENDENCY-0001", "C14P2-CX02-DEPENDENCY-0002"]]), "derived stable identity"));
test("rejects coordinated PHYSICAL_IDENTIFIER stable identity swap after full rehash", () => fails(coordinatedStableIdentitySwap([["C14P2-CX02-PHYSICAL_IDENTIFIER-0001", "C14P2-CX02-PHYSICAL_IDENTIFIER-0003"]]), "derived stable identity"));
test("rejects coordinated OWNER stable identity swap after full rehash", () => fails(coordinatedStableIdentitySwap([["C14P2-CX02-OWNER-0001", "C14P2-CX02-OWNER-0003"]]), "derived stable identity"));
test("rejects coordinated ATOM and OCCURRENCE stable identity swaps after full rehash", () => fails(coordinatedStableIdentitySwap([["C14P2-CX02-ATOM-0018", "C14P2-CX02-ATOM-0019"], ["C14P2-CX02-ATOM_OCCURRENCE-0018", "C14P2-CX02-ATOM_OCCURRENCE-0019"]]), "derived stable identity"));
test("rejects coordinated decision identity and reference swap after full rehash", () => fails(coordinatedStableIdentitySwap([["C14P2-CX02-DECISION_OUTCOME-0001", "C14P2-CX02-DECISION_OUTCOME-0002"]]), "derived stable identity"));
test("rejects full identity-bundle payload swap even when row IDs return to canonical line positions", () => fails(coordinatedStableIdentitySwap([["C14P2-CX02-SOURCE_SPAN-0008", "C14P2-CX02-SOURCE_SPAN-0009"]], { moveRows: true }), "immutable source identity"));

const allocationSwapCases = [
  ["OBJECT", "C14P2-CX02-OBJECT-0001", "C14P2-CX02-OBJECT-0002"],
  ["OBJECT_INVENTORY", "C14P2-CX02-OBJECT_INVENTORY-0001", "C14P2-CX02-OBJECT_INVENTORY-0002"],
  ["BODY", "C14P2-CX02-BODY-0001", "C14P2-CX02-BODY-0002"],
  ["SOURCE_SPAN", "C14P2-CX02-SOURCE_SPAN-0015", "C14P2-CX02-SOURCE_SPAN-0016"],
  ["ATOM", "C14P2-CX02-ATOM-0001", "C14P2-CX02-ATOM-0006"],
  ["BRANCH", "C14P2-CX02-BRANCH-0001", "C14P2-CX02-BRANCH-0002"],
  ["DEPENDENCY", "C14P2-CX02-DEPENDENCY-0001", "C14P2-CX02-DEPENDENCY-0002"],
  ["EVENT", "C14P2-CX02-EVENT-0001", "C14P2-CX02-EVENT-0003"],
  ["ERROR", "C14P2-CX02-ERROR-0001", "C14P2-CX02-ERROR-0002"],
  ["LOCATOR", "C14P2-CX02-LOCATOR-0001", "C14P2-CX02-LOCATOR-0002"],
  ["OWNER", "C14P2-CX02-OWNER-0001", "C14P2-CX02-OWNER-0002"],
  ["ATTACHMENT", "C14P2-CX02-ATTACHMENT-0001", "C14P2-CX02-ATTACHMENT-0002"],
  ["PHYSICAL_IDENTIFIER", "C14P2-CX02-PHYSICAL_IDENTIFIER-0012", "C14P2-CX02-PHYSICAL_IDENTIFIER-0013"],
];
for (const [kind, leftId, rightId] of allocationSwapCases) {
  test(`rejects coordinated ${kind} seed allocation swap after full rehash`, () => fails(mutateAllocation((rows) => { swapSeedEmissions(rows, kind, leftId, rightId); }), "approved seed partition"));
}
test("rejects wrong inverse seed membership after full rehash", () => fails(mutateAllocation((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-OBJECT-0001").seedSourceRowIds = ["C14P2-CX02-SEED_SOURCE-0002"]; }), "inverse seed membership"));
test("rejects missing inverse seed membership after full rehash", () => fails(mutateAllocation((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-OBJECT-0001").seedSourceRowIds = []; }), "inverse seed membership"));
test("rejects extra inverse seed membership after full rehash", () => fails(mutateAllocation((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-OBJECT-0001").seedSourceRowIds.push("C14P2-CX02-SEED_SOURCE-0002"); }), "inverse seed membership"));
test("rejects duplicate inverse seed membership after full rehash", () => fails(mutateAllocation((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-OBJECT-0001").seedSourceRowIds.push("C14P2-CX02-SEED_SOURCE-0001"); }), "inverse seed membership"));
test("rejects missing immutable emission after full rehash", () => fails(mutateAllocation((rows) => { const output = rows.find((row) => row.rowId === "C14P2-CX02-SEED_SOURCE-0008").expectedOutputs.find((entry) => entry.kind === "EVENT"); output.stableRowIds.pop(); output.cardinality -= 1; }), "complete seed emission"));
test("rejects duplicate kind-only emission substitution after full rehash", () => fails(mutateAllocation((rows) => { const output = rows.find((row) => row.rowId === "C14P2-CX02-SEED_SOURCE-0008").expectedOutputs.find((entry) => entry.kind === "EVENT"); output.stableRowIds[0] = output.stableRowIds[1]; }), "seed output cardinality/unique"));
test("rejects coordinated output and inverse cross-object swap after full rehash", () => fails(mutateAllocation((rows) => { swapSeedEmissions(rows, "OBJECT", "C14P2-CX02-OBJECT-0001", "C14P2-CX02-OBJECT-0002", { rewriteInverse: true }); }), "approved seed partition"));
test("rejects wrong approved seed source decision after full rehash", () => fails(mutateAllocation((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-SEED_SOURCE-0001").sourceDecisionId = "CX02-R99"; }), "approved seed decision/class"));
test("rejects wrong approved seed owner after full rehash", () => fails(mutateAllocation((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-SEED_SOURCE-0001").expectedOwnerRowId = "C14P2-CX02-OWNER-0002"; }), "approved seed owner"));
test("rejects incomplete approved seed evidence after full rehash", () => fails(mutateAllocation((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-SEED_SOURCE-0001").evidenceRowIds.pop(); }), "approved seed evidence"));
test("rejects wrong approved seed source semantics after full rehash", () => fails(mutateAllocation((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-SEED_SOURCE-0001").sourceSemanticStatement = "wrong"; }), "approved seed source semantics"));

function buildReferenceMutation(field) {
  const rows = parse();
  const targetKind = FK_KINDS.get(field);
  const targets = targetKind ? rows.filter((row) => row.kind === targetKind).map((row) => row.rowId) : [];
  for (const source of rows.filter((row) => Object.hasOwn(row, field))) {
    const value = source[field];
    if (Array.isArray(value)) {
      if (value.length > 0 && targetKind) {
        const alternative = targets.find((id) => !value.includes(id));
        if (alternative) return (candidateRows) => { candidateRows.find((row) => row.rowId === source.rowId)[field][0] = alternative; };
      }
      if (value.length > 1) return (candidateRows) => { candidateRows.find((row) => row.rowId === source.rowId)[field].reverse(); };
      if (value.length === 1) return (candidateRows) => { candidateRows.find((row) => row.rowId === source.rowId)[field] = []; };
      if (targets.length > 0) return (candidateRows) => { candidateRows.find((row) => row.rowId === source.rowId)[field] = [targets[0]]; };
    } else if (value !== null && targetKind) {
      const alternative = targets.find((id) => id !== value);
      if (alternative) return (candidateRows) => { candidateRows.find((row) => row.rowId === source.rowId)[field] = alternative; };
      return (candidateRows) => { candidateRows.find((row) => row.rowId === source.rowId)[field] = null; };
    } else if (value === null && targets.length > 0) {
      return (candidateRows) => { candidateRows.find((row) => row.rowId === source.rowId)[field] = targets[0]; };
    }
  }
  return null;
}

const graphReferenceFields = [...new Set([...FK_KINDS.keys(), "authorityEvidenceRowIds", "evidenceRowIds", "subjectRowIds"])].sort();
const systematicGraphMutations = [];
const systematicGraphExceptions = [];
for (const field of graphReferenceFields) {
  const mutateField = buildReferenceMutation(field);
  if (mutateField) systematicGraphMutations.push({ field, mutate: mutateField });
  else systematicGraphExceptions.push(field);
}
for (const { field, mutate: mutateField } of systematicGraphMutations) {
  test(`systematic same-kind graph reference mutation rejects: ${field}`, () => fails(mutateAllocation(mutateField), "immutable object graph reference"));
}

const compatibleObjectGroups = [[1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11]];
const pairwiseObjectFields = ["inventoryRowId", "ownerRowId", "physicalIdentifierRowId", "attachmentRowId", "bodyRowId", "declarationSpanRowId", "locatorRowIds", "seedSourceRowIds"];
const pairwiseObjectMutations = [];
const pairwiseObjectExceptions = [];
for (const group of compatibleObjectGroups) {
  for (let leftIndex = 0; leftIndex < group.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < group.length; rightIndex += 1) {
      const leftOrdinal = group[leftIndex];
      const rightOrdinal = group[rightIndex];
      const originalRows = parse();
      const left = originalRows.find((row) => row.rowId === `C14P2-CX02-OBJECT-${String(leftOrdinal).padStart(4, "0")}`);
      const right = originalRows.find((row) => row.rowId === `C14P2-CX02-OBJECT-${String(rightOrdinal).padStart(4, "0")}`);
      for (const field of pairwiseObjectFields) {
        if (canonicalLine(left[field]).equals(canonicalLine(right[field]))) {
          pairwiseObjectExceptions.push(`${leftOrdinal}/${rightOrdinal}:${field}:identical`);
          continue;
        }
        pairwiseObjectMutations.push({ field, leftId: left.rowId, leftOrdinal, rightId: right.rowId, rightOrdinal });
      }
    }
  }
}
for (const mutation of pairwiseObjectMutations) {
  test(`pairwise compatible object graph swap rejects: ${mutation.leftOrdinal}/${mutation.rightOrdinal}:${mutation.field}`, () => fails(mutateAllocation((rows) => {
    const left = rows.find((row) => row.rowId === mutation.leftId);
    const right = rows.find((row) => row.rowId === mutation.rightId);
    [left[mutation.field], right[mutation.field]] = [right[mutation.field], left[mutation.field]];
  }), "immutable object graph reference"));
}
test(`systematic graph mutation coverage: ${systematicGraphMutations.length} FK fields + ${pairwiseObjectMutations.length} pairwise swaps = ${systematicGraphMutations.length + pairwiseObjectMutations.length} mutations; ${systematicGraphExceptions.length + pairwiseObjectExceptions.length} explicit exceptions`, () => {
  assert.ok(systematicGraphMutations.length > 0 && pairwiseObjectMutations.length > 0);
  assert.ok(systematicGraphExceptions.every((field) => graphReferenceFields.includes(field)));
  assert.ok(pairwiseObjectExceptions.every((entry) => entry.endsWith(":identical")));
});
test("rejects orphaned object inventory graph node after full rehash", () => fails(mutateAllocation((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-OBJECT-0001").inventoryRowId = "C14P2-CX02-OBJECT_INVENTORY-0002"; }), "object/inventory bijection"));
test("rejects dual object inventory allocation after full rehash", () => fails(mutateAllocation((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-OBJECT-0002").inventoryRowId = "C14P2-CX02-OBJECT_INVENTORY-0001"; }), "object graph unique inventory"));
test("rejects missing function body graph node after full rehash", () => fails(mutateAllocation((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-OBJECT-0004").bodyRowId = null; }), "function body bijection"));
test("rejects duplicate declaration locator graph node after full rehash", () => fails(mutateAllocation((rows) => { rows.find((row) => row.rowId === "C14P2-CX02-OBJECT-0001").locatorRowIds.push("C14P2-CX02-LOCATOR-0002"); }), "object declaration locator"));
