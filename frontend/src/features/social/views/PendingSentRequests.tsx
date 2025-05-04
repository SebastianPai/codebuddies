import { useEffect, useState } from "react";

interface FriendRequest {
  _id: string;
  recipient?: {
    email: string;
  };
}

export default function PendingSentRequests(): JSX.Element {
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const fetchSentRequests = async () => {
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        "http://localhost:5000/api/friend-requests/sent",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSentRequests(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar solicitudes enviadas.");
    }
  };

  const cancelRequest = async (requestId: string) => {
    setError("");
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/friend-requests/${requestId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessage("Solicitud cancelada correctamente.");
      fetchSentRequests();
    } catch (err: any) {
      setError(err.message || "Error al cancelar la solicitud.");
    }
  };

  useEffect(() => {
    fetchSentRequests();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Solicitudes Enviadas</h2>

        {error && <p className="text-red-600 mb-2">{error}</p>}
        {message && <p className="text-green-600 mb-2">{message}</p>}

        {sentRequests.length === 0 ? (
          <p className="text-gray-500">No has enviado solicitudes recientes.</p>
        ) : (
          sentRequests.map((req) => (
            <div
              key={req._id}
              className="bg-gray-50 border rounded p-3 mb-2 text-left"
            >
              <p>
                <strong>Para:</strong> {req.recipient?.email}
              </p>
              <p className="text-yellow-600 font-medium">Estado: pendiente</p>
              <button
                onClick={() => cancelRequest(req._id)}
                className="mt-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
              >
                Cancelar solicitud
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
