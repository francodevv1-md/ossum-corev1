import {
  type StockArticleType,
  type StockControl,
  type StockItem,
} from "@/data/stock-mock"

const STOCK_ARTICLE_TYPES = new Set<StockArticleType>(["Implante", "Instrumental", "Equipo", "Descartable", "Insumo", "Otro"])

type CanonicalIdentifier = {
  type: string
  value: string
}

type CanonicalTracePolicy = {
  minimumRequirement?: string
  expirationRequired?: boolean
}

type CanonicalSupplier = {
  supplierCode: string
  supplier?: {
    legalName?: string | null
    firstName?: string | null
    lastName?: string | null
  }
}

type CanonicalStock = {
  physical?: number | string
  reserved?: number | string
  available?: number | string
  inTransit?: number | string
}

type CanonicalPosition = {
  id: string
  deposit: string
  location: string
  lot: string
  serial: string
  expiry: string
  available: number | string
  reserved?: number | string
}

type CanonicalMovement = {
  id: string
  date: string
  type: string
  qty: number | string
  user: string
  ref: string
}

export type CanonicalArticle = {
  id: string
  sku: string
  description: string
  articleType?: string | null
  brand?: string | null
  manufacturer?: string | null
  family?: string | null
  categoryId?: string | null
  clinicalFamilyId?: string | null
  brandId?: string | null
  manufacturerId?: string | null
  productLineId?: string | null
  category?: { id: string; name: string } | null
  clinicalFamily?: { id: string; name: string } | null
  brandCatalog?: { id: string; name: string } | null
  manufacturerCatalog?: { id: string; name: string } | null
  productLine?: { id: string; name: string } | null
  unit: string
  modelVariant?: string | null
  isActive?: boolean
  identifiers?: CanonicalIdentifier[]
  tracePolicies?: CanonicalTracePolicy[]
  supplierMappings?: CanonicalSupplier[]
  stock?: CanonicalStock
  positions?: CanonicalPosition[]
  movements?: CanonicalMovement[]
}

function toArticleType(raw?: string | null): StockArticleType {
  const value = raw?.trim()
  return value && STOCK_ARTICLE_TYPES.has(value as StockArticleType) ? (value as StockArticleType) : "Otro"
}

function toControl(policy?: CanonicalTracePolicy): StockControl {
  const requirement = policy?.minimumRequirement?.trim() ?? "NONE"
  const expiry = Boolean(policy?.expirationRequired)

  if (requirement === "LOT") return expiry ? "lote-vencimiento" : "lote"
  if (requirement === "SERIAL") return expiry ? "serie-vencimiento" : "serie"
  if (requirement === "LOT_OR_SERIAL") return expiry ? "lote-vencimiento" : "lote"
  if (requirement === "LOT_AND_SERIAL") return expiry ? "serie-vencimiento" : "serie"

  return "cantidad"
}

function supplierName(supplier?: CanonicalSupplier["supplier"]) {
  const legal = supplier?.legalName?.trim()
  if (legal) return legal
  const first = supplier?.firstName?.trim()
  const last = supplier?.lastName?.trim()
  const full = `${first ?? ""} ${last ?? ""}`.trim()
  return full || ""
}

function quantity(value?: number | string) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function mapCanonicalArticleToStockItem(article: CanonicalArticle): StockItem {
  const identifiers = article.identifiers ?? []
  const policy = article.tracePolicies?.[0]

  const ean = identifiers.find((item) => item.type === "GTIN_EAN")?.value?.trim() || ""
  const manufacturerCode = identifiers.find((item) => item.type === "MANUFACTURER_REF")?.value?.trim() || ""
  const importCode = identifiers.find((item) => item.type === "ALTERNATIVE_CODE")?.value?.trim() || ""
  const extraCodes = identifiers
    .filter((item) => !["GTIN_EAN", "MANUFACTURER_REF", "ALTERNATIVE_CODE"].includes(item.type))
    .map((item) => item.value?.trim())
    .filter(Boolean) as string[]

  const suppliers = (article.supplierMappings ?? []).map((supplier) => ({
    supplier: supplierName(supplier.supplier),
    code: supplier.supplierCode,
    description: supplier.supplierCode,
  }));

  const articleType = toArticleType(article.articleType)
  const physical = quantity(article.stock?.physical)
  const reserved = quantity(article.stock?.reserved)
  const available = quantity(article.stock?.available)
  const inTransit = quantity(article.stock?.inTransit)
  const lots = (article.positions ?? []).map((position) => {
    const expiry = position.expiry || ""
    const expired = expiry && expiry < new Date().toISOString().slice(0, 10)
    return {
      id: position.id,
      deposit: position.deposit,
      location: position.location,
      lot: position.lot,
      serial: position.serial,
      expiry,
      available: quantity(position.available),
      status: expired ? "Vencido" as const : quantity(position.available) === 0 && quantity(position.reserved) > 0 ? "Reservado" as const : "Disponible" as const,
    }
  })
  const movements = (article.movements ?? []).map((movement) => ({ ...movement, qty: quantity(movement.qty) }))

  return {
    id: article.id,
    code: article.sku || article.id,
    name: article.description,
    descriptionExtra: article.modelVariant || "",
    family: article.clinicalFamily?.name || article.family || "",
    category: article.category?.name || "",
    rubro: "",
    seccion: "",
    linea: article.productLine?.name || "",
    brand: article.brandCatalog?.name || article.brand || "",
    type: articleType,
    unit: article.unit || "u",
    unitBuy: article.unit || "u",
    manufacturer: article.manufacturerCatalog?.name || article.manufacturer || "",
    gtin: ean,
    pm: importCode,
    sterile: false,
    preferredSupplier: suppliers[0]?.supplier ?? "",
    cost: 0,
    price: 0,
    available,
    reserved,
    inTransit,
    min: 0,
    state: available > 0 ? "Disponible" : physical > 0 || reserved > 0 ? "Reservado" : "Pendiente",
    masterStatus: article.isActive === false ? "Inactivo" : "Activo",
    control: toControl(policy),
    lots,
    movements,
    articleType,
    shortDesc: article.modelVariant || undefined,
    ean: ean || undefined,
    manufacturerCode: manufacturerCode || undefined,
    importCode: importCode || undefined,
    altCodes: extraCodes.length ? extraCodes : undefined,
    supplierCode: suppliers[0]?.code || "",
    lastSupplier: suppliers[0]?.supplier || "",
    suppliers,
  }
}
