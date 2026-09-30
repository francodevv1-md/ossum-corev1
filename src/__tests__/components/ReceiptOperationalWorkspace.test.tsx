import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReceiptOperationalWorkspace } from "@/components/stock/ReceiptOperationalWorkspace";
import { apiFetch } from "@/lib/api/client";

const auth = vi.hoisted(() => ({
  current: {
    activeCompany: { id: "company-1", name: "Empresa Test" },
    currentUser: { id: "user-1" },
    currentUserLoading: false,
    isLoading: false,
  },
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => auth.current,
}));

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(),
  ApiClientError: class ApiClientError extends Error {
    status: number;
    code: string;
    constructor(message: string, status = 500, code = "error") {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
}));

describe("ReceiptOperationalWorkspace Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders phase 1 document loading, switches to manual review, and creates draft", async () => {
    const mockReceipt = {
      id: "rec-123",
      status: "PREPARED",
      documentReference: "REM-9988",
      lines: [
        {
          id: "line-1",
          lineNumber: 1,
          articleId: null,
          requestedQuantity: "2",
          expectedQuantity: "2",
          receivedQuantity: "0",
          expectedCode: "SKU-001",
          expectedDescription: "Placa titanio",
          lotCode: "LOT-A",
          serialNumber: null,
          expirationDate: "2027-12-31",
          resolutionStatus: "RESOLVED",
          scans: [],
        },
      ],
    };

    vi.mocked(apiFetch).mockResolvedValueOnce(mockReceipt);

    render(<ReceiptOperationalWorkspace />);

    expect(screen.getByText("1. Cargar remito proveedor")).toBeInTheDocument();

    // Click "Cargar manualmente"
    fireEvent.click(screen.getByRole("button", { name: /cargar manualmente/i }));

    expect(screen.getByText("2. Revisar remito esperado")).toBeInTheDocument();

    // Fill line inputs
    const codeInput = screen.getByLabelText("Código línea 1");
    fireEvent.change(codeInput, { target: { value: "SKU-001" } });

    const descInput = screen.getByLabelText("Descripción línea 1");
    fireEvent.change(descInput, { target: { value: "Placa titanio" } });

    const qtyInput = screen.getByLabelText("Cantidad línea 1");
    fireEvent.change(qtyInput, { target: { value: "2" } });

    // Click "Iniciar recepción"
    fireEvent.click(screen.getByRole("button", { name: /iniciar recepción/i }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/companies/company-1/receipts",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    const callArgs = vi.mocked(apiFetch).mock.calls[0];
    const sentBody = JSON.parse((callArgs[1] as any).body);
    expect(sentBody.expectedLines).toHaveLength(1);
    expect(sentBody.expectedLines[0]).toMatchObject({
      code: "SKU-001",
      description: "Placa titanio",
      expectedQuantity: "2",
    });

    expect(await screen.findByText("rec-123")).toBeInTheDocument();
    expect(screen.getByText("Preparada")).toBeInTheDocument();
  });

  it("handles scanning an item, updating received quantities and differences", async () => {
    const initialReceipt = {
      id: "rec-123",
      status: "PREPARED",
      documentReference: "REM-9988",
      lines: [
        {
          id: "line-1",
          lineNumber: 1,
          articleId: "art-1",
          requestedQuantity: "2",
          expectedQuantity: "2",
          receivedQuantity: "0",
          expectedCode: "SKU-001",
          expectedDescription: "Placa titanio",
          lotCode: null,
          serialNumber: null,
          expirationDate: null,
          resolutionStatus: "RESOLVED",
          scans: [],
        },
      ],
    };

    const scanResult = {
      event: {
        id: "scan-1",
        rawValue: "(01)07798123456789",
        resolutionStatus: "RESOLVED",
        articleId: "art-1",
        lotCode: "LOT-X",
        serialNumber: null,
        expirationDate: null,
        quantity: "1",
      },
      status: "RESOLVED",
      candidates: [{ id: "art-1", sku: "SKU-001", description: "Placa titanio" }],
      line: {
        id: "line-1",
        lineNumber: 1,
        articleId: "art-1",
        requestedQuantity: "2",
        expectedQuantity: "2",
        receivedQuantity: "1",
        expectedCode: "SKU-001",
        expectedDescription: "Placa titanio",
        lotCode: "LOT-X",
        serialNumber: null,
        expirationDate: null,
        resolutionStatus: "RESOLVED",
        scans: [
          {
            id: "scan-1",
            rawValue: "(01)07798123456789",
            resolutionStatus: "RESOLVED",
            articleId: "art-1",
            lotCode: "LOT-X",
            serialNumber: null,
            expirationDate: null,
            quantity: "1",
          },
        ],
      },
    };

    vi.mocked(apiFetch).mockResolvedValueOnce(scanResult);

    render(<ReceiptOperationalWorkspace initialReceipt={initialReceipt} />);

    const scanInput = screen.getByLabelText("Código escaneado");
    fireEvent.change(scanInput, { target: { value: "(01)07798123456789" } });

    fireEvent.click(screen.getByRole("button", { name: /registrar/i }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/companies/company-1/receipts/rec-123/scan",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ rawValue: "(01)07798123456789" }),
        })
      );
    });

    expect(await screen.findByText(/recibido 1 de 2/i)).toBeInTheDocument();
  });

  it("handles pending scan and links with explicit existing article ID", async () => {
    const initialReceipt = {
      id: "rec-123",
      status: "IN_CONTROL",
      lines: [],
    };

    const pendingScanResult = {
      event: {
        id: "scan-pending-1",
        rawValue: "UNKNOWN-CODE",
        resolutionStatus: "PENDING",
        articleId: null,
        lotCode: null,
        serialNumber: null,
        expirationDate: null,
        quantity: "1",
      },
      status: "PENDING",
      candidates: [],
    };

    const resolvedResult = {
      event: {
        id: "scan-pending-1",
        rawValue: "UNKNOWN-CODE",
        resolutionStatus: "RESOLVED",
        articleId: "art-explicit-1",
        lotCode: null,
        serialNumber: null,
        expirationDate: null,
        quantity: "1",
      },
      line: {
        id: "line-new-1",
        lineNumber: 1,
        articleId: "art-explicit-1",
        requestedQuantity: "0",
        expectedQuantity: null,
        receivedQuantity: "1",
        expectedCode: "SKU-EXPLICIT",
        expectedDescription: "Clavo intramedular",
        lotCode: null,
        serialNumber: null,
        expirationDate: null,
        resolutionStatus: "RESOLVED",
        scans: [
          {
            id: "scan-pending-1",
            rawValue: "UNKNOWN-CODE",
            resolutionStatus: "RESOLVED",
            articleId: "art-explicit-1",
            lotCode: null,
            serialNumber: null,
            expirationDate: null,
            quantity: "1",
          },
        ],
      },
    };

    vi.mocked(apiFetch)
      .mockResolvedValueOnce(pendingScanResult)
      .mockResolvedValueOnce(resolvedResult);

    render(<ReceiptOperationalWorkspace initialReceipt={initialReceipt} />);

    // Scan unknown code
    const scanInput = screen.getByLabelText("Código escaneado");
    fireEvent.change(scanInput, { target: { value: "UNKNOWN-CODE" } });
    fireEvent.click(screen.getByRole("button", { name: /registrar/i }));

    expect(await screen.findByText(/el escaneo quedó guardado con sus datos de trazabilidad/i)).toBeInTheDocument();

    // Resolve with article ID
    const articleInput = screen.getByLabelText("Artículo existente");
    fireEvent.change(articleInput, { target: { value: "art-explicit-1" } });
    fireEvent.click(screen.getByRole("button", { name: /vincular con artículo existente/i }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/companies/company-1/receipts/rec-123/scans/scan-pending-1/resolve",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ articleId: "art-explicit-1" }),
        })
      );
    });

    expect(await screen.findByText("Clavo intramedular")).toBeInTheDocument();
  });

  it("confirms receipt and updates status to Confirmada", async () => {
    const initialReceipt = {
      id: "rec-123",
      status: "IN_CONTROL",
      documentReference: "REM-001",
      lines: [
        {
          id: "line-1",
          lineNumber: 1,
          articleId: "art-1",
          requestedQuantity: "1",
          expectedQuantity: "1",
          receivedQuantity: "1",
          expectedCode: "SKU-001",
          expectedDescription: "Placa titanio",
          lotCode: "L1",
          serialNumber: null,
          expirationDate: null,
          resolutionStatus: "RESOLVED",
          scans: [],
        },
      ],
    };

    const confirmedReceipt = {
      ...initialReceipt,
      status: "CONFIRMED",
    };

    vi.mocked(apiFetch).mockResolvedValueOnce(confirmedReceipt);

    render(<ReceiptOperationalWorkspace initialReceipt={initialReceipt} />);

    const confirmBtn = screen.getByRole("button", { name: /confirmar recepción/i });
    expect(confirmBtn).toBeEnabled();

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/companies/company-1/receipts/rec-123",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ action: "confirm" }),
        })
      );
    });

    expect(await screen.findByText("Confirmada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirmar recepción/i })).not.toBeInTheDocument();
  });
});
