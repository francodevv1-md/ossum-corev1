import prisma from "../../src/lib/prisma";
import { createArticle } from "../../src/lib/services/article.service";
import { createBoxFormula } from "../../src/lib/services/cajas.service";
import type { ArticleCreateInput } from "../../src/lib/validators/article";
import type { BoxFormulaCreateInput } from "../../src/lib/validators/cajas";
import {
  assertCajasDemoCompany,
  assertCajasDemoDevBoundary,
  CAJAS_DEMO_COMPANY_ID as COMPANY_ID,
  CAJAS_DEMO_COMPANY_NAME as COMPANY_NAME,
} from "./cajas-demo-boundary";


const components = [
  ["DEMO-COMP-GUIA-PERF", "Guía de perforación universal"],
  ["DEMO-COMP-BROCA-35", "Broca quirúrgica 3,5 mm"],
  ["DEMO-COMP-DEST-HEX", "Destornillador hexagonal"],
  ["DEMO-COMP-MED-PROF", "Medidor de profundidad"],
  ["DEMO-COMP-PINZA-RED", "Pinza de reducción"],
  ["DEMO-COMP-GUIA-TIB", "Guía tibial"],
  ["DEMO-COMP-GUIA-FEM", "Guía femoral"],
  ["DEMO-COMP-IMPACT", "Impactador modular"],
  ["DEMO-COMP-EXTRACT", "Extractor modular"],
  ["DEMO-COMP-CANULA", "Cánula de trabajo"],
  ["DEMO-COMP-PUNCH", "Punch quirúrgico"],
  ["DEMO-COMP-BANDEJA", "Bandeja modular"],
] as const;

type FormulaLine = [componentSku: (typeof components)[number][0], quantity: number];

const boxes: Array<{
  sku: string;
  description: string;
  brand?: string;
  family: string;
  lines: FormulaLine[];
}> = [
  {
    sku: "DEMO-LG-T00KSP",
    description: "Set LCA tornillos Kurosaka (DEMO)",
    brand: "SOUTH AMERICA IMPLAS",
    family: "Artroscopia · LCA",
    lines: [["DEMO-COMP-GUIA-TIB", 1], ["DEMO-COMP-GUIA-FEM", 1], ["DEMO-COMP-DEST-HEX", 2], ["DEMO-COMP-CANULA", 2], ["DEMO-COMP-BANDEJA", 1]],
  },
  {
    sku: "DEMO-LG-T00IFP",
    description: "Set tornillos interferenciales SAI (DEMO)",
    brand: "SOUTH AMERICA IMPLAS",
    family: "Artroscopia · LCA",
    lines: [["DEMO-COMP-GUIA-TIB", 1], ["DEMO-COMP-GUIA-FEM", 1], ["DEMO-COMP-DEST-HEX", 2], ["DEMO-COMP-MED-PROF", 1], ["DEMO-COMP-BANDEJA", 1]],
  },
  {
    sku: "DEMO-OS-T35CLU",
    description: "Osteosíntesis 3,5 titanio clavícula (DEMO)",
    family: "Trauma · Clavícula",
    lines: [["DEMO-COMP-GUIA-PERF", 2], ["DEMO-COMP-BROCA-35", 2], ["DEMO-COMP-DEST-HEX", 2], ["DEMO-COMP-MED-PROF", 1], ["DEMO-COMP-PINZA-RED", 2]],
  },
  {
    sku: "DEMO-OS-T35DTU",
    description: "Osteosíntesis 3,5 titanio DCP / tercio tubo (DEMO)",
    family: "Trauma · Osteosíntesis",
    lines: [["DEMO-COMP-GUIA-PERF", 2], ["DEMO-COMP-BROCA-35", 2], ["DEMO-COMP-DEST-HEX", 2], ["DEMO-COMP-MED-PROF", 1], ["DEMO-COMP-PINZA-RED", 1]],
  },
  {
    sku: "DEMO-RC-X00CMI",
    description: "Reemplazo total de cadera cementada instrumental (DEMO)",
    brand: "OLYMPIA",
    family: "Cadera",
    lines: [["DEMO-COMP-IMPACT", 2], ["DEMO-COMP-EXTRACT", 1], ["DEMO-COMP-MED-PROF", 1], ["DEMO-COMP-BANDEJA", 2]],
  },
  {
    sku: "DEMO-LG-T00PKP",
    description: "Set LCA tornillos PEEK (DEMO)",
    brand: "SOUTH AMERICA IMPLAS",
    family: "Artroscopia · LCA",
    lines: [["DEMO-COMP-GUIA-TIB", 1], ["DEMO-COMP-GUIA-FEM", 1], ["DEMO-COMP-CANULA", 2], ["DEMO-COMP-PUNCH", 1], ["DEMO-COMP-DEST-HEX", 2]],
  },
  {
    sku: "DEMO-LC-T00LGI",
    description: "Caja instrumental LCA ligamento (DEMO)",
    brand: "BIOPROTECE",
    family: "Artroscopia · LCA",
    lines: [["DEMO-COMP-GUIA-TIB", 1], ["DEMO-COMP-GUIA-FEM", 1], ["DEMO-COMP-CANULA", 2], ["DEMO-COMP-PUNCH", 2], ["DEMO-COMP-BANDEJA", 1]],
  },
  {
    sku: "DEMO-OS-A35XXU",
    description: "Caja osteosíntesis acero 3,5 (DEMO)",
    family: "Trauma · Osteosíntesis",
    lines: [["DEMO-COMP-GUIA-PERF", 2], ["DEMO-COMP-BROCA-35", 2], ["DEMO-COMP-DEST-HEX", 2], ["DEMO-COMP-MED-PROF", 1], ["DEMO-COMP-PINZA-RED", 2]],
  },
  {
    sku: "DEMO-TR-T35TCU",
    description: "Caja tornillo titanio 3,5 canulado (DEMO)",
    brand: "BIOPROTECE",
    family: "Trauma · Tornillos canulados",
    lines: [["DEMO-COMP-GUIA-PERF", 2], ["DEMO-COMP-BROCA-35", 2], ["DEMO-COMP-DEST-HEX", 2], ["DEMO-COMP-CANULA", 2]],
  },
  {
    sku: "DEMO-CL-T00FRI",
    description: "Instrumental clavo fémur titanio (DEMO)",
    brand: "BIOPROTECE",
    family: "Trauma · Clavos",
    lines: [["DEMO-COMP-GUIA-PERF", 2], ["DEMO-COMP-IMPACT", 1], ["DEMO-COMP-EXTRACT", 1], ["DEMO-COMP-MED-PROF", 1], ["DEMO-COMP-BANDEJA", 1]],
  },
];

