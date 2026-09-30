"use client";

import React, { useState, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  StatsCard,
  StateBadge,
  SearchInput,
  FilterSelect,
} from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  ShoppingCart,
  Clock,
  AlertTriangle,
  Plus,
  Eye,
  MoreHorizontal,
  RefreshCw,
  Package,
  Zap,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useNecesidadesCompra } from "@/hooks/useCompras";
import { useProveedores } from "@/hooks/useProveedores";
import type { NecesidadCompraApi } from "@/lib/api/compras";

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { className: string; label: string }> = {
    critica: { className: "bg-red-600 text-white border-transparent", label: "Crítica" },
    alta: { className: "bg-orange-500 text-white border-transparent", label: "Alta" },
    media: { className: "bg-yellow-500 text-white border-transparent", label: "Media" },
    baja: { className: "bg-emerald-600 text-white border-transparent", label: "Baja" },
    // compatibility
    Urgente: { className: "bg-red-600 text-white border-transparent", label: "Crítica" },
    Alta: { className: "bg-orange-500 text-white border-transparent", label: "Alta" },
    Media: { className: "bg-yellow-500 text-white border-transparent", label: "Media" },
    Baja: { className: "bg-emerald-600 text-white border-transparent", label: "Baja" },
  };
  const c = config[priority] || config.media;
  return <Badge className={c.className}>{c.label}</Badge>;
}

const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "En_OC", label: "En Orden de Compra" },
  { value: "Enviada", label: "Enviada" },
  { value: "Recibida", label: "Recibida" },
  { value: "Cancelada", label: "Cancelada" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "Todas las prioridades" },
  { value: "critica", label: "Crítica" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
];

const ORIGIN_OPTIONS = [
  { value: "", label: "Todos los orígenes" },
  { value: "manual", label: "Carga manual" },
  { value: "stock_bajo", label: "Stock bajo" },
  { value: "faltante_preparacion", label: "Faltante de preparación" },
  { value: "consumo", label: "Consumo quirúrgico" },
  { value: "diferencia_comparativa", label: "Diferencia comparativa" },
];

