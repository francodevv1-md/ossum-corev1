"use client";

import { ChevronDown, Loader2, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiFetch } from "@/lib/api/client";

export type CatalogItem = { id: string; name: string; code: string; parentId?: string | null; depth?: number | null };
export type CatalogKind = "category" | "clinical-family" | "brand" | "manufacturer" | "product-line";

type Props = {
  companyId?: string;
  kind: CatalogKind;
  label: string;
  value: string;
  onChange: (id: string) => void;
  items?: CatalogItem[];
  allowQuickCreate?: boolean;
  canQuickCreate?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onItemsChange?: (items: CatalogItem[]) => void;
  placeholder?: string;
};

export function CatalogSelect({ companyId, kind, label, value, onChange, items: suppliedItems, allowQuickCreate = false, canQuickCreate = true, loading: suppliedLoading, error: suppliedError, onRetry, onItemsChange, placeholder = "Seleccionar" }: Props) {
  const [items, setItems] = useState<CatalogItem[]>(suppliedItems ?? []);
  const [loading, setLoading] = useState(!suppliedItems);
  const [error, setError] = useState<string | null>(null);
  const [loadedCompanyId, setLoadedCompanyId] = useState(companyId);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    if (suppliedItems) return;
    if (!companyId) { setItems([]); setLoadedCompanyId(companyId); setLoading(false); return; }
    setLoading(true); setError(null);
    try { setItems(await apiFetch<CatalogItem[]>(`/api/companies/${encodeURIComponent(companyId)}/article-catalogs/${kind}`)); setLoadedCompanyId(companyId); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar el catálogo"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void Promise.resolve().then(load); }, [companyId, kind, suppliedItems]); // eslint-disable-line react-hooks/exhaustive-deps
  const catalogItems = useMemo(() => suppliedItems ?? (loadedCompanyId === companyId ? items : []), [companyId, items, loadedCompanyId, suppliedItems]);
  const isLoading = suppliedLoading ?? (loading || loadedCompanyId !== companyId);
  const loadError = suppliedError ?? error;
  const selected = catalogItems.find((item) => item.id === value);
  const visible = useMemo(() => catalogItems.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())), [catalogItems, query]);

  const create = async () => {
    if (!companyId || !newName.trim()) return;
    setCreating(true); setError(null);
    try {
      const item = await apiFetch<CatalogItem>(`/api/companies/${encodeURIComponent(companyId)}/article-catalogs/${kind}`, { method: "POST", body: JSON.stringify({ name: newName }) });
      const next = [...catalogItems, item].sort((a, b) => a.name.localeCompare(b.name, "es"));
      setItems(next); onItemsChange?.(next);
      onChange(item.id); setNewName(""); setOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear el catálogo"); }
    finally { setCreating(false); }
  };

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button type="button" variant="outline" role="combobox" aria-label={label} aria-expanded={open} className="h-8 w-full justify-between text-xs font-normal">
        <span className="truncate">{selected?.name ?? placeholder}</span><ChevronDown className="size-3.5 opacity-60" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-56 p-2">
      <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} placeholder={`Buscar ${label.toLowerCase()}`} aria-label={`Buscar ${label.toLowerCase()}`} className="h-8 text-xs" />
      {value && <button type="button" onClick={() => onChange("")} className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"><X className="size-3" /> Limpiar</button>}
      <div className="mt-2 max-h-48 overflow-y-auto" role="listbox" aria-label={label}>
        {isLoading ? <p className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground" role="status"><Loader2 className="size-3 animate-spin" />Cargando…</p>
          : loadError ? <div className="space-y-2 px-2 py-3 text-xs" role="alert"><p>{loadError}</p><Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => onRetry ? onRetry() : void load()}><RotateCcw className="size-3" />Reintentar</Button></div>
          : visible.length ? visible.map((item) => <button key={item.id} type="button" role="option" aria-selected={item.id === value} onClick={() => { onChange(item.id); setOpen(false); }} className="flex w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted focus:bg-muted focus:outline-none">{item.depth && item.depth > 1 ? `${"— ".repeat(item.depth - 1)}` : ""}{item.name}</button>)
          : <p className="px-2 py-3 text-xs text-muted-foreground">Sin resultados.</p>}
      </div>
      {allowQuickCreate && canQuickCreate && <div className="mt-2 flex gap-1 border-t pt-2"><Input value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void create(); } }} placeholder={`Nueva ${label.toLowerCase()}`} aria-label={`Nueva ${label.toLowerCase()}`} className="h-8 text-xs" /><Button type="button" size="sm" className="h-8" disabled={!newName.trim() || creating} onClick={() => void create()}>{creating ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}<span className="sr-only">Crear</span></Button></div>}
    </PopoverContent>
  </Popover>;
}