async function main() {
  assertCajasDemoDevBoundary(process.env);

  const company = await prisma.company.findUnique({
    where: { id: COMPANY_ID },
    select: { id: true, name: true, isActive: true, organizationId: true, organization: { select: { slug: true, isActive: true } } },
  });
  assertCajasDemoCompany(company);

  const access = await prisma.userCompanyAccess.findFirst({
    where: { companyId: COMPANY_ID, role: "admin", isActive: true, user: { isActive: true } },
    select: { userId: true },
  });
  if (!access) throw new Error("No active DEV admin is available for audit ownership");

  const componentIds = new Map<string, string>();
  let createdComponents = 0;
  for (const [sku, description] of components) {
    const expectedDescription = `${description} (ficticio DEMO)`;
    let article = await prisma.article.findFirst({
      where: { organizationId: company.organizationId, sku },
      select: {
        id: true,
        description: true,
        articleType: true,
        brand: true,
        family: true,
        unit: true,
        isActive: true,
        tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1, select: { minimumRequirement: true, expirationRequired: true } },
        stockEligibilities: { where: { companyId: COMPANY_ID }, select: { id: true } },
      },
    });
    if (!article) {
      const input: ArticleCreateInput = {
        sku,
        description: expectedDescription,
        articleType: "Instrumental",
        brand: "DEMO",
        family: "Componente ficticio de caja",
        unit: "u",
        traceabilityRequirement: "NONE",
        expirationRequired: false,
        identifiers: [],
        supplierMappings: [],
      };
      article = await createArticle(prisma, COMPANY_ID, input, access.userId);
      createdComponents += 1;
    } else {
      const policy = article.tracePolicies[0];
      if (
        article.description !== expectedDescription || article.articleType !== "Instrumental" || article.brand !== "DEMO" ||
        article.family !== "Componente ficticio de caja" || article.unit !== "u" || !article.isActive ||
        policy?.minimumRequirement !== "NONE" || policy.expirationRequired
      ) throw new Error(`Existing component ${sku} does not match the DEMO seed definition`);
      if (article.stockEligibilities.length === 0) {
        await prisma.stockArticleEligibility.create({ data: { companyId: COMPANY_ID, organizationId: company.organizationId, articleId: article.id, version: 1 } });
      }
    }
    componentIds.set(sku, article.id);
  }

  let createdBoxes = 0;
  let skippedBoxes = 0;
  for (const box of boxes) {
    const existing = await prisma.cajasBoxFormula.findFirst({
      where: { companyId: COMPANY_ID, boxEligibility: { article: { sku: box.sku } } },
      select: {
        id: true,
        boxEligibility: { select: { article: { select: { description: true, brand: true, manufacturer: true, family: true, isActive: true } } } },
        currentVersion: { select: { lines: { select: { articleId: true, expectedQuantity: true, stockUnit: true } } } },
      },
    });
    if (existing) {
      const article = existing.boxEligibility.article;
      const lines = existing.currentVersion?.lines ?? [];
      const matchesLines = lines.length === box.lines.length && box.lines.every(([sku, quantity]) =>
        lines.some((line) => line.articleId === componentIds.get(sku) && Number(line.expectedQuantity) === quantity && line.stockUnit === "u"),
      );
      if (
        article.description !== box.description || (article.brand ?? undefined) !== box.brand ||
        article.manufacturer !== "Referencia ficticia basada en CAJAS.XLS" || article.family !== box.family || !article.isActive || !matchesLines
      ) throw new Error(`Existing formula ${box.sku} does not match the DEMO seed definition`);
      skippedBoxes += 1;
      continue;
    }

    const input: BoxFormulaCreateInput = {
      sku: box.sku,
      description: box.description,
      brand: box.brand,
      manufacturer: "Referencia ficticia basada en CAJAS.XLS",
      family: box.family,
      lines: box.lines.map(([componentSku, expectedQuantity]) => ({
        articleId: componentIds.get(componentSku)!,
        expectedQuantity,
        stockUnit: "u",
      })),
    };
    await createBoxFormula(prisma, COMPANY_ID, input, access.userId);
    createdBoxes += 1;
  }

  console.log(JSON.stringify({ createdComponents, createdBoxes, skippedBoxes, target: COMPANY_NAME }));
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
