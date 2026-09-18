import { describe, expect, it, vi } from "vitest";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  createAuthorizationEvidence,
  createAvailabilitySeguimientoEvent,
  createSeguimientoEntry,
  editSeguimientoEntry,
  listSeguimientoEntries,
} from "@/lib/services/seguimiento.service";

const actor = { userId: "user-10", displayName: "Nora Test" };
const dates = {
  createdAt: new Date("2026-07-03T12:00:00.000Z"),
  updatedAt: new Date("2026-07-03T12:00:00.000Z"),
};

function entry(overrides: Record<string, unknown> = {}) {
  return {
    id: "seg-1",
    surgeryId: "sx-1",
    companyId: "co-1",
    entryType: "note",
    content: "Texto original",
    summary: "Resumen original",
    authorId: "user-10",
    evidenceRef: null,
    author: { firstName: "Nora", lastName: "Test" },
    ...dates,
    ...overrides,
  };
}

function prismaForEdit(existing: Record<string, unknown> | null) {
  const findFirst = vi.fn().mockResolvedValue(existing);
  const update = vi.fn().mockImplementation(async ({ data }) =>
    entry({
      ...(existing ?? {}),
      content: data.content ?? existing?.content,
      summary: data.summary ?? existing?.summary,
      evidenceRef: data.evidenceRef,
      updatedAt: new Date("2026-07-03T12:01:00.000Z"),
    })
  );
  const prisma = {
    $transaction: vi.fn(async (callback) => callback(prisma)),
    seguimientoEntry: { findFirst, update, create: vi.fn() },
    userCompanyAccess: {
      findMany: vi.fn().mockResolvedValue([
        {
          userId: "user-2",
          user: { firstName: "Luis", lastName: "Test", email: "luis@test.com" },
        },
      ]),
    },
    internalNotification: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
  } as unknown as PrismaClient;
  return { prisma, findFirst, update };
}

