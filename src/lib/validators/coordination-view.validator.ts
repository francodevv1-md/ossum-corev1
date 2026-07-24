import { badRequest } from "../api/errors";

export type CoordinationViewRequest =
  | { mode: "production"; surface: "personal" | "global" }
  | { mode: "dev-preview"; surface: "global" }
  | { mode: "dev-preview"; surface: "personal"; subjectContactId: string };

function invalid(): never {
  throw badRequest(
    "Solicitud de vista de Coordinación inválida",
    "invalid_coordination_view_request"
  );
}

export function validateCoordinationViewRequest(
  searchParams: URLSearchParams
): CoordinationViewRequest {
  const allowed = new Set(["surface", "preview", "subjectContactId"]);
  for (const key of searchParams.keys()) {
    if (!allowed.has(key)) invalid();
  }

  const surfaces = searchParams.getAll("surface");
  const previews = searchParams.getAll("preview");
  const subjects = searchParams.getAll("subjectContactId");
  if (surfaces.length !== 1 || previews.length > 1 || subjects.length > 1) invalid();

  const surface = surfaces[0];
  if (surface !== "personal" && surface !== "global") invalid();

  const preview = previews.length === 1;
  if (preview && previews[0] !== "true") invalid();

  if (!preview) {
    if (subjects.length !== 0) invalid();
    return { mode: "production", surface };
  }

  if (surface === "global") {
    if (subjects.length !== 0) invalid();
    return { mode: "dev-preview", surface };
  }

  const subjectContactId = subjects[0]?.trim();
  if (!subjectContactId) invalid();
  return { mode: "dev-preview", surface, subjectContactId };
}
