"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AvailabilityRequestClientError,
  completeAvailabilityRequest,
  getAvailabilityRequest,
  type AvailabilityRequestView,
} from "@/lib/api/availability-request-client";

export type AvailabilityRequestActionStatus =
  | "idle"
  | "loading"
  | "ready"
  | "submitting"
  | "success"
  | "terminal"
  | "conflict"
  | "blocked"
  | "error";

type ActionState = {
  contextKey: string;
  status: AvailabilityRequestActionStatus;
  detail: AvailabilityRequestView | null;
  date: string;
  error: AvailabilityRequestClientError | null;
};

export type AvailabilityRequestActionClient = {
  get: typeof getAvailabilityRequest;
  complete: typeof completeAvailabilityRequest;
};

export type UseAvailabilityRequestActionOptions = {
  companyId: string | null;
  requestId: string | null;
  actorIdentityToken: string | null;
  client?: AvailabilityRequestActionClient;
  createIdempotencyKey?: () => string;
};

const DEFAULT_CLIENT: AvailabilityRequestActionClient = {
  get: getAvailabilityRequest,
  complete: completeAvailabilityRequest,
};

function initialState(contextKey: string): ActionState {
  return { contextKey, status: "idle", detail: null, date: "", error: null };
}

function defaultIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return `availability-${crypto.randomUUID()}`;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `availability-${Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function statusFor(error: AvailabilityRequestClientError): AvailabilityRequestActionStatus {
  if (["authentication", "blocked", "not_found"].includes(error.kind)) return "blocked";
  if (error.kind === "conflict") {
    return error.code === "availability_request_completed" ? "terminal" : "conflict";
  }
  return "error";
}

export function useAvailabilityRequestAction({
  companyId,
  requestId,
  actorIdentityToken,
  client = DEFAULT_CLIENT,
  createIdempotencyKey = defaultIdempotencyKey,
}: UseAvailabilityRequestActionOptions) {
  const contextKey = useMemo(
    () => `${companyId ?? ""}\u0000${requestId ?? ""}\u0000${actorIdentityToken ?? ""}`,
    [actorIdentityToken, companyId, requestId]
  );
  const [storedState, setStoredState] = useState(() => initialState(contextKey));
  const activeContextRef = useRef(contextKey);
  const sequenceRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const keyRef = useRef<{ contextKey: string; date: string; key: string } | null>(null);
  const state = storedState.contextKey === contextKey
    ? storedState
    : initialState(contextKey);

  useEffect(() => {
    activeContextRef.current = contextKey;
    sequenceRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    keyRef.current = null;
    return () => controllerRef.current?.abort();
  }, [contextKey]);

  const isCurrent = useCallback(
    (sequence: number) =>
      sequenceRef.current === sequence && activeContextRef.current === contextKey,
    [contextKey]
  );

  const load = useCallback(async () => {
    if (!companyId || !requestId || !actorIdentityToken) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const sequence = ++sequenceRef.current;
    setStoredState({ ...initialState(contextKey), status: "loading" });
    try {
      const detail = await client.get(companyId, requestId, { signal: controller.signal });
      if (!isCurrent(sequence)) return;
      setStoredState({
        ...initialState(contextKey),
        status: detail.status === "COMPLETED"
          ? "terminal"
          : detail.canComplete ? "ready" : "blocked",
        detail,
      });
    } catch (error) {
      if (!isCurrent(sequence) || controller.signal.aborted) return;
      const clientError = error instanceof AvailabilityRequestClientError
        ? error
        : new AvailabilityRequestClientError("network", null, "availability_network_error");
      setStoredState({ ...initialState(contextKey), status: statusFor(clientError), error: clientError });
    }
  }, [actorIdentityToken, client, companyId, contextKey, isCurrent, requestId]);

  const setDate = useCallback((date: string) => {
    const normalized = date.trim();
    if (keyRef.current?.date !== normalized) keyRef.current = null;
    setStoredState((current) => {
      const base = current.contextKey === contextKey ? current : initialState(contextKey);
      return {
        ...base,
        date,
        error: null,
        status: base.status === "conflict" || base.status === "error" ? "ready" : base.status,
      };
    });
  }, [contextKey]);

  const submit = useCallback(async () => {
    if (!companyId || !requestId || !actorIdentityToken) return;
    if (["success", "terminal", "blocked", "submitting"].includes(state.status)) return;
    const normalizedDate = state.date.trim();
    if (!normalizedDate) return;
    const keyEntry = keyRef.current?.contextKey === contextKey && keyRef.current.date === normalizedDate
      ? keyRef.current
      : { contextKey, date: normalizedDate, key: createIdempotencyKey() };
    keyRef.current = keyEntry;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const sequence = ++sequenceRef.current;
    setStoredState((current) => ({ ...current, status: "submitting", error: null }));
    try {
      const detail = await client.complete(
        companyId,
        requestId,
        normalizedDate,
        keyEntry.key,
        { signal: controller.signal }
      );
      if (!isCurrent(sequence)) return;
      setStoredState((current) => ({ ...current, status: "success", detail, error: null }));
    } catch (error) {
      if (!isCurrent(sequence) || controller.signal.aborted) return;
      const clientError = error instanceof AvailabilityRequestClientError
        ? error
        : new AvailabilityRequestClientError("network", null, "availability_network_error");
      if (clientError.code === "availability_request_completed") {
        setStoredState((current) => ({
          ...current,
          status: "loading",
          detail: null,
          error: null,
        }));
        try {
          const completedDetail = await client.get(companyId, requestId, {
            signal: controller.signal,
          });
          if (!isCurrent(sequence)) return;
          const isCompleted = completedDetail.status === "COMPLETED";
          setStoredState((current) => ({
            ...current,
            status: isCompleted ? "terminal" : "error",
            detail: isCompleted ? completedDetail : null,
            error: isCompleted
              ? null
              : new AvailabilityRequestClientError(
                  "unexpected",
                  null,
                  "availability_terminal_refresh_invalid"
                ),
          }));
        } catch (refreshError) {
          if (!isCurrent(sequence) || controller.signal.aborted) return;
          const refreshClientError = refreshError instanceof AvailabilityRequestClientError
            ? refreshError
            : new AvailabilityRequestClientError("network", null, "availability_network_error");
          setStoredState((current) => ({
            ...current,
            status: statusFor(refreshClientError) === "blocked" ? "blocked" : "error",
            detail: null,
            error: refreshClientError,
          }));
        }
        return;
      }
      setStoredState((current) => ({ ...current, status: statusFor(clientError), error: clientError }));
    }
  }, [actorIdentityToken, client, companyId, contextKey, createIdempotencyKey, isCurrent, requestId, state.date, state.status]);

  const reset = useCallback(() => {
    sequenceRef.current += 1;
    controllerRef.current?.abort();
    keyRef.current = null;
    setStoredState(initialState(contextKey));
  }, [contextKey]);

  return { ...state, load, setDate, submit, reset };
}
