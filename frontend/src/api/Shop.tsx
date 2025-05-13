// src/components/Shop.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "react-toastify";
import Navbar from "@/components/common/Navbar";
import { useNavigate } from "react-router-dom";
import { Border, Tag, Power, ActivePower } from "@/types"; // Importar interfaces necesarias

interface ShopItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  type: "life" | "border" | "tag" | "power";
  properties?: { [key: string]: any };
  emoji?: string;
}

const Shop: React.FC = () => {
  const { fetchWithAuth, user, updateUser } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchWithAuth("/api/shop");
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Error al obtener ítems");
        }
        const data = await response.json();
        console.log("Ítems obtenidos:", data); // Para depuración
        setItems(data || []);
      } catch (error: any) {
        setError(error.message || "Error al cargar ítems");
        toast.error(error.message || "Error al cargar ítems");
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [fetchWithAuth]);

  const handlePurchase = async (item: ShopItem) => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.coins < item.price) {
      toast.error("No tienes suficientes monedas.");
      return;
    }

    try {
      const response = await fetchWithAuth("/api/shop/purchase", {
        method: "POST",
        body: JSON.stringify({
          itemId: item._id,
          itemType: item.type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al realizar la compra");
      }

      const data = await response.json();
      updateUser({ coins: user.coins - item.price });

      if (item.type === "border") {
        updateUser({
          activeBorder: {
            id: item._id,
            name: item.name,
            description: item.description,
            properties: item.properties,
            image: item.image,
          } as Border,
        });
      } else if (item.type === "tag") {
        updateUser({
          activeTag: {
            tagId: item._id,
            name: item.name,
            description: item.description,
            properties: item.properties,
            image: item.image,
          } as Tag,
        });
      } else if (item.type === "power") {
        const userResponse = await fetchWithAuth("/api/users/me");
        if (!userResponse.ok) throw new Error("Error al actualizar poderes");
        const userData = await userResponse.json();
        updateUser({
          powers: userData.user.powers as Power[],
          activePowers: userData.user.activePowers as ActivePower[],
        });
      } else if (item.type === "life") {
        updateUser({
          lives: Math.min(user.lives + (item.properties?.amount || 1), 5),
        });
      }

      toast.success(`¡Compraste ${item.name}!`);
    } catch (error: any) {
      console.error("Error en handlePurchase:", error);
      toast.error(error.message || "Error al procesar la compra.");
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col font-mono"
        style={{ background: theme.colors.background }}
      >
        <Navbar />
        <div className="flex justify-center items-center flex-grow">
          <div
            className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"
            style={{ borderColor: theme.colors.accent }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col font-mono"
      style={{ background: theme.colors.background }}
    >
      <Navbar />
      <div className="flex justify-center items-center flex-grow p-4">
        <div
          className="w-full max-w-4xl rounded-xl shadow-lg p-6 md:p-8"
          style={{
            background: theme.colors.card,
            border: `4px solid ${theme.colors.border}`,
          }}
        >
          <div className="flex justify-between items-center mb-6">
            <h1
              className="text-3xl font-bold"
              style={{ color: theme.colors.text }}
            >
              Tienda
            </h1>
            <div
              className="text-lg"
              style={{ color: theme.colors.secondaryText }}
            >
              Monedas: 💰 {user?.coins || 0}
            </div>
          </div>
          {error && (
            <div
              className="p-2 rounded text-center mb-4"
              style={{
                background: theme.colors.error,
                color: theme.colors.buttonText,
              }}
            >
              {error}
            </div>
          )}
          {items.length === 0 ? (
            <p style={{ color: theme.colors.secondaryText }}>
              No hay ítems disponibles en la tienda.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {items.map((item) => (
                <div
                  key={item._id}
                  className="p-4 rounded-md"
                  style={{
                    background: theme.colors.card,
                    border: `2px solid ${theme.colors.border}`,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                  }
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-32 object-cover rounded-md mb-2"
                    />
                  ) : item.emoji ? (
                    <div
                      className="w-full h-32 flex items-center justify-center text-6xl mb-2"
                      style={{ background: theme.colors.background }}
                    >
                      {item.emoji}
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gray-200 rounded-md mb-2"></div>
                  )}
                  <h3
                    className="font-bold"
                    style={{ color: theme.colors.text }}
                  >
                    {item.name}
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: theme.colors.secondaryText }}
                  >
                    {item.description}
                  </p>
                  <p
                    className="text-sm font-bold"
                    style={{ color: theme.colors.accent }}
                  >
                    Costo: 💰 {item.price}
                  </p>
                  <button
                    onClick={() => handlePurchase(item)}
                    className="w-full mt-2 px-4 py-2 rounded-md font-bold"
                    style={{
                      background: theme.colors.success,
                      color: theme.colors.buttonText,
                    }}
                    disabled={!user || user.coins < item.price}
                  >
                    Comprar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Shop;
