const API_URL = "http://localhost:5000/api/users";

export async function loginUser(email, password) {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (res.ok) {
    localStorage.setItem("token", data.token); // GUARDAMOS EL TOKEN AQUÍ
  }

  if (!res.ok) {
    throw new Error(data.message || "Error al iniciar sesión");
  }

  return data;
}
