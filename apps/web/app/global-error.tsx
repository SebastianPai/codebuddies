"use client";

// Último recurso: falló el layout raíz (sin providers ni estilos de tema),
// así que trae su propio <html>/<body> y no puede usar i18n.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0c0e12",
          color: "#f5f5f5",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>
            Algo salió mal · Something went wrong
          </h1>
          <p style={{ color: "#a1a1aa", marginBottom: 24 }}>
            Probá recargar la página. · Please reload the page.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#facc15",
              color: "#000",
              border: 0,
              borderRadius: 12,
              padding: "12px 20px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Reintentar · Retry
          </button>
        </div>
      </body>
    </html>
  );
}
