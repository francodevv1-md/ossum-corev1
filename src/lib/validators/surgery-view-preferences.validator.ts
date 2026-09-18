import { badRequest } from "../api/errors";
import {
  CIRUGIAS_COLUMNS,
  CIRUGIAS_COLUMN_GROUPS,
  DEFAULT_COLUMN_WIDTHS,
  DEFAULT_FIXED_LEFT_COLUMNS,
  DEFAULT_VISIBLE_COLS,
  PINNABLE_LEFT_COLUMN_KEYS,
} from "../cirugias.constants";

export const SURGERY_VIEW_PREFERENCES_MODULE_KEY = "surgeries.view";

const GROUP_COLOR_OPTIONS = [
  { name: "Slate", className: "border-slate-200 bg-slate-50 text-slate-700" },
  { name: "Blue", className: "border-blue-200 bg-blue-50 text-blue-700" },
  { name: "Emerald", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { name: "Amber", className: "border-amber-200 bg-amber-50 text-amber-700" },
  { name: "Rose", className: "border-rose-200 bg-rose-50 text-rose-700" },
] as const;

const KNOWN_COLUMN_KEYS = CIRUGIAS_COLUMNS.map((column) => column.key);
const KNOWN_COLUMN_KEY_SET = new Set<string>(KNOWN_COLUMN_KEYS);
const PINNABLE_LEFT_COLUMN_KEY_SET = new Set<string>(PINNABLE_LEFT_COLUMN_KEYS);

export type SurgeryViewPreferenceGroup = {
  id: string;
  label: string;
  colorName: string;
  colorClassName: string;
  columns: string[];
};

export type SurgeryViewPreferences = {
  visibleCols: Record<string, boolean>;
  columnOrder: string[];
  stickyColumns: boolean;
  columnWidths: Record<string, number>;
  compactMode: boolean;
  fixedLeftColumns: string[];
  columnGroups: SurgeryViewPreferenceGroup[];
  showGroupedHeaders: boolean;
};

export type UpsertSurgeryViewPreferencesBody = {
  preferences: SurgeryViewPreferences;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildDefaultColumnGroups(): SurgeryViewPreferenceGroup[] {
  return CIRUGIAS_COLUMN_GROUPS.map((group, index) => ({
    id: group.key,
    label: group.label,
    colorName: GROUP_COLOR_OPTIONS[index % GROUP_COLOR_OPTIONS.length].name,
    colorClassName: GROUP_COLOR_OPTIONS[index % GROUP_COLOR_OPTIONS.length].className,
    columns: [...group.columns],
  }));
}

export function buildDefaultSurgeryViewPreferences(): SurgeryViewPreferences {
  return {
    visibleCols: { ...DEFAULT_VISIBLE_COLS },
    columnOrder: [...KNOWN_COLUMN_KEYS],
    stickyColumns: true,
    columnWidths: { ...DEFAULT_COLUMN_WIDTHS },
    compactMode: false,
    fixedLeftColumns: [...DEFAULT_FIXED_LEFT_COLUMNS],
    columnGroups: buildDefaultColumnGroups(),
    showGroupedHeaders: true,
  };
}

function normalizeVisibleCols(value: unknown): Record<string, boolean> {
  const defaults = { ...DEFAULT_VISIBLE_COLS };

  if (!isRecord(value)) {
    return defaults;
  }

  for (const key of KNOWN_COLUMN_KEYS) {
    const candidate = value[key];
    if (typeof candidate === "boolean") {
      defaults[key] = candidate;
    }
  }

  return defaults;
}

function normalizeColumnOrder(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [...KNOWN_COLUMN_KEYS];
  }

  const uniqueKnownKeys = value
    .filter((entry): entry is string => typeof entry === "string" && KNOWN_COLUMN_KEY_SET.has(entry))
    .filter((entry, index, self) => self.indexOf(entry) === index);

  const missingKeys = KNOWN_COLUMN_KEYS.filter((key) => !uniqueKnownKeys.includes(key));

  return [...uniqueKnownKeys, ...missingKeys];
}

function normalizeColumnWidths(value: unknown): Record<string, number> {
  const defaults = { ...DEFAULT_COLUMN_WIDTHS };

  if (!isRecord(value)) {
    return defaults;
  }

  for (const key of KNOWN_COLUMN_KEYS) {
    const candidate = value[key];
    const numericValue = typeof candidate === "number" ? candidate : Number(candidate);

    if (Number.isFinite(numericValue) && numericValue > 0) {
      defaults[key] = numericValue;
    }
  }

  return defaults;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeFixedLeftColumns(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_FIXED_LEFT_COLUMNS];
  }

  const normalized = value
    .filter((entry): entry is string => typeof entry === "string" && PINNABLE_LEFT_COLUMN_KEY_SET.has(entry))
    .filter((entry, index, self) => self.indexOf(entry) === index);

  return normalized.length > 0 || value.length === 0
    ? normalized
    : [...DEFAULT_FIXED_LEFT_COLUMNS];
}

