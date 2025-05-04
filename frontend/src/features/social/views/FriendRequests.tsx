import { useEffect, useState } from "react";

// Tipo para la solicitud de amistad
interface FriendRequest {
  _id: string;
  requester: {
    email: string;
  };
}

export default function FriendRequests() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const fetchRequests = async () => {
    setError("");
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        "http://localhost:5000/api/friend-requests/requests",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setRequests(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const respondToRequest = async (
    friendId: string,
    action: "accepted" | "rejected"
  ) => {
    setError("");
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        "http://localhost:5000/api/friend-requests/respond",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ requestId: friendId, action }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessage(
        `Solicitud ${
          action === "accepted" ? "aceptada" : "rechazada"
        } correctamente`
      );
      fetchRequests(); // refrescar lista
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Solicitudes Recibidas</h2>

        {error && <p className="text-red-600 mb-2">{error}</p>}
        {message && <p className="text-green-600 mb-2">{message}</p>}

        {requests.length === 0 ? (
          <p className="text-gray-500">No tienes solicitudes pendientes.</p>
        ) : (
          requests.map((req) => (
            <div
              key={req._id}
              className="bg-gray-50 border rounded p-3 mb-2 text-left"
            >
              <p>
                <strong>Email:</strong> {req.requester?.email}
              </p>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => respondToRequest(req._id, "accepted")}
                  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                >
                  Aceptar
                </button>
                <button
                  onClick={() => respondToRequest(req._id, "rejected")}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
