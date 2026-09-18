export const DOCUMENTATION_MUTATION_ROLES = [
  "admin",
  "coordinador",
  "coordinator",
] as const;

export type DocumentationMutationRole =
  (typeof DOCUMENTATION_MUTATION_ROLES)[number];

export function canMutateDocumentation(role: string): role is DocumentationMutationRole {
  return DOCUMENTATION_MUTATION_ROLES.includes(role as DocumentationMutationRole);
}
