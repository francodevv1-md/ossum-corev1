export type SelectedCoordinatorAssignment = {
  id: string;
  contactId: string;
  role: string;
  isPrimary: boolean;
  createdAt: Date;
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    legalName: string | null;
    email: string | null;
    isCompany: boolean;
    isActive: boolean;
    companyLinks: Array<{
      companyId: string;
      role: string | null;
      isActive: boolean;
    }>;
  };
};

export type CoordinatorAssignmentDto = {
  assignmentId: string;
  contactId: string;
  label: string;
  isPrimary: boolean;
  createdAt: string;
};

export type CoordinatorAssignmentResolutionDto =
  | { status: "none"; resolved: null }
  | { status: "resolved"; resolved: { contactId: string; label: string } }
  | { status: "ambiguous"; resolved: null };

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function coordinatorLabel(assignment: SelectedCoordinatorAssignment): string {
  const legalName = nonEmpty(assignment.contact.legalName);
  if (legalName) return legalName;

  return [assignment.contact.firstName, assignment.contact.lastName]
    .map(nonEmpty)
    .filter((value): value is string => value !== null)
    .join(" ");
}

export function serializeEligibleCoordinatorAssignments(
  companyId: string,
  assignments: SelectedCoordinatorAssignment[]
): CoordinatorAssignmentDto[] {
  return assignments
    .filter((assignment) =>
      assignment.role === "coordinator" &&
      assignment.contact.id === assignment.contactId &&
      assignment.contact.isActive &&
      !assignment.contact.isCompany &&
      assignment.contact.companyLinks.some((link) =>
        link.companyId === companyId &&
        link.isActive &&
        link.role === "coordinator"
      )
    )
    .map((assignment) => ({
      assignmentId: assignment.id,
      contactId: assignment.contactId,
      label: coordinatorLabel(assignment),
      isPrimary: assignment.isPrimary,
      createdAt: assignment.createdAt.toISOString(),
    }))
    .sort((left, right) =>
      Number(right.isPrimary) - Number(left.isPrimary) ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.assignmentId.localeCompare(right.assignmentId)
    );
}

export function resolveCoordinatorAssignment(
  assignments: Array<Pick<CoordinatorAssignmentDto, "contactId" | "label">>,
  legacyContactId?: string | null,
  legacyLabel?: string | null
): CoordinatorAssignmentResolutionDto {
  const candidateIds = new Set<string>();

  for (const assignment of assignments) {
    const contactId = nonEmpty(assignment.contactId);
    if (contactId) candidateIds.add(contactId);
  }

  const normalizedLegacyContactId = nonEmpty(legacyContactId);
  if (normalizedLegacyContactId) candidateIds.add(normalizedLegacyContactId);

  if (candidateIds.size === 0) return { status: "none", resolved: null };
  if (candidateIds.size > 1) return { status: "ambiguous", resolved: null };

  const contactId = [...candidateIds][0];
  const relationalLabel = assignments.find(
    (assignment) => nonEmpty(assignment.contactId) === contactId && nonEmpty(assignment.label)
  )?.label;
  const label = nonEmpty(relationalLabel) ??
    (normalizedLegacyContactId === contactId ? nonEmpty(legacyLabel) : null) ??
    "";

  return { status: "resolved", resolved: { contactId, label } };
}

type SurgeryWithCoordinatorCandidates = {
  companyId: string;
  contactAssignments?: SelectedCoordinatorAssignment[];
  coordinatorContactId?: string | null;
  coordinadorContactId?: string | null;
  coordinatorLabel?: string | null;
  coordinadorCx?: string | null;
};

export function serializeSurgeryCoordinatorReadModel<
  TSurgery extends SurgeryWithCoordinatorCandidates
>(surgery: TSurgery) {
  const { contactAssignments = [], ...surgeryFields } = surgery;
  const coordinatorAssignments = serializeEligibleCoordinatorAssignments(
    surgery.companyId,
    contactAssignments
  );
  const coordinatorAssignment = resolveCoordinatorAssignment(
    coordinatorAssignments,
    surgery.coordinatorContactId ?? surgery.coordinadorContactId,
    surgery.coordinatorLabel ?? surgery.coordinadorCx
  );

  return { ...surgeryFields, coordinatorAssignments, coordinatorAssignment };
}
