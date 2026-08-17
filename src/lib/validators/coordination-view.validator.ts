import { badRequest } from "../api/errors";

type CoordinationPagination = { take?: number; skip?: number };

export type CoordinationViewRequest = (
  | { mode: "production"; surface: "personal" | "global" }
  | { mode: "dev-preview"; surface: "global" }
  | { mode: "dev-preview"; surface: "personal"; subjectContactId: string }
) & CoordinationPagination;

const DEFAULT_TAKE = 50;
const MAX_TAKE = 100;
const MAX_SKIP = 2_147_483_647;

function invalid(): never {
  throw badRequest(
    "Solicitud de vista de Coordinación inválida",
    "invalid_coordination_view_request"
  );
}

export function validateCoordinationViewRequest(
  searchParams: URLSearchParams
): CoordinationViewRequest {
  const allowed = new Set(["surface", "preview", "subjectContactId", "take", "skip"]);
  for (const key of searchParams.keys()) {
    if (!allowed.has(key)) invalid();
  }

  const surfaces = searchParams.getAll("surface");
  const previews = searchParams.getAll("preview");
  const subjects = searchParams.getAll("subjectContactId");
  const takes = searchParams.getAll("take");
  const skips = searchParams.getAll("skip");
  if (surfaces.length !== 1 || previews.length > 1 || subjects.length > 1 || takes.length > 1 || skips.length > 1) invalid();

  const take = takes.length === 0 ? DEFAULT_TAKE : Number(takes[0]);
  const skip = skips.length === 0 ? 0 : Number(skips[0]);
  if (!Number.isSafeInteger(take) || take < 1 || take > MAX_TAKE) invalid();
  if (!Number.isSafeInteger(skip) || skip < 0 || skip > MAX_SKIP) invalid();

  const surface = surfaces[0];
  if (surface !== "personal" && surface !== "global") invalid();

  const preview = previews.length === 1;
  if (preview && previews[0] !== "true") invalid();

  if (!preview) {
    if (subjects.length !== 0) invalid();
    return { mode: "production", surface, take, skip };
  }

  if (surface === "global") {
    if (subjects.length !== 0) invalid();
    return { mode: "dev-preview", surface, take, skip };
  }

  const subjectContactId = subjects[0]?.trim();
  if (!subjectContactId) invalid();
  return { mode: "dev-preview", surface, subjectContactId, take, skip };
}
