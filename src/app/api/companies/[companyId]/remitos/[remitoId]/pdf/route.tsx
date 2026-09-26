// Temporarily disabled by REMITO-QR-BARCODE-001 containment approval.
// The canonical Remito action remains browser-based `Imprimir / PDF`.
// Do not reactivate until parity, raw-ID containment, and security gates pass.

export async function GET() {
  return Response.json(
    {
      error: {
        code: "remito_pdf_disabled",
        message: "Remito PDF endpoint is not available",
      },
    },
    {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    }
  )
}
