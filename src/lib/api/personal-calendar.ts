import { apiFetch } from "@/lib/api/client";
import type {
  CreatePersonalCalendarEventInput,
  UpdatePersonalCalendarEventInput,
} from "@/lib/validators/personal-calendar.validator";
import type { PersonalCalendarEventDto } from "@/lib/services/personal-calendar.service";

export type { PersonalCalendarEventDto } from "@/lib/services/personal-calendar.service";

export async function fetchPersonalCalendarEvents(
  companyId: string,
  params?: { from?: string; to?: string; includeCancelled?: boolean }
): Promise<PersonalCalendarEventDto[]> {
  const query = new URLSearchParams();
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.includeCancelled) query.set("includeCancelled", "1");

  const qs = query.toString();
  const url = `/api/companies/${encodeURIComponent(companyId)}/personal-events${qs ? `?${qs}` : ""}`;
  const response = await apiFetch<{ events: PersonalCalendarEventDto[] }>(url);
  return response.events;
}

export async function createPersonalCalendarEventApi(
  companyId: string,
  data: CreatePersonalCalendarEventInput
): Promise<PersonalCalendarEventDto> {
  const url = `/api/companies/${encodeURIComponent(companyId)}/personal-events`;
  const response = await apiFetch<{ event: PersonalCalendarEventDto }>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.event;
}

export async function updatePersonalCalendarEventApi(
  companyId: string,
  eventId: string,
  data: UpdatePersonalCalendarEventInput
): Promise<PersonalCalendarEventDto> {
  const url = `/api/companies/${encodeURIComponent(companyId)}/personal-events/${encodeURIComponent(eventId)}`;
  const response = await apiFetch<{ event: PersonalCalendarEventDto }>(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.event;
}

export async function cancelPersonalCalendarEventApi(
  companyId: string,
  eventId: string
): Promise<PersonalCalendarEventDto> {
  const url = `/api/companies/${encodeURIComponent(companyId)}/personal-events/${encodeURIComponent(eventId)}`;
  const response = await apiFetch<{ event: PersonalCalendarEventDto }>(url, {
    method: "DELETE",
  });
  return response.event;
}
