import { apiFetch } from "./client";

export interface BoxFormulaSummary {
  id: string;
  companyId: string;
  boxArticleId: string;
  boxSku: string | null;
  boxDescription: string | null;
  boxUnit: string;
  currentVersionNumber: number;
  currentVersionId: string | null;
  totalVersionsCount: number;
  linesCount: number;
  lastAcceptedAt: string;
  lastAcceptedByName: string | null;
  lastCause: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoxFormulaLineDetail {
  id: string;
  lineNumber: number;
  articleId: string;
  sku: string | null;
  description: string | null;
  expectedQuantity: number;
  unit: string;
}

export interface BoxFormulaVersionDetail {
  id: string;
  versionNumber: number;
  previousVersionId: string | null;
  acceptedAt: string;
  acceptedById: string;
  acceptedByName: string | null;
  cause: string | null;
  lineCount: number;
  lines: BoxFormulaLineDetail[];
}

export interface BoxFormulaDetail {
  id: string;
  companyId: string;
  boxArticleId: string;
  boxSku: string | null;
  boxDescription: string | null;
  boxUnit: string;
  nextVersion: number;
  currentVersion: {
    id: string;
    versionNumber: number;
    acceptedAt: string;
    acceptedById: string;
    acceptedByName: string | null;
    cause: string | null;
    lines: BoxFormulaLineDetail[];
  } | null;
  versions: BoxFormulaVersionDetail[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBoxFormulaInput {
  articleId: string;
  lines: Array<{
    articleId: string;
    expectedQuantity: number;
    unit?: string;
  }>;
  cause?: string | null;
}

export interface PublishBoxFormulaVersionInput {
  lines: Array<{
    articleId: string;
    expectedQuantity: number;
    unit?: string;
  }>;
  cause?: string | null;
}

export async function listBoxFormulasApi(companyId: string): Promise<BoxFormulaSummary[]> {
  return apiFetch<BoxFormulaSummary[]>(`/api/companies/${encodeURIComponent(companyId)}/cajas/formulas`);
}

export async function getBoxFormulaApi(companyId: string, formulaId: string): Promise<BoxFormulaDetail> {
  return apiFetch<BoxFormulaDetail>(
    `/api/companies/${encodeURIComponent(companyId)}/cajas/formulas/${encodeURIComponent(formulaId)}`,
  );
}

export async function createBoxFormulaApi(
  companyId: string,
  payload: CreateBoxFormulaInput,
): Promise<BoxFormulaDetail> {
  return apiFetch<BoxFormulaDetail>(`/api/companies/${encodeURIComponent(companyId)}/cajas/formulas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function publishFormulaVersionApi(
  companyId: string,
  formulaId: string,
  payload: PublishBoxFormulaVersionInput,
): Promise<BoxFormulaDetail> {
  return apiFetch<BoxFormulaDetail>(
    `/api/companies/${encodeURIComponent(companyId)}/cajas/formulas/${encodeURIComponent(formulaId)}/versions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}
