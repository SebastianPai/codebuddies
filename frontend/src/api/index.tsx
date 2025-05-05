const API_URL: string = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Definir un tipo para los errores de la API
interface ApiError extends Error {
  message: string;
}

// Función para hacer solicitudes GET
export const apiGet = async <T,>(
  endpoint: string,
  token?: string,
  options: RequestInit = {}
): Promise<T> => {
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    const error: ApiError = new Error(data.message || "Error en la solicitud");
    throw error;
  }
  return data as T;
};

// Función para hacer solicitudes POST/PUT
export const apiPost = async <T,>(
  endpoint: string,
  body: any,
  method: "POST" | "PUT" = "POST",
  token?: string,
  options: RequestInit = {}
): Promise<T> => {
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Establecer Content-Type para JSON, omitir para FormData para permitir multipart/form-data
  const isFormData = body instanceof FormData;
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    method,
    headers,
    body: isFormData ? body : JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    const error: ApiError = new Error(data.message || "Error en la solicitud");
    throw error;
  }
  return data as T;
};