export default function NecesidadesCompraPage() {
  const {
    data: necesidades,
    loading,
    error,
    refresh,
    createNecesidad,
    cancelNecesidad,
    convertToOc,
  } = useNecesidadesCompra();

  const { proveedores } = useProveedores();

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [originFilter, setOriginFilter] = useState("");

  // Selection state for batch conversion to OC
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<NecesidadCompraApi | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState("");

  // Convert to OC form state
  const [convertProveedorId, setConvertProveedorId] = useState("");
  const [convertObservaciones, setConvertObservaciones] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formPriority, setFormPriority] = useState("media");
  const [formOrigin, setFormOrigin] = useState("manual");
  const [formIsArticuloZ, setFormIsArticuloZ] = useState(false);
  const [formSuggestedSupplierId, setFormSuggestedSupplierId] = useState("");
  const [formObservaciones, setFormObservaciones] = useState("");

  const filtered = useMemo(() => {
    let data = necesidades.slice();
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          (n.code && n.code.toLowerCase().includes(q)) ||
          (n.suggestedSupplierName && n.suggestedSupplierName.toLowerCase().includes(q)) ||
          (n.observaciones && n.observaciones.toLowerCase().includes(q))
      );
    }
    if (stateFilter) data = data.filter((n) => n.state === stateFilter);
    if (priorityFilter) data = data.filter((n) => n.priority === priorityFilter);
    if (originFilter) data = data.filter((n) => n.origin === originFilter);
    return data;
  }, [necesidades, search, stateFilter, priorityFilter, originFilter]);

  const stats = useMemo(() => {
    const total = necesidades.length;
    const pendientes = necesidades.filter((n) => n.state === "Pendiente").length;
    const enOc = necesidades.filter((n) => n.state === "En_OC").length;
    const criticas = necesidades.filter((n) => n.priority === "critica" || n.priority === "alta").length;
    return { total, pendientes, enOc, criticas };
  }, [necesidades]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAllPending = () => {
    const pendingIds = filtered.filter((n) => n.state === "Pendiente").map((n) => n.id);
    if (selectedIds.size === pendingIds.length && pendingIds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingIds));
    }
  };

  const handleOpenConvert = () => {
    if (selectedIds.size === 0) {
      toast.error("Seleccione al menos una necesidad de compra");
      return;
    }

    const selectedNeeds = necesidades.filter((n) => selectedIds.has(n.id));
    // Pre-populate supplier if all selected share the same suggested supplier
    const suppliers = new Set(
      selectedNeeds.map((n) => n.suggestedSupplierId).filter(Boolean)
    );
    if (suppliers.size === 1) {
      setConvertProveedorId(Array.from(suppliers)[0] as string);
    } else {
      setConvertProveedorId("");
    }
    setConvertObservaciones(`Generada a partir de ${selectedIds.size} necesidad(es) de compra`);
    setConvertDialogOpen(true);
  };

  const handleConvertSubmit = async () => {
    if (!convertProveedorId) {
      toast.error("Debe seleccionar un proveedor");
      return;
    }

    const prov = proveedores.find((p) => p.id === convertProveedorId);
    if (!prov) {
      toast.error("Proveedor no válido");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await convertToOc({
        necesidadIds: Array.from(selectedIds),
        proveedorId: prov.id,
        proveedorName: prov.name,
        observaciones: convertObservaciones,
      });

      toast.success(
        `Orden de compra #${res.ordenCompra.id.slice(-6).toUpperCase()} generada exitosamente`
      );
      setSelectedIds(new Set());
      setConvertDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Error al convertir necesidades a orden de compra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("El nombre del artículo es obligatorio");
      return;
    }
    if (formQuantity <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    const selectedProv = proveedores.find((p) => p.id === formSuggestedSupplierId);

    setIsSubmitting(true);
    try {
      await createNecesidad({
        name: formName.trim(),
        code: formCode.trim() || undefined,
        quantity: formQuantity,
        priority: formPriority,
        origin: formOrigin,
        isArticuloZ: formIsArticuloZ,
        suggestedSupplierId: selectedProv?.id || null,
        suggestedSupplierName: selectedProv?.name || null,
        observaciones: formObservaciones.trim() || null,
      });

      toast.success("Necesidad de compra registrada exitosamente");
      setCreateDialogOpen(false);
      setFormName("");
      setFormCode("");
      setFormQuantity(1);
      setFormPriority("media");
      setFormOrigin("manual");
      setFormIsArticuloZ(false);
      setFormSuggestedSupplierId("");
      setFormObservaciones("");
    } catch (err: any) {
      toast.error(err?.message || "Error al crear la necesidad de compra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelTargetId) return;
    setIsSubmitting(true);
    try {
      await cancelNecesidad(cancelTargetId, cancelMotivo.trim() || undefined);
      toast.success("Necesidad de compra cancelada");
      setCancelDialogOpen(false);
      setCancelTargetId(null);
      setCancelMotivo("");
    } catch (err: any) {
      toast.error(err?.message || "Error al cancelar la necesidad");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Necesidades de Compra</h1>
          <p className="text-sm text-muted-foreground">
            Gestión y consolidación de faltantes y requerimientos para emisión de Órdenes de Compra
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button onClick={handleOpenConvert} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
              <ShoppingCart className="size-4" />
              Generar OC ({selectedIds.size})
            </Button>
          )}
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="size-4" />
            Nueva Necesidad
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Necesidades" value={stats.total} icon={ShoppingCart} />
        <StatsCard title="Pendientes de OC" value={stats.pendientes} icon={Clock} />
        <StatsCard title="En Orden de Compra" value={stats.enOc} icon={Package} />
        <StatsCard title="Críticas / Altas" value={stats.criticas} icon={AlertTriangle} />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Buscar por artículo, código, proveedor..."
          value={search}
          onChange={setSearch}
          className="sm:w-80"
        />
        <FilterSelect
          options={STATE_OPTIONS}
          value={stateFilter}
          onChange={setStateFilter}
        />
        <FilterSelect
          options={PRIORITY_OPTIONS}
          value={priorityFilter}
          onChange={setPriorityFilter}
        />
        <FilterSelect
          options={ORIGIN_OPTIONS}
          value={originFilter}
          onChange={setOriginFilter}
        />
        <Button variant="ghost" size="icon" onClick={() => refresh()} title="Actualizar">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <Checkbox
                      checked={
                        filtered.filter((n) => n.state === "Pendiente").length > 0 &&
                        selectedIds.size === filtered.filter((n) => n.state === "Pendiente").length
                      }
                      onCheckedChange={selectAllPending}
                      aria-label="Seleccionar todos los pendientes"
                    />
                  </th>
                  <th className="px-4 py-3">Artículo / Descripción</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">Proveedor Sugerido</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      {loading
                        ? "Cargando necesidades de compra..."
                        : "No se encontraron necesidades de compra registradas"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((n) => {
                    const isPending = n.state === "Pendiente";
                    const isSelected = selectedIds.has(n.id);
                    return (
                      <tr
                        key={n.id}
                        className={`hover:bg-muted/30 transition-colors ${
                          isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/20" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          {isPending && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(n.id)}
                              aria-label={`Seleccionar ${n.name}`}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{n.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{n.code || "S/C"}</span>
                            {n.isArticuloZ && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1">
                                Artículo Z
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold">{n.quantity}</td>
                        <td className="px-4 py-3">
                          <PriorityBadge priority={n.priority} />
                        </td>
                        <td className="px-4 py-3 text-xs capitalize text-muted-foreground">
                          {n.origin.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {n.suggestedSupplierName || (
                            <span className="text-muted-foreground italic">No asignado</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              n.state === "Pendiente"
                                ? "outline"
                                : n.state === "En_OC"
                                ? "secondary"
                                : n.state === "Recibida"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {n.state === "En_OC" ? "En OC" : n.state}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(n.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedDetail(n);
                                  setDetailDialogOpen(true);
                                }}
                              >
                                <Eye className="mr-2 size-4" />
                                Ver Detalle
                              </DropdownMenuItem>
                              {isPending && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedIds(new Set([n.id]));
                                      handleOpenConvert();
                                    }}
                                  >
                                    <ShoppingCart className="mr-2 size-4" />
                                    Generar OC
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      setCancelTargetId(n.id);
                                      setCancelDialogOpen(true);
                                    }}
                                  >
                                    <XCircle className="mr-2 size-4" />
                                    Cancelar Necesidad
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Create Necesidad */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Nueva Necesidad de Compra</DialogTitle>
              <DialogDescription>
                Registre un faltante o requerimiento para su posterior consolidación en Orden de Compra.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isArticuloZ"
                  checked={formIsArticuloZ}
                  onCheckedChange={(c) => setFormIsArticuloZ(!!c)}
                />
                <Label htmlFor="isArticuloZ" className="text-xs font-medium cursor-pointer">
                  Artículo Z (requerimiento especial fuera de catálogo)
                </Label>
              </div>

              <div>
                <Label htmlFor="name" className="text-xs">
                  Nombre / Descripción *
                </Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Placa Bloqueada 3.5mm..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="code" className="text-xs">
                    Código de Referencia
                  </Label>
                  <Input
                    id="code"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="Ej: ART-00123"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity" className="text-xs">
                    Cantidad Requerida *
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(parseFloat(e.target.value) || 1)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="priority" className="text-xs">
                    Prioridad
                  </Label>
                  <Select value={formPriority} onValueChange={setFormPriority}>
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critica">Crítica</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="baja">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="origin" className="text-xs">
                    Origen
                  </Label>
                  <Select value={formOrigin} onValueChange={setFormOrigin}>
                    <SelectTrigger id="origin">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="stock_bajo">Stock bajo</SelectItem>
                      <SelectItem value="faltante_preparacion">Faltante preparación</SelectItem>
                      <SelectItem value="consumo">Consumo quirúrgico</SelectItem>
                      <SelectItem value="diferencia_comparativa">Diferencia comparativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="supplier" className="text-xs">
                  Proveedor Sugerido (Opcional)
                </Label>
                <Select
                  value={formSuggestedSupplierId}
                  onValueChange={setFormSuggestedSupplierId}
                >
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Seleccione un proveedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin proveedor asignado</SelectItem>
                    {proveedores.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="observaciones" className="text-xs">
                  Observaciones
                </Label>
                <Textarea
                  id="observaciones"
                  value={formObservaciones}
                  onChange={(e) => setFormObservaciones(e.target.value)}
                  placeholder="Detalles sobre el requerimiento..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Crear Necesidad"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Convert to OC */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generar Orden de Compra</DialogTitle>
            <DialogDescription>
              Se consolidarán {selectedIds.size} necesidad(es) de compra en una nueva Orden de Compra en borrador.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div>
              <Label htmlFor="ocSupplier" className="text-xs font-medium">
                Proveedor *
              </Label>
              <Select
                value={convertProveedorId}
                onValueChange={setConvertProveedorId}
              >
                <SelectTrigger id="ocSupplier">
                  <SelectValue placeholder="Seleccione el proveedor para la OC..." />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ocObs" className="text-xs font-medium">
                Observaciones de la OC
              </Label>
              <Textarea
                id="ocObs"
                value={convertObservaciones}
                onChange={(e) => setConvertObservaciones(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConvertDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConvertSubmit}
              disabled={isSubmitting || !convertProveedorId}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting ? "Generando..." : "Confirmar y Generar OC"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detail View */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle de Necesidad de Compra</DialogTitle>
          </DialogHeader>
          {selectedDetail && (
            <div className="space-y-3 py-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Artículo:</span>
                <span className="font-medium">{selectedDetail.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Código:</span>
                <span>{selectedDetail.code || "S/C"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Cantidad:</span>
                <span className="font-semibold">{selectedDetail.quantity}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Prioridad:</span>
                <PriorityBadge priority={selectedDetail.priority} />
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Estado:</span>
                <Badge>{selectedDetail.state}</Badge>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Origen:</span>
                <span className="capitalize">{selectedDetail.origin.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Proveedor sugerido:</span>
                <span>{selectedDetail.suggestedSupplierName || "Ninguno"}</span>
              </div>
              {selectedDetail.ordenCompra && (
                <div className="flex justify-between border-b pb-2 bg-indigo-50/50 p-2 rounded">
                  <span className="text-indigo-900 font-medium">Orden de Compra:</span>
                  <span className="font-semibold text-indigo-900">
                    OC #{selectedDetail.ordenCompra.id.slice(-6).toUpperCase()} ({selectedDetail.ordenCompra.state})
                  </span>
                </div>
              )}
              {selectedDetail.observaciones && (
                <div className="pt-1">
                  <span className="text-xs text-muted-foreground block mb-1">Observaciones:</span>
                  <p className="text-xs bg-muted p-2 rounded">{selectedDetail.observaciones}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cancel Necesidad */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancelar Necesidad de Compra</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea cancelar esta necesidad de compra? Esta acción quedará registrada en auditoría.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="cancelMotivo" className="text-xs">
              Motivo de cancelación (opcional)
            </Label>
            <Input
              id="cancelMotivo"
              value={cancelMotivo}
              onChange={(e) => setCancelMotivo(e.target.value)}
              placeholder="Ej: Stock repuesto por devolución..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={isSubmitting}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Cancelando..." : "Confirmar Cancelación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
