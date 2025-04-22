import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

// Tipos para amigo y formulario
interface Friend {
  _id: string;
  name: string;
  email: string;
}

interface NewFriend {
  name: string;
  email: string;
}

export default function Friends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [newFriend, setNewFriend] = useState<NewFriend>({
    name: "",
    email: "",
  });

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get<Friend[]>(
          "http://localhost:5000/api/friends",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setFriends(res.data);
      } catch (err) {
        console.error("Error al obtener amigos", err);
      }
    };

    fetchFriends();
  }, []);

  const handleAddFriend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post<Friend>(
        "http://localhost:5000/api/friends",
        newFriend,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setFriends([...friends, res.data]);
      setNewFriend({ name: "", email: "" });
    } catch (err) {
      console.error("Error al agregar amigo", err);
    }
  };

  const handleDeleteFriend = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/friends/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFriends(friends.filter((friend) => friend._id !== id));
    } catch (err) {
      console.error("Error al eliminar amigo", err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">👥 Tus amigos</h1>

      <form onSubmit={handleAddFriend} className="mb-4 space-y-2">
        <input
          type="text"
          placeholder="Nombre"
          value={newFriend.name}
          onChange={(e) => setNewFriend({ ...newFriend, name: e.target.value })}
          className="border rounded p-2 w-full"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={newFriend.email}
          onChange={(e) =>
            setNewFriend({ ...newFriend, email: e.target.value })
          }
          className="border rounded p-2 w-full"
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ➕ Agregar amigo
        </button>
      </form>

      <ul className="space-y-2">
        {friends.map((friend) => (
          <li
            key={friend._id}
            className="flex justify-between items-center bg-gray-100 p-3 rounded"
          >
            <div>
              <strong>{friend.name}</strong> - {friend.email}
            </div>
            <button
              onClick={() => handleDeleteFriend(friend._id)}
              className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