function normalizeColumnGroups(value: unknown): SurgeryViewPreferenceGroup[] {
  const defaults = buildDefaultColumnGroups();
  const defaultsById = new Map(defaults.map((group) => [group.id, group]));

  if (!Array.isArray(value)) {
    return defaults;
  }

  const normalized: SurgeryViewPreferenceGroup[] = [];

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }

    const candidateId = typeof entry.id === "string" ? entry.id : "";
    const fallback = defaultsById.get(candidateId);

    if (!fallback) {
      continue;
    }

    const columns = Array.isArray(entry.columns)
      ? entry.columns
          .filter((column): column is string => typeof column === "string" && KNOWN_COLUMN_KEY_SET.has(column))
          .filter((column, index, self) => self.indexOf(column) === index)
      : [...fallback.columns];

    normalized.push({
      id: fallback.id,
      label:
        typeof entry.label === "string" && entry.label.trim().length > 0
          ? entry.label
          : fallback.label,
      colorName:
        typeof entry.colorName === "string" && entry.colorName.trim().length > 0
          ? entry.colorName
          : fallback.colorName,
      colorClassName:
        typeof entry.colorClassName === "string" && entry.colorClassName.trim().length > 0
          ? entry.colorClassName
          : fallback.colorClassName,
      columns: columns.length > 0 ? columns : [...fallback.columns],
    });
  }

  const normalizedIds = new Set(normalized.map((group) => group.id));
  return [...normalized, ...defaults.filter((group) => !normalizedIds.has(group.id))].map((group) => ({
    ...group,
    columns: [...group.columns],
  }));
}

export function normalizeSurgeryViewPreferences(value: unknown): SurgeryViewPreferences {
  if (!isRecord(value)) {
    return buildDefaultSurgeryViewPreferences();
  }

  return {
    visibleCols: normalizeVisibleCols(value.visibleCols),
    columnOrder: normalizeColumnOrder(value.columnOrder),
    stickyColumns: normalizeBoolean(value.stickyColumns, true),
    columnWidths: normalizeColumnWidths(value.columnWidths),
    compactMode: normalizeBoolean(value.compactMode, false),
    fixedLeftColumns: normalizeFixedLeftColumns(value.fixedLeftColumns),
    columnGroups: normalizeColumnGroups(value.columnGroups),
    showGroupedHeaders: normalizeBoolean(value.showGroupedHeaders, true),
  };
}

export function validateUpsertSurgeryViewPreferencesBody(
  body: unknown
): UpsertSurgeryViewPreferencesBody {
  if (!isRecord(body)) {
    throw badRequest("Body must be an object", "invalid_surgery_view_preferences_body");
  }

  if (!("preferences" in body)) {
    throw badRequest(
      "preferences payload is required",
      "missing_surgery_view_preferences"
    );
  }

  return {
    preferences: normalizeSurgeryViewPreferences(body.preferences),
  };
}
