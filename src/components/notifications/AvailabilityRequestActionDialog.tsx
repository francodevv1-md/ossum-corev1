"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAvailabilityRequestAction } from "@/hooks/useAvailabilityRequestAction";

export type AvailabilityRequestActionDialogProps = {
  open: boolean;
  companyId: string;
  requestId: string;
  actorIdentityToken: string;
  onOpenChange: (open: boolean) => void;
};

function displayDate(date: string | null): string | null {
  if (!date) return null;
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
}

export function AvailabilityRequestActionDialog({
  open,
  companyId,
  requestId,
  actorIdentityToken,
  onOpenChange,
}: AvailabilityRequestActionDialogProps) {
  const action = useAvailabilityRequestAction({ companyId, requestId, actorIdentityToken });
  const contextKey = useMemo(
    () => `${companyId}\u0000${requestId}\u0000${actorIdentityToken}`,
    [actorIdentityToken, companyId, requestId]
  );
  const previousContextRef = useRef(contextKey);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (previousContextRef.current !== contextKey && open) onOpenChange(false);
    previousContextRef.current = contextKey;
  }, [contextKey, onOpenChange, open]);

  useEffect(() => {
    if (action.error?.kind === "validation") dateInputRef.current?.focus();
  }, [action.error]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) action.reset();
    onOpenChange(nextOpen);
  }, [action, onOpenChange]);

  const isFormVisible = ["ready", "submitting", "conflict", "error"].includes(action.status);
  const isAlert = action.status === "blocked" || action.status === "error";
  const outcome = action.status === "loading" || action.status === "idle"
    ? "Cargando solicitud…"
    : action.status === "success"
      ? "Disponibilidad informada"
      : action.status === "terminal"
        ? "La solicitud ya fue completada"
        : action.status === "conflict"
          ? action.error?.code === "availability_date_already_set"
            ? "La fecha ya fue informada. Abrí el expediente para revisar el caso."
            : "La solicitud cambió. Revisá el estado actual."
          : action.status === "blocked"
            ? "No se pudo abrir esta solicitud."
            : action.status === "error"
              ? action.error?.kind === "validation"
                ? "Revisá la fecha ingresada."
                : "No se pudo guardar. Intentá nuevamente."
              : "";

  const detail = action.detail;
  const reasons = detail?.recipientReasonsForActor.map((reason) =>
    reason === "creator" ? "Creador" : "PÍVOT"
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg flex-col gap-0 overflow-hidden p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
          titleRef.current?.focus();
          void action.load();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
          returnFocusRef.current = null;
        }}
        data-availability-dialog="viewport-bounded"
      >
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle ref={titleRef} tabIndex={-1}>Informar disponibilidad</DialogTitle>
          <DialogDescription>
            Confirmá la fecha en que estará disponible el material.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto px-5 py-4">
          <div
            id="availability-request-outcome"
            role={isAlert ? "alert" : "status"}
            aria-live={isAlert ? "assertive" : "polite"}
            aria-atomic="true"
            className={isAlert ? "text-sm text-destructive" : "text-sm text-foreground"}
          >
            {outcome}
          </div>

          {detail && action.status !== "loading" ? (
            <dl className="grid min-w-0 grid-cols-1 gap-3 text-sm">
              <div><dt className="text-muted-foreground">Cirugía</dt><dd className="font-medium">{detail.surgery.visibleNumber ?? detail.surgery.id}</dd></div>
              <div><dt className="text-muted-foreground">Solicitante</dt><dd>{detail.requester.displayName}</dd></div>
              <div><dt className="text-muted-foreground">Solicitada</dt><dd><time dateTime={detail.requestedAt}>{detail.requestedAt.replace("T", " ").slice(0, 16)}</time></dd></div>
              {reasons?.length ? <div><dt className="text-muted-foreground">Tu rol</dt><dd>{reasons.join(" · ")}</dd></div> : null}
              {detail.creatorResolution === "not_identified_or_eligible" ? <div><dt className="sr-only">Creador</dt><dd>Creador de la cirugía no identificado o no habilitado.</dd></div> : null}
              {detail.submittedDate ? <div><dt className="text-muted-foreground">Fecha informada</dt><dd>{displayDate(detail.submittedDate)}</dd></div> : null}
              {detail.completedAt ? <div><dt className="text-muted-foreground">Informada</dt><dd><time dateTime={detail.completedAt}>{detail.completedAt.replace("T", " ").slice(0, 16)}</time></dd></div> : null}
              {detail.completedBy ? <div><dt className="text-muted-foreground">Informada por</dt><dd>{detail.completedBy.displayName}</dd></div> : null}
            </dl>
          ) : null}

          {isFormVisible ? (
            <div className="space-y-2">
              <label htmlFor="availability-request-date" className="text-sm font-medium">
                Fecha de disponibilidad del material
              </label>
              <Input
                ref={dateInputRef}
                id="availability-request-date"
                type="date"
                className="min-h-11"
                value={action.date}
                onChange={(event) => action.setDate(event.target.value)}
                aria-invalid={action.error?.kind === "validation" || undefined}
                aria-describedby={action.error ? "availability-request-outcome" : undefined}
                disabled={action.status === "submitting"}
              />
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="min-h-11">Cerrar</Button>
          </DialogClose>
          {isFormVisible ? (
            <Button
              type="button"
              className="min-h-11"
              disabled={action.status === "submitting"}
              onClick={() => {
                if (!action.date.trim() || !dateInputRef.current?.checkValidity()) {
                  dateInputRef.current?.focus();
                  return;
                }
                void action.submit();
              }}
            >
              {action.status === "submitting" ? "Guardando…" : "Guardar disponibilidad"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
