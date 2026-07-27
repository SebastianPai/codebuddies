// src/game/network/apps.ts   (o donde tengas la carpeta network)

const APP_URL = process.env.NEXT_PUBLIC_API_URL!;

export async function createApp(
  type: "DELIVERY" | "ECOMMERCE" | "SOCIAL" = "DELIVERY",
) {
  const res = await fetch(`${APP_URL}/apps`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(err);
    throw new Error(err.message || "Error creando app");
  }

  return res.json();
}

export async function getMyApps() {
  const res = await fetch(`${APP_URL}/apps/me`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Error obteniendo tus apps");
  }

  return res.json();
}

// ←←← NUEVA FUNCIÓN
export async function getAppById(appId: string) {
  const res = await fetch(`${APP_URL}/apps/${appId}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Error obteniendo la app");
  }

  return res.json();
}

// ←←← NUEVA FUNCIÓN
export async function updateAppLogic(appId: string, logic: any) {
  const res = await fetch(`${APP_URL}/apps/${appId}/logic`, {
    method: "PUT", // ← Usamos PUT como definimos en el controller
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ logic }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Error actualizando lógica");
  }

  return res.json();
}

// ←←← NUEVA FUNCIÓN
export async function publishApp(appId: string) {
  const res = await fetch(`${APP_URL}/apps/${appId}/publish`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Error al publicar la app");
  }

  return res.json();
}
