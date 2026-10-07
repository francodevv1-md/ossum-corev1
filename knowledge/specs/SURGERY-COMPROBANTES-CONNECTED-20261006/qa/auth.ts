// Isolated visual fixture only. Never mounted by the product or used for live Auth.
export function useAuth() { return { activeCompany: { id: "company-qa" } } }
export async function getAccessToken() { return "synthetic-qa-token" }
