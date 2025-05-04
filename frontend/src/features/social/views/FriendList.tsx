import { useEffect, useState } from "react";

// 👉 Tipo para un amigo
interface Friend {
  _id: string;
  name?: string;
  email: string;
}

export default function FriendList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const fetchFriends = async () => {
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/friends", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setFriends(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteFriend = async (friendId: string, friendEmail: string) => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar a ${friendEmail} de tus amigos?`
    );
    if (!confirmDelete) return;

    setError("");
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/friends/${friendId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessage(`✅ ${friendEmail} fue eliminado correctamente.`);
      fetchFriends(); // recarga la lista
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Mis Amigos</h2>

        {error && <p className="text-red-600 mb-2">{error}</p>}
        {message && <p className="text-green-600 mb-2">{message}</p>}

        {friends.length === 0 ? (
          <p className="text-gray-500">No tienes amigos aún.</p>
        ) : (
          friends.map((friend) => (
            <div
              key={friend._id}
              className="bg-gray-50 border rounded p-3 mb-2 text-left"
            >
              <p>
                <strong>Nombre:</strong> {friend.name || "Sin nombre"}
              </p>
              <p>
                <strong>Email:</strong> {friend.email}
              </p>
              <button
                onClick={() => handleDeleteFriend(friend._id, friend.email)}
                className="mt-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
              >
                Eliminar amigo
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
