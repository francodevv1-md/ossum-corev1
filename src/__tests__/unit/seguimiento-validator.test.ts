import { describe, expect, it } from "vitest";
import {
  validateSeguimientoAuthorizationCreateBody,
  validateSeguimientoCreateBody,
  validateSeguimientoEditBody,
} from "@/lib/validators/seguimiento.validator";

const image = {
  mimeType: "image/jpeg",
  previewDataUrl: "data:image/jpeg;base64,a",
};

describe("seguimiento.validator", () => {
  it("accepts bounded file_photo_evidence payloads", () => {
    const body = validateSeguimientoCreateBody({
      entryType: "file_photo_evidence",
      content: "Se cargó evidencia visual manual.",
      summary: "foto-1.jpg",
      evidenceRef: {
        source: "manual_upload",
        fileCount: 1,
        files: [{ ...image, name: "foto-1.jpg", sizeBytes: 192, width: 1200, height: 900 }],
      },
    });

    expect(body.entryType).toBe("file_photo_evidence");
    expect(body.evidenceRef).toMatchObject({ fileCount: 1 });
  });

  it("preserves legacy photo evidence non-empty, count, and bound validation", () => {
    for (const evidenceRef of [
      { fileCount: 0, files: [] },
      { fileCount: 2, files: [image] },
      { fileCount: 5, files: Array.from({ length: 5 }, () => image) },
      {
        fileCount: 3,
        files: Array.from({ length: 3 }, () => ({
          ...image,
          previewDataUrl: `data:image/jpeg;base64,${"a".repeat(390_000)}`,
        })),
      },
    ]) {
      expect(() =>
        validateSeguimientoCreateBody({
          entryType: "file_photo_evidence",
          content: "Carga inválida.",
          evidenceRef,
        })
      ).toThrow();
    }
  });

  it("normalizes and company-scopes mentions for create and edits", () => {
    expect(
      validateSeguimientoCreateBody(
        {
          entryType: "note",
          content: "Coordinar con @Ana",
          mentions: [
            { userId: "user-1", displayName: "Ana Test", companyId: "co-1" },
            { userId: "user-1", displayName: "Ana Duplicada", companyId: "co-1" },
          ],
        },
        { companyId: "co-1" }
      ).mentions
    ).toEqual([{ userId: "user-1", displayName: "Ana Duplicada", companyId: "co-1" }]);

    expect(() =>
      validateSeguimientoEditBody(
        { mentions: [{ userId: "user-1", displayName: "Ana", companyId: "co-2" }] },
        { companyId: "co-1" }
      )
    ).toThrow(/must match the entry company/i);
  });

  it("accepts exact edit priority, boolean, explicit empty summary, and mentions", () => {
    expect(
      validateSeguimientoEditBody(
        {
          summary: "",
          priority: "alta",
          highlighted: false,
          mentions: [{ userId: "user-1", displayName: "Ana", companyId: "co-1" }],
        },
        { companyId: "co-1" }
      )
    ).toMatchObject({ summary: "", priority: "alta", highlighted: false });

    for (const body of [{ priority: "urgent" }, { priority: true }, { highlighted: "false" }, {}]) {
      expect(() => validateSeguimientoEditBody(body)).toThrow();
    }
  });

  it("accepts only the existing Spanish noteType tokens for edits", () => {
    for (const noteType of ["general", "urgente", "facturacion", "logistica", "coordinacion"] as const) {
      expect(validateSeguimientoEditBody({ noteType })).toMatchObject({ noteType });
    }

    for (const noteType of ["urgent", "billing", "logistics", "coordination", "other"]) {
      expect(() => validateSeguimientoEditBody({ noteType })).toThrow(/noteType must be one of/i);
    }
  });

  it("distinguishes omitted, replacement, and removal image evidence for edits", () => {
    expect(validateSeguimientoEditBody({ content: "Sin imágenes nuevas" }).imageEvidence).toBeUndefined();
    expect(
      validateSeguimientoEditBody({ imageEvidence: { files: [image] } }).imageEvidence
    ).toEqual({ files: [image] });
    expect(
      validateSeguimientoEditBody({ imageEvidence: { files: [] } }).imageEvidence
    ).toEqual({ files: [] });
  });

  it("enforces malformed files and every image bound for edit and authorization requests", () => {
    const invalidEvidence = [
      null,
      {},
      { files: [{}] },
      { files: [{ mimeType: "text/plain", previewDataUrl: image.previewDataUrl }] },
      { files: [{ mimeType: image.mimeType, previewDataUrl: "https://example.test/a.jpg" }] },
      { files: Array.from({ length: 5 }, () => image) },
      { files: [{ ...image, previewDataUrl: `data:image/jpeg;base64,${"a".repeat(400_001)}` }] },
      {
        files: Array.from({ length: 3 }, () => ({
          ...image,
          previewDataUrl: `data:image/jpeg;base64,${"a".repeat(390_000)}`,
        })),
      },
      { files: [{ ...image, width: Number.POSITIVE_INFINITY }] },
    ];

    for (const imageEvidence of invalidEvidence) {
      expect(() => validateSeguimientoEditBody({ imageEvidence })).toThrow();
      expect(() =>
        validateSeguimientoAuthorizationCreateBody({ content: "Autorización.", imageEvidence })
      ).toThrow();
    }
  });

  it("accepts narrow authorization creation with zero to four bounded images", () => {
    expect(
      validateSeguimientoAuthorizationCreateBody({
        content: "  Autorización registrada.  ",
        summary: "",
        imageEvidence: { files: [] },
      })
    ).toEqual({ content: "Autorización registrada.", summary: "", imageEvidence: { files: [] } });

    expect(
      validateSeguimientoAuthorizationCreateBody({
        content: "Autorización con imagen.",
        imageEvidence: { files: [image] },
      }).imageEvidence
    ).toEqual({ files: [image] });
  });

  it("rejects missing authorization content and client-controlled body fields", () => {
    expect(() => validateSeguimientoAuthorizationCreateBody({ content: "  " })).toThrow(
      /content is required/i
    );

    for (const forbiddenField of [
      "sourceEntryId",
      "entryType",
      "authorId",
      "companyId",
      "surgeryId",
      "priority",
      "highlighted",
      "mentions",
      "evidenceRef",
      "autorizado",
    ]) {
      expect(() =>
        validateSeguimientoAuthorizationCreateBody({
          content: "Autorización.",
          [forbiddenField]: "client-controlled",
        })
      ).toThrow(/does not accept/i);
    }
  });
});
