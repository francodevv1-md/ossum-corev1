export const CAJAS_DEMO_COMPANY_ID = "codevdistricorr100000000000";
export const CAJAS_DEMO_COMPANY_NAME = "Districorr DEV";
export const CAJAS_DEMO_ORGANIZATION_SLUG = "ossum-dev";
export const CAJAS_DEMO_RUN_FLAG = "OSSUM_ENABLE_CAJAS_DEMO_SEED";

const EXPECTED_DEV_PROJECT_REF = "yywqcdromnmmelijvspi";
const APPROVED_POOLER_HOST = "aws-1-sa-east-1.pooler.supabase.com";

function rejectDevBoundary(): never {
  throw new Error("Cajas DEMO seed rejected: explicit disposable DEV gate is not satisfied");
}

export function assertCajasDemoDevBoundary(env: NodeJS.ProcessEnv) {
  if (env.OSSUM_DEPLOYMENT_TIER !== "development" || env[CAJAS_DEMO_RUN_FLAG] !== "true" || env.NODE_ENV === "production") rejectDevBoundary();
  if (!env.DATABASE_URL || !env.DIRECT_URL || !env.SUPABASE_URL) rejectDevBoundary();

  let database: URL;
  let directDatabase: URL;
  let supabase: URL;
  try {
    database = new URL(env.DATABASE_URL);
    directDatabase = new URL(env.DIRECT_URL);
    supabase = new URL(env.SUPABASE_URL.replace(/\/rest\/v1\/?$/, ""));
  } catch {
    rejectDevBoundary();
  }

  const expectedSupabaseHost = `${EXPECTED_DEV_PROJECT_REF}.supabase.co`;
  const approvedDatabase = (url: URL) => {
    const username = decodeURIComponent(url.username);
    const direct = url.hostname.toLowerCase() === `db.${EXPECTED_DEV_PROJECT_REF}.supabase.co` && username === "postgres" && url.port === "5432";
    const pooler = url.hostname.toLowerCase() === APPROVED_POOLER_HOST && username === `postgres.${EXPECTED_DEV_PROJECT_REF}` && ["5432", "6543"].includes(url.port);
    return ["postgres:", "postgresql:"].includes(url.protocol) && url.password !== "" && url.pathname === "/postgres" && (direct || pooler);
  };
  if (
    supabase.protocol !== "https:" ||
    supabase.hostname.toLowerCase() !== expectedSupabaseHost ||
    supabase.username !== "" ||
    supabase.password !== "" ||
    !approvedDatabase(database) ||
    !approvedDatabase(directDatabase)
  ) rejectDevBoundary();
}

export function assertCajasDemoCompany(company: {
  name: string;
  isActive: boolean;
  organization: { slug: string; isActive: boolean };
} | null): asserts company {
  if (
    !company || company.name !== CAJAS_DEMO_COMPANY_NAME || !company.isActive ||
    company.organization.slug !== CAJAS_DEMO_ORGANIZATION_SLUG || !company.organization.isActive
  ) throw new Error("Districorr DEV target not found");
}
