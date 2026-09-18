"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ color: "#dc2626", marginBottom: "1rem" }}>Error en la aplicación</h2>
          <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
            Se produjo un error inesperado. Intente recargar la página.
          </p>
          {error?.message && (
            <pre style={{ background: "#f3f4f6", padding: "1rem", borderRadius: 8, fontSize: 13, overflow: "auto" }}>
              {error.message}
            </pre>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 1.5rem",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
