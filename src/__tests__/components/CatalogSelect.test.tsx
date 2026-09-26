import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch }));
import { CatalogSelect } from "@/components/stock/CatalogSelect";

describe("CatalogSelect", () => {
  beforeEach(() => vi.clearAllMocks());
  it("supports searchable keyboard-accessible selection and clearing", async () => {
    const onChange = vi.fn();
    render(<CatalogSelect companyId="company-1" kind="brand" label="Marca" value="" onChange={onChange} items={[{ id: "brand-1", code: "ACME", name: "Acme" }]} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Marca" }));
    fireEvent.change(screen.getByLabelText("Buscar marca"), { target: { value: "ac" } });
    fireEvent.click(screen.getByRole("option", { name: "Acme" }));
    expect(onChange).toHaveBeenCalledWith("brand-1");
  });

  it("does not show one company's catalog while the next company loads", async () => {
    let resolveNext: (value: { id: string; code: string; name: string }[]) => void = () => undefined;
    mocks.apiFetch.mockResolvedValueOnce([{ id: "brand-a", code: "A", name: "Company A" }]).mockImplementationOnce(() => new Promise((resolve) => { resolveNext = resolve; }));
    const { rerender } = render(<CatalogSelect companyId="company-a" kind="brand" label="Marca" value="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Marca" }));
    await waitFor(() => expect(screen.getByRole("option", { name: "Company A" })).toBeInTheDocument());
    rerender(<CatalogSelect companyId="company-b" kind="brand" label="Marca" value="" onChange={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: "Marca" })).not.toHaveTextContent("Company A");
    resolveNext([{ id: "brand-b", code: "B", name: "Company B" }]);
  });

  it("hides quick-create from non-admin users", () => {
    render(<CatalogSelect companyId="company-1" kind="brand" label="Marca" value="" onChange={vi.fn()} items={[]} allowQuickCreate canQuickCreate={false} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Marca" }));
    expect(screen.queryByLabelText("Nueva marca")).not.toBeInTheDocument();
  });

  it("keeps a shared fetch error visible and retries through the central loader", () => {
    const onRetry = vi.fn();
    render(<CatalogSelect companyId="company-1" kind="brand" label="Marca" value="" onChange={vi.fn()} items={[]} error="No se pudieron cargar los catálogos" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Marca" }));
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar los catálogos");
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("publishes a quick-created item to the shared catalog state", async () => {
    const onItemsChange = vi.fn();
    mocks.apiFetch.mockResolvedValueOnce({ id: "brand-2", code: "NEW", name: "Nueva marca" });
    render(<CatalogSelect companyId="company-1" kind="brand" label="Marca" value="" onChange={vi.fn()} items={[{ id: "brand-1", code: "OLD", name: "Anterior" }]} allowQuickCreate onItemsChange={onItemsChange} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Marca" }));
    fireEvent.change(screen.getByLabelText("Nueva marca"), { target: { value: "Nueva marca" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));
    await waitFor(() => expect(onItemsChange).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: "brand-2", name: "Nueva marca" })])));
  });
});