describe("seguimiento.service", () => {
  it("returns real pagination metadata for the feed", async () => {
    const count = vi.fn().mockResolvedValue(73);
    const findMany = vi.fn().mockResolvedValue([entry()]);
    const prisma = { seguimientoEntry: { count, findMany } } as unknown as PrismaClient;

    const result = await listSeguimientoEntries(prisma, "sx-1", "co-1", { take: 50 });

    expect(count).toHaveBeenCalledWith({ where: { surgeryId: "sx-1", companyId: "co-1" } });
    expect(result).toMatchObject({ total: 73, hasMore: true, take: 50, entries: [{ id: "seg-1" }] });
  });

  it("redacts private R2 locators from document feed responses", async () => {
    const count = vi.fn().mockResolvedValue(1);
    const findMany = vi.fn().mockResolvedValue([entry({
      entryType: "document_evidence",
      evidenceRef: {
        source: "r2_document_pipeline",
        status: "queued",
        file: { name: "case.pdf", mimeType: "application/pdf", sizeBytes: 10, objectKey: "document-inbox/private", etag: "secret-locator" },
      },
    })]);
    const prisma = { seguimientoEntry: { count, findMany } } as unknown as PrismaClient;

    const result = await listSeguimientoEntries(prisma, "sx-1", "co-1");
    expect(result.entries[0].evidenceRef).not.toHaveProperty("file.objectKey");
    expect(result.entries[0].evidenceRef).not.toHaveProperty("file.etag");
  });

  it("uses the company, surgery, and entry predicates before a note update", async () => {
    const { prisma, findFirst, update } = prismaForEdit(entry());

    await editSeguimientoEntry(prisma, "seg-1", "co-1", {
      surgeryId: "sx-1",
      actor,
      edits: { content: "Texto actualizado" },
    });

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "seg-1", companyId: "co-1", surgeryId: "sx-1" },
    }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "seg-1" } }));
  });

  it("returns a scoped not-found error without writes", async () => {
    const { prisma, update } = prismaForEdit(null);

    await expect(editSeguimientoEntry(prisma, "seg-other", "co-1", {
      surgeryId: "sx-1",
      actor,
      edits: { content: "No debe escribir" },
    })).rejects.toMatchObject({ status: 404, code: "seguimiento_entry_not_found" });

    expect(update).not.toHaveBeenCalled();
    expect(prisma.userCompanyAccess.findMany).not.toHaveBeenCalled();
  });

  it("rejects immutable authorization evidence and other non-notes before side effects", async () => {
    for (const [entryType, code] of [
      ["authorization_evidence", "authorization_evidence_immutable"],
      ["mail_evidence", "seguimiento_entry_not_editable"],
    ]) {
      const { prisma, update } = prismaForEdit(entry({ entryType }));
      await expect(editSeguimientoEntry(prisma, "seg-1", "co-1", {
        surgeryId: "sx-1",
        actor,
        edits: { content: "No permitido" },
      })).rejects.toMatchObject({ status: 409, code });
      expect(update).not.toHaveBeenCalled();
      expect(prisma.userCompanyAccess.findMany).not.toHaveBeenCalled();
    }
  });

  it("preserves unknown metadata and appends one immutable snapshot for changed supplied fields", async () => {
    const oldImage = { source: "manual_event_edit", fileCount: 1, files: [{ mimeType: "image/png" }] };
    const oldMentions = [{ userId: "user-1", displayName: "Ana Test", companyId: "co-1" }];
    const { prisma, update } = prismaForEdit(entry({
      evidenceRef: { imported: { mailId: "mail-1" }, priority: "baja", highlighted: false, mentions: oldMentions, imageEvidence: oldImage, editHistory: [{ legacy: true }] },
    }));
    const newImage = [{ mimeType: "image/jpeg", previewDataUrl: "data:image/jpeg;base64,new" }];

    await editSeguimientoEntry(prisma, "seg-1", "co-1", {
      surgeryId: "sx-1",
      actor,
      edits: {
        content: "Texto actualizado",
        priority: "alta",
        highlighted: true,
        mentions: [{ userId: "user-2", displayName: "Luis Test", companyId: "co-1" }],
        imageEvidence: { files: newImage },
      },
    });

    const data = update.mock.calls[0][0].data;
    expect(data.evidenceRef).toMatchObject({
      imported: { mailId: "mail-1" },
      priority: "alta",
      highlighted: true,
      mentions: [{ userId: "user-2", displayName: "Luis Test", companyId: "co-1" }],
      imageEvidence: { source: "manual_event_edit", fileCount: 1, files: newImage },
    });
    expect(data.evidenceRef.editHistory).toHaveLength(2);
    expect(data.evidenceRef.editHistory[1]).toMatchObject({
      action: "event_edited",
      actor,
      previous: {
        content: "Texto original",
        priority: "baja",
        highlighted: false,
        mentions: oldMentions,
        imageEvidence: oldImage,
      },
    });
    expect(prisma.internalNotification.createMany).toHaveBeenCalledTimes(1);
  });

  it("updates only noteType metadata and snapshots it only when it changes", async () => {
    const { prisma, update } = prismaForEdit(entry({
      evidenceRef: { source: "manual", noteType: "general", priority: "media", editHistory: [{ legacy: true }] },
    }));

    await editSeguimientoEntry(prisma, "seg-1", "co-1", {
      surgeryId: "sx-1", actor, edits: { noteType: "urgente" },
    });

    const data = update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("entryType");
    expect(data).not.toHaveProperty("content");
    expect(data).not.toHaveProperty("summary");
    expect(data.evidenceRef).toMatchObject({ source: "manual", noteType: "urgente", priority: "media" });
    expect(data.evidenceRef.editHistory[1].previous).toEqual({ noteType: "general" });

    const unchanged = prismaForEdit(entry({ evidenceRef: { noteType: "urgente" } }));
    await expect(editSeguimientoEntry(unchanged.prisma, "seg-1", "co-1", {
      surgeryId: "sx-1", actor, edits: { noteType: "urgente" },
    })).rejects.toMatchObject({ status: 400, code: "no_changes" });
    expect(unchanged.update).not.toHaveBeenCalled();
  });

  it("removes image evidence only for an explicit empty replacement and preserves it when omitted", async () => {
    const imageEvidence = { source: "manual_event_edit", fileCount: 1, files: [{ mimeType: "image/png" }] };
    const removed = prismaForEdit(entry({ evidenceRef: { imageEvidence } }));
    await editSeguimientoEntry(removed.prisma, "seg-1", "co-1", {
      surgeryId: "sx-1", actor, edits: { imageEvidence: { files: [] } },
    });
    expect(removed.update.mock.calls[0][0].data.evidenceRef.imageEvidence).toBeUndefined();

    const omitted = prismaForEdit(entry({ evidenceRef: { imageEvidence } }));
    await editSeguimientoEntry(omitted.prisma, "seg-1", "co-1", {
      surgeryId: "sx-1", actor, edits: { summary: "Nuevo resumen" },
    });
    expect(omitted.update.mock.calls[0][0].data.evidenceRef.imageEvidence).toEqual(imageEvidence);
  });

  it("rejects no-op edits without updating, history, or notifications", async () => {
    const { prisma, update } = prismaForEdit(entry({ evidenceRef: { priority: "alta", highlighted: true } }));

    await expect(editSeguimientoEntry(prisma, "seg-1", "co-1", {
      surgeryId: "sx-1", actor,
      edits: { content: "Texto original", summary: "Resumen original", priority: "alta", highlighted: true },
    })).rejects.toMatchObject({ status: 400, code: "no_changes" });

    expect(update).not.toHaveBeenCalled();
    expect(prisma.internalNotification.createMany).not.toHaveBeenCalled();
  });

  it("creates source-linked immutable authorization evidence without changing the source or Surgery", async () => {
    const source = entry({ id: "source-1", entryType: "mail_evidence", evidenceRef: { importId: "mail-1" } });
    const findFirst = vi.fn().mockResolvedValue(source);
    const create = vi.fn().mockImplementation(async ({ data }) => entry({ id: "auth-1", ...data }));
    const prisma = {
      $transaction: vi.fn(async (callback) => callback(prisma)),
      seguimientoEntry: { findFirst, create },
      surgery: { update: vi.fn() },
    } as unknown as PrismaClient;

    const authorizationInput = {
      sourceEntryId: "source-1", surgeryId: "sx-1", companyId: "co-1", actor,
      input: { content: "Autorización registrada", imageEvidence: { files: [{ mimeType: "image/png", previewDataUrl: "data:image/png;base64,x" }] } },
    };
    await createAuthorizationEvidence(prisma, authorizationInput);
    await createAuthorizationEvidence(prisma, authorizationInput);

    expect(findFirst).toHaveBeenCalledWith({ where: { id: "source-1", companyId: "co-1", surgeryId: "sx-1" } });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      entryType: "authorization_evidence", companyId: "co-1", surgeryId: "sx-1", authorId: "user-10",
      evidenceRef: expect.objectContaining({ action: "authorization_recorded", sourceEntryId: "source-1", imageEvidence: expect.objectContaining({ source: "authorization_recorded", fileCount: 1 }) }),
    }) }));
    expect(create).toHaveBeenCalledTimes(2);
    expect(source).toMatchObject({ entryType: "mail_evidence", evidenceRef: { importId: "mail-1" } });
    expect(prisma.surgery.update).not.toHaveBeenCalled();
  });

  it("rejects a missing or authorization-evidence source without creating a row", async () => {
    for (const [source, status, code] of [
      [null, 404, "seguimiento_entry_not_found"],
      [entry({ entryType: "authorization_evidence" }), 409, "authorization_evidence_invalid_source"],
    ] as const) {
      const create = vi.fn();
      const prisma = {
        $transaction: vi.fn(async (callback) => callback(prisma)),
        seguimientoEntry: { findFirst: vi.fn().mockResolvedValue(source), create },
      } as unknown as PrismaClient;
      await expect(createAuthorizationEvidence(prisma, {
        sourceEntryId: "source-1", surgeryId: "sx-1", companyId: "co-1", actor, input: { content: "Autorizada" },
      })).rejects.toMatchObject({ status, code });
      expect(create).not.toHaveBeenCalled();
    }
  });

  it("creates a closed server-only availability_event in the caller transaction", async () => {
    const create = vi.fn().mockResolvedValue({ id: "seg-availability-1" });
    const tx = { seguimientoEntry: { create } } as unknown as Prisma.TransactionClient;

    await createAvailabilitySeguimientoEvent({
      tx,
      companyId: "co-1",
      surgeryId: "sx-1",
      requestId: "request-1",
      actorUserId: "user-10",
      correlationId: "correlation-1",
      auditEventId: "audit-1",
      event: "completed",
      content: "Nora Test estableció disponibilidad para el 24/07/2026",
      oldDate: null,
      newDate: "2026-07-24",
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        surgeryId: "sx-1",
        companyId: "co-1",
        entryType: "availability_event",
        content: "Nora Test estableció disponibilidad para el 24/07/2026",
        summary: null,
        authorId: "user-10",
        evidenceRef: {
          source: "availability_request",
          event: "completed",
          requestId: "request-1",
          auditEventId: "audit-1",
          correlationId: "correlation-1",
          oldDate: null,
          newDate: "2026-07-24",
        },
      },
    });
    expect(tx).not.toHaveProperty("$transaction");
  });

  it("generates fixed requested and PÍVOT transfer copy when callers need no dynamic actor copy", async () => {
    const create = vi.fn().mockResolvedValue({ id: "seg-availability-1" });
    const tx = { seguimientoEntry: { create } } as unknown as Prisma.TransactionClient;

    await createAvailabilitySeguimientoEvent({
      tx,
      companyId: "co-1",
      surgeryId: "sx-1",
      requestId: "request-1",
      actorUserId: "user-10",
      correlationId: "correlation-1",
      auditEventId: "audit-requested",
      event: "requested",
    });
    await createAvailabilitySeguimientoEvent({
      tx,
      companyId: "co-1",
      surgeryId: "sx-1",
      requestId: "request-1",
      actorUserId: "user-10",
      correlationId: "correlation-2",
      auditEventId: "audit-transfer",
      event: "pivot_transferred",
    });

    expect(create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({
        content: "Se solicitó fecha de disponibilidad del material",
      }),
    }));
    expect(create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({
        content: "Se reasignó el PÍVOT de la solicitud de disponibilidad",
      }),
    }));
  });

  it("rejects generic creation and editing of protected availability events", async () => {
    const genericCreate = vi.fn();
    const genericPrisma = {
      $transaction: vi.fn(),
      seguimientoEntry: { create: genericCreate },
    } as unknown as PrismaClient;
    await expect(createSeguimientoEntry(genericPrisma, {
      surgeryId: "sx-1",
      companyId: "co-1",
      entryType: "availability_event",
      content: "Contenido forzado por cliente",
      authorId: "forged-user",
      evidenceRef: { auditEventId: "forged-audit" },
    })).rejects.toMatchObject({
      status: 409,
      code: "availability_event_server_only",
    });
    expect(genericPrisma.$transaction).not.toHaveBeenCalled();
    expect(genericCreate).not.toHaveBeenCalled();

    const protectedEdit = prismaForEdit(entry({ entryType: "availability_event" }));
    await expect(editSeguimientoEntry(protectedEdit.prisma, "seg-1", "co-1", {
      surgeryId: "sx-1",
      actor,
      edits: { content: "Mutación forzada" },
    })).rejects.toMatchObject({
      status: 409,
      code: "availability_event_immutable",
    });
    expect(protectedEdit.update).not.toHaveBeenCalled();
  });

  it("does not expose a generic delete operation for protected events", async () => {
    const serviceModule = await import("@/lib/services/seguimiento.service");
    expect("deleteSeguimientoEntry" in serviceModule).toBe(false);
  });
});
