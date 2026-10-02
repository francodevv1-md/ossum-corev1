"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Box,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  Layers,
  Loader2,
  Plus,
  Unlink,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  assignBoxToSurgeryApi,
  controlBoxAssignmentApi,
  endBoxAssignmentApi,
  getBoxAssignmentApi,
  listPhysicalUnitAssignmentsApi,
  reserveBoxAssignmentApi,
  resolveCajasDifferenceApi,
  selectPreparationLinePhysicalUnitApi,
  type BoxAssignmentDetail,
  type PhysicalUnitAssignmentRow,
} from "@/lib/api/cajas-assignments";
import { fetchBackendActiveSurgeries } from "@/lib/api/backend-surgeries";
import {
  createStockPhysicalUnitApi,
  listStockPhysicalUnitsApi,
  type StockPhysicalUnit,
} from "@/lib/api/stock-physical-units";
import type { Surgery } from "@/types";

export function CajasPhysicalUnitsSection({
  companyId,
  articleId,
}: {
  companyId: string;
  articleId: string;
}) {
  const [units, setUnits] = useState<StockPhysicalUnit[]>([]);
  const [unitAssignments, setUnitAssignments] = useState<Record<string, PhysicalUnitAssignmentRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form to create physical unit
  const [unitCode, setUnitCode] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [location, setLocation] = useState("");

  // Assign dialog state & surgeries list
  const [assigningUnit, setAssigningUnit] = useState<StockPhysicalUnit | null>(null);
  const [surgeryIdInput, setSurgeryIdInput] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [availableSurgeries, setAvailableSurgeries] = useState<Surgery[]>([]);
  const [loadingSurgeries, setLoadingSurgeries] = useState(false);

  // End assignment dialog state
  const [endingAssignment, setEndingAssignment] = useState<PhysicalUnitAssignmentRow | null>(null);
  const [endCauseInput, setEndCauseInput] = useState("");
  const [ending, setEnding] = useState(false);

  // View assignment detail state
  const [viewingAssignmentId, setViewingAssignmentId] = useState<string | null>(null);
  const [assignmentDetail, setAssignmentDetail] = useState<BoxAssignmentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reservingAssignmentId, setReservingAssignmentId] = useState<string | null>(null);
  const [componentUnitInputs, setComponentUnitInputs] = useState<Record<string, string>>({});
  const [lineUnitsMap, setLineUnitsMap] = useState<Record<string, StockPhysicalUnit[]>>({});
  const [selectingLineId, setSelectingLineId] = useState<string | null>(null);

  // Expanded history accordion state per unit
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!companyId || !articleId) return;
    setLoading(true);
    try {
      const fetchedUnits = await listStockPhysicalUnitsApi(companyId, articleId);
      setUnits(fetchedUnits);

      // Load assignments for all units
      const assignmentsMap: Record<string, PhysicalUnitAssignmentRow[]> = {};
      await Promise.all(
        fetchedUnits.map(async (u) => {
          try {
            const list = await listPhysicalUnitAssignmentsApi(companyId, u.id);
            assignmentsMap[u.id] = list;
          } catch {
            assignmentsMap[u.id] = [];
          }
        }),
      );
      setUnitAssignments(assignmentsMap);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudieron cargar las Cajas identificadas",
      );
    } finally {
      setLoading(false);
    }
  }, [companyId, articleId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleOpenAssignModal(unit: StockPhysicalUnit) {
    setAssigningUnit(unit);
    setSurgeryIdInput("");
    setAssignNotes("");
    if (!availableSurgeries.length) {
      setLoadingSurgeries(true);
      try {
        const list = await fetchBackendActiveSurgeries(companyId);
        setAvailableSurgeries(list);
        if (list[0]?.id) {
          setSurgeryIdInput(list[0].id);
        }
      } catch {
        // Fallback to manual entry if needed
      } finally {
        setLoadingSurgeries(false);
      }
    }
  }

  async function handleReserve(assignmentId: string) {
    setReservingAssignmentId(assignmentId);
    try {
      await reserveBoxAssignmentApi(companyId, assignmentId);
      toast.success("Caja identificada reservada para la preparación");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo reservar la caja");
    } finally {
      setReservingAssignmentId(null);
    }
  }

  async function handleSelectComponentUnit(lineId: string) {
    const physicalUnitId = componentUnitInputs[lineId]?.trim();
    if (!physicalUnitId) return;
    setSelectingLineId(lineId);
    try {
      await selectPreparationLinePhysicalUnitApi(companyId, lineId, physicalUnitId);
      toast.success("Unidad física vinculada a la línea");
      setComponentUnitInputs((current) => ({ ...current, [lineId]: "" }));
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo vincular la unidad"); }
    finally { setSelectingLineId(null); }
  }

  async function handleCreateUnit(event: React.FormEvent) {
    event.preventDefault();
    if (!unitCode.trim()) return;
    setSaving(true);
    try {
      await createStockPhysicalUnitApi(companyId, {
        articleId,
        unitCode,
        serialNumber: serialNumber || undefined,
        location: location || undefined,
      });
      setUnitCode("");
      setSerialNumber("");
      setLocation("");
      await load();
      toast.success("Caja identificada creada exitosamente");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo crear la Caja identificada",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignSurgery(e: React.FormEvent) {
    e.preventDefault();
    if (!assigningUnit || !surgeryIdInput.trim()) return;
    setAssigning(true);
    try {
      await assignBoxToSurgeryApi(companyId, surgeryIdInput.trim(), {
        physicalUnitId: assigningUnit.id,
        notes: assignNotes.trim() || undefined,
      });
      toast.success("Caja asignada y preparación abierta con fórmula vigente");
      setAssigningUnit(null);
      setSurgeryIdInput("");
      setAssignNotes("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al asignar caja a cirugía");
    } finally {
      setAssigning(false);
    }
  }

  async function handleEndAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!endingAssignment) return;
    setEnding(true);
    try {
      await endBoxAssignmentApi(companyId, endingAssignment.id, {
        cause: endCauseInput.trim() || "Asignación finalizada desde panel de Cajas",
      });
      toast.success("Asignación liberada");
      setEndingAssignment(null);
      setEndCauseInput("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al finalizar asignación");
    } finally {
      setEnding(false);
    }
  }

  async function handleViewDetail(assignmentId: string) {
    setViewingAssignmentId(assignmentId);
    setLoadingDetail(true);
    try {
      const detail = await getBoxAssignmentApi(companyId, assignmentId);
      setAssignmentDetail(detail);
      if (detail?.preparation?.lines) {
        const unitsMap: Record<string, StockPhysicalUnit[]> = {};
        await Promise.all(
          detail.preparation.lines.map(async (l) => {
            if (l.articleId) {
              try {
                const fetched = await listStockPhysicalUnitsApi(companyId, l.articleId);
                unitsMap[l.id] = fetched;
              } catch {
                unitsMap[l.id] = [];
              }
            }
          })
        );
        setLineUnitsMap(unitsMap);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar detalle de asignación");
      setViewingAssignmentId(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  const [controlling, setControlling] = useState(false);
  const [resolvingDiffId, setResolvingDiffId] = useState<string | null>(null);
  const [diffExplanation, setDiffExplanation] = useState("");
  const [diffSupportingRef, setDiffSupportingRef] = useState("");
  const [diffCause, setDiffCause] = useState("");
  const [resolvingDiff, setResolvingDiff] = useState(false);

  async function handleControl(kind: "control" | "recontrol" = "control") {
    if (!assignmentDetail) return;
    setControlling(true);
    try {
      await controlBoxAssignmentApi(companyId, assignmentDetail.id, undefined, kind);
      toast.success(kind === "recontrol" ? "Recontrol efectuado exitosamente" : "Control de caja completado");
      const updated = await getBoxAssignmentApi(companyId, assignmentDetail.id);
      setAssignmentDetail(updated);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al ejecutar control");
    } finally {
      setControlling(false);
    }
  }

  async function handleResolveDifference(e: React.FormEvent) {
    e.preventDefault();
    if (!assignmentDetail || !resolvingDiffId) return;
    setResolvingDiff(true);
    try {
      await resolveCajasDifferenceApi(companyId, assignmentDetail.id, resolvingDiffId, {
        idempotencyKey: `res-diff-${resolvingDiffId}-${Date.now()}`,
        closesDifference: true,
        explanation: diffExplanation.trim(),
        supportingReference: diffSupportingRef.trim() || "Inspección visual / ajuste operativo",
        cause: diffCause.trim() || "Resolución operativa de diferencia",
      });
      toast.success("Diferencia resuelta");
      setResolvingDiffId(null);
      setDiffExplanation("");
      setDiffSupportingRef("");
      setDiffCause("");
      const updated = await getBoxAssignmentApi(companyId, assignmentDetail.id);
      setAssignmentDetail(updated);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al resolver diferencia");
    } finally {
      setResolvingDiff(false);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-[var(--ossum-line)] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--ossum-navy)]">
            <Box className="size-4 text-[var(--ossum-action)]" />
            Cajas identificadas (Unidades Físicas)
          </h3>
          <p className="text-xs text-gray-500">
            Registro físico, asignación a Cirugías y apertura de preparación con fórmula vigente.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-xs text-gray-500">
          <Loader2 className="mr-2 size-4 animate-spin text-[var(--ossum-action)]" />
          Cargando unidades físicas y asignaciones...
        </div>
      ) : units.length ? (
        <div className="divide-y divide-gray-100 rounded-md border border-[var(--ossum-line)]">
          {units.map((unit) => {
            const assignments = unitAssignments[unit.id] || [];
            const activeAssignment = assignments.find((a) => a.isActive);
            const isRetired = unit.status === "RETIRED";
            const isExpanded = !!expandedUnits[unit.id];

            return (
              <div key={unit.id} className="p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-gray-900">
                      {unit.unitCode}
                    </span>
                    {unit.serialNumber && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-600">
                        S/N: {unit.serialNumber}
                      </span>
                    )}
                    {unit.location && (
                      <span className="text-[11px] text-gray-500">📍 {unit.location}</span>
                    )}
                    <Badge
                      variant={isRetired ? "destructive" : "secondary"}
                      className="text-[10px] uppercase"
                    >
                      {isRetired ? "Retirada" : "Activa"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isRetired && !activeAssignment && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => void handleOpenAssignModal(unit)}
                      >
                        <Plus className="mr-1 size-3" />
                        Asignar a Cirugía
                      </Button>
                    )}

                    {assignments.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-gray-500"
                        onClick={() =>
                          setExpandedUnits((prev) => ({ ...prev, [unit.id]: !isExpanded }))
                        }
                      >
                        {isExpanded ? (
                          <ChevronDown className="mr-1 size-3" />
                        ) : (
                          <ChevronRight className="mr-1 size-3" />
                        )}
                        Historial ({assignments.length})
                      </Button>
                    )}
                  </div>
                </div>

                {/* Active assignment banner */}
                {activeAssignment && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded bg-blue-50/70 p-2 text-xs text-blue-900 border border-blue-100">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-blue-600 shrink-0" />
                      <div>
                        <span className="font-medium">
                          Asignada a {activeAssignment.surgeryVisibleNumber || activeAssignment.surgeryId}
                        </span>
                        {activeAssignment.surgeryPatientName && (
                          <span className="ml-1 text-gray-600">
                            ({activeAssignment.surgeryPatientName})
                          </span>
                        )}
                        <span className="ml-2 text-[10px] text-blue-700">
                          • Prep v{activeAssignment.formulaVersionNumber ?? 1} ({activeAssignment.lineCount} ítems)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        className="h-6 px-2 text-[11px]"
                        disabled={reservingAssignmentId === activeAssignment.id}
                        onClick={() => void handleReserve(activeAssignment.id)}
                      >
                        {reservingAssignmentId === activeAssignment.id ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
                        Reservar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[11px] text-blue-700 hover:bg-blue-100"
                        onClick={() => handleViewDetail(activeAssignment.id)}
                      >
                        <Eye className="mr-1 size-3" />
                        Ver Prep
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[11px] text-red-600 hover:bg-red-50"
                        onClick={() => setEndingAssignment(activeAssignment)}
                      >
                        <Unlink className="mr-1 size-3" />
                        Liberar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Expanded history */}
                {isExpanded && assignments.length > 0 && (
                  <div className="mt-2 space-y-1.5 rounded bg-gray-50 p-2 text-xs">
                    <p className="text-[11px] font-medium text-gray-700">Historial de Asignaciones:</p>
                    <ul className="space-y-1">
                      {assignments.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between text-[11px] text-gray-600"
                        >
                          <div>
                            <span className="font-mono">
                              {a.surgeryVisibleNumber || a.surgeryId}
                            </span>{" "}
                            — {new Date(a.assignedAt).toLocaleDateString()}
                            {a.isActive ? (
                              <span className="ml-1 text-blue-600 font-medium">(Activa)</span>
                            ) : (
                              <span className="ml-1 text-gray-400">
                                (Finalizada: {a.endCause || "Sin causa"})
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 px-1.5 text-[10px]"
                            onClick={() => handleViewDetail(a.id)}
                          >
                            Detalle
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-gray-200 py-6 text-center text-xs text-gray-500">
          <Box className="mb-1 size-6 text-gray-300" />
          Todavía no hay unidades físicas registradas para este artículo.
        </div>
      )}

      {/* Creation form */}
      <form onSubmit={handleCreateUnit} className="grid gap-2 sm:grid-cols-4 pt-2">
        <Input
          value={unitCode}
          onChange={(e) => setUnitCode(e.target.value)}
          placeholder="Código interno (ej. CJ-001)"
          required
          className="h-8 text-xs"
        />
        <Input
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          placeholder="Serie (opcional)"
          className="h-8 text-xs"
        />
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ubicación (opcional)"
          className="h-8 text-xs"
        />
        <Button
          type="submit"
          size="sm"
          disabled={saving}
          className="h-8 text-xs bg-[var(--ossum-navy)] text-white hover:bg-[var(--ossum-navy)]/90"
        >
          <Plus className="mr-1 size-3" />
          {saving ? "Guardando..." : "Agregar Unidad"}
        </Button>
      </form>

      {/* Assign Dialog */}
      <Dialog open={!!assigningUnit} onOpenChange={(open) => !open && setAssigningUnit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Asignar Caja a Cirugía/Expediente
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Unidad: <strong className="font-mono">{assigningUnit?.unitCode}</strong>. Se capturará
              la versión vigente de la fórmula de la caja y se abrirá su preparación.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignSurgery} className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-gray-700">Cirugía / Expediente de destino</label>
              {loadingSurgeries ? (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 py-1">
                  <Loader2 className="size-3 animate-spin text-[var(--ossum-action)]" />
                  Cargando cirugías activas...
                </div>
              ) : availableSurgeries.length > 0 ? (
                <select
                  value={surgeryIdInput}
                  onChange={(e) => setSurgeryIdInput(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="">-- Seleccionar Cirugía / Expediente --</option>
                  {availableSurgeries.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} — {s.patient || "Sin paciente"} ({s.date || "Fecha pendiente"})
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={surgeryIdInput}
                  onChange={(e) => setSurgeryIdInput(e.target.value)}
                  placeholder="ID de Cirugía (ej. cuid / surgeryId)"
                  required
                  className="mt-1 text-xs"
                />
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Notas (opcional)</label>
              <Input
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="Observaciones de asignación"
                className="mt-1 text-xs"
              />
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setAssigningUnit(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={assigning}
                className="text-xs bg-[var(--ossum-navy)] text-white"
              >
                {assigning ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : (
                  <Plus className="mr-1 size-3" />
                )}
                {assigning ? "Asignando..." : "Confirmar Asignación"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* End Assignment Dialog */}
      <Dialog open={!!endingAssignment} onOpenChange={(open) => !open && setEndingAssignment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Liberar Asignación de Caja</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Liberará la caja asignada a la cirugía{" "}
              <strong>
                {endingAssignment?.surgeryVisibleNumber || endingAssignment?.surgeryId}
              </strong>
              . La preparación histórica permanecerá inmutable.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEndAssignment} className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-gray-700">Causa / Motivo</label>
              <Input
                value={endCauseInput}
                onChange={(e) => setEndCauseInput(e.target.value)}
                placeholder="Cirugía concluida, cambio de caja, etc."
                required
                className="mt-1 text-xs"
              />
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setEndingAssignment(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={ending}
                className="text-xs"
              >
                {ending ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : (
                  <Unlink className="mr-1 size-3" />
                )}
                {ending ? "Liberando..." : "Confirmar Liberación"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog
        open={!!viewingAssignmentId}
        onOpenChange={(open) => {
          if (!open) {
            setViewingAssignmentId(null);
            setAssignmentDetail(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <Layers className="size-4 text-[var(--ossum-action)]" />
              Detalle de Asignación y Preparación
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Versión de fórmula capturada y líneas de preparación inmutables.
            </DialogDescription>
          </DialogHeader>

          {loadingDetail || !assignmentDetail ? (
            <div className="flex items-center justify-center py-6 text-xs text-gray-500">
              <Loader2 className="mr-2 size-4 animate-spin text-[var(--ossum-action)]" />
              Cargando detalle de preparación...
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded bg-gray-50 p-2.5">
                <div>
                  <span className="text-gray-500">Cirugía:</span>{" "}
                  <strong className="font-mono">
                    {assignmentDetail.surgeryVisibleNumber || assignmentDetail.surgeryId}
                  </strong>
                </div>
                <div>
                  <span className="text-gray-500">Caja:</span>{" "}
                  <strong className="font-mono">{assignmentDetail.unitCode}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Fórmula capturada:</span>{" "}
                  <span className="font-medium text-blue-700">
                    Versión {assignmentDetail.preparation?.formulaVersionNumber ?? 1}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Estado:</span>{" "}
                  <Badge variant={assignmentDetail.isActive ? "secondary" : "outline"}>
                    {assignmentDetail.isActive ? "Activa" : "Finalizada"}
                  </Badge>
                </div>
              </div>

              {/* Recontrol / Warning Alerts */}
              {assignmentDetail.preparation?.requiresRecontrol && (
                <div className="flex items-center justify-between rounded border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-800">
                  <span className="flex items-center gap-1.5 font-medium">
                    <AlertCircle className="size-3.5 text-amber-600 shrink-0" />
                    Se requiere Recontrolar caja (hubo diferencias o modificaciones).
                  </span>
                  {assignmentDetail.isActive && (
                    <Button
                      type="button"
                      size="sm"
                      className="h-6 bg-amber-600 hover:bg-amber-700 px-2 text-[10px] text-white"
                      disabled={controlling}
                      onClick={() => void handleControl("recontrol")}
                    >
                      {controlling ? <Loader2 className="size-3 animate-spin" /> : "Recontrolar"}
                    </Button>
                  )}
                </div>
              )}

              {/* Control Action Bar */}
              {assignmentDetail.isActive && !assignmentDetail.preparation?.requiresRecontrol && (
                <div className="flex items-center justify-between rounded border border-blue-200 bg-blue-50/50 p-2 text-[11px]">
                  <span className="text-gray-600">Control de preparación inmutable:</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px] text-blue-700 border-blue-300 hover:bg-blue-100"
                    disabled={controlling}
                    onClick={() => void handleControl("control")}
                  >
                    {controlling ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="mr-1 size-3" />}
                    Ejecutar control
                  </Button>
                </div>
              )}

              {/* Differences section */}
              {assignmentDetail.differences && assignmentDetail.differences.length > 0 && (
                <div className="space-y-1.5 rounded border border-red-200 bg-red-50/30 p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-red-800 flex items-center gap-1">
                      <AlertCircle className="size-3 text-red-600" />
                      Diferencias registradas ({assignmentDetail.differences.length})
                    </span>
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {assignmentDetail.differences.map((diff) => {
                      const isOpen = !diff.closedAt;
                      return (
                        <div key={diff.id} className="rounded border border-red-100 bg-white p-1.5 text-[11px] flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <Badge variant={isOpen ? "destructive" : "outline"} className="text-[9px] h-4">
                              {isOpen ? "Abierta" : "Resuelta"}
                            </Badge>
                            <span className="font-mono text-[10px] text-gray-400">Tipo: {diff.kind}</span>
                          </div>
                          <p className="text-gray-700 text-[10px] line-clamp-2">{diff.observedFacts}</p>
                          {isOpen && assignmentDetail.isActive && (
                            <div className="pt-1 flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-5 px-2 text-[10px] border-amber-300 text-amber-800 hover:bg-amber-50"
                                onClick={() => {
                                  setResolvingDiffId(diff.id);
                                  setDiffExplanation("");
                                  setDiffSupportingRef("");
                                  setDiffCause("Resolución de diferencia de preparación");
                                }}
                              >
                                Resolver diferencia
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Resolve Difference Dialog / Inline Form */}
              {resolvingDiffId && (
                <form onSubmit={handleResolveDifference} className="rounded border border-amber-300 bg-amber-50 p-2.5 space-y-2 text-xs">
                  <div className="font-semibold text-amber-900 text-[11px]">Resolver diferencia de caja</div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-700">Explicación / Causa raíz</label>
                    <Input
                      value={diffExplanation}
                      onChange={(e) => setDiffExplanation(e.target.value)}
                      placeholder="Explicación detallada de la discrepancia"
                      required
                      className="h-7 text-xs mt-0.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-700">Referencia de soporte</label>
                    <Input
                      value={diffSupportingRef}
                      onChange={(e) => setDiffSupportingRef(e.target.value)}
                      placeholder="Nro de remito, foto de caja, etc."
                      className="h-7 text-xs mt-0.5 bg-white"
                    />
                  </div>
                  <div className="flex justify-end gap-1.5 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => setResolvingDiffId(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="h-6 text-[10px] bg-amber-700 hover:bg-amber-800 text-white"
                      disabled={resolvingDiff || !diffExplanation.trim()}
                    >
                      {resolvingDiff ? <Loader2 className="size-3 animate-spin" /> : "Confirmar resolución"}
                    </Button>
                  </div>
                </form>
              )}

              {assignmentDetail.preparation?.lines && assignmentDetail.preparation.lines.length > 0 ? (
                <div className="space-y-1">
                  <span className="font-medium text-gray-700">Líneas de preparación requeridas:</span>
                  <div className="max-h-48 overflow-y-auto rounded border border-gray-200">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-gray-100 text-gray-600">
                        <tr>
                          <th className="p-1.5">SKU / Descripción</th>
                          <th className="p-1.5 text-right">Cantidad</th>
                          <th className="p-1.5">Unidad física</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {assignmentDetail.preparation.lines.map((line) => (
                          <tr key={line.id}>
                            <td className="p-1.5">
                              <div className="font-mono text-gray-900">{line.sku || line.articleId}</div>
                              {line.description && (
                                <div className="text-[10px] text-gray-500">{line.description}</div>
                              )}
                            </td>
                            <td className="p-1.5 text-right font-medium">
                              {line.quantity} {line.unit}
                            </td>
                            <td className="p-1.5">
                              {lineUnitsMap[line.id]?.length ? (
                                <div className="flex gap-1">
                                  <select
                                    className="h-6 rounded border border-gray-300 bg-white px-1 text-[10px]"
                                    value={componentUnitInputs[line.id] || ""}
                                    onChange={(event) =>
                                      setComponentUnitInputs((current) => ({
                                        ...current,
                                        [line.id]: event.target.value,
                                      }))
                                    }
                                  >
                                    <option value="">-- Unidad física --</option>
                                    {lineUnitsMap[line.id].map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {u.unitCode} {u.serialNumber ? `(S/N: ${u.serialNumber})` : ""}
                                      </option>
                                    ))}
                                  </select>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-6 px-2 text-[10px]"
                                    disabled={selectingLineId === line.id || !componentUnitInputs[line.id]}
                                    onClick={() => void handleSelectComponentUnit(line.id)}
                                  >
                                    {selectingLineId === line.id ? (
                                      <Loader2 className="size-3 animate-spin" />
                                    ) : (
                                      "Vincular"
                                    )}
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-1">
                                  <Input
                                    className="h-6 text-[10px]"
                                    placeholder="ID unidad o lote"
                                    value={componentUnitInputs[line.id] || ""}
                                    onChange={(event) =>
                                      setComponentUnitInputs((current) => ({
                                        ...current,
                                        [line.id]: event.target.value,
                                      }))
                                    }
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-6 px-2 text-[10px]"
                                    disabled={selectingLineId === line.id || !componentUnitInputs[line.id]?.trim()}
                                    onClick={() => void handleSelectComponentUnit(line.id)}
                                  >
                                    {selectingLineId === line.id ? (
                                      <Loader2 className="size-3 animate-spin" />
                                    ) : (
                                      "Vincular"
                                    )}
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No hay líneas en la preparación.</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                setViewingAssignmentId(null);
                setAssignmentDetail(null);
              }}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
