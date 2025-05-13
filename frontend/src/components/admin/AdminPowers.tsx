"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "react-toastify";
import Navbar from "@/components/common/Navbar";
import { useNavigate } from "react-router-dom";

interface PowerItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  type: "power" | string; // Permitir cualquier string para depuración
  properties?: { [key: string]: any };
  emoji?: string;
  customLogo?: string;
}

const AdminPowers: React.FC = () => {
  const { fetchWithAuth, user, updateUser } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [items, setItems] = useState<PowerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchPowers = async () => {
      try {
        setLoading(true);
        const response = await fetchWithAuth("/api/shop");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Error al obtener poderes");
        }
        const data = await response.json();
        console.log("Poderes cargados:", data);
        const powerItems = data.filter(
          (item: PowerItem) => item.type === "power"
        );
        console.log("Poderes filtrados:", powerItems);
        setItems(powerItems);
      } catch (error) {
        console.error("Error al cargar poderes:", error);
        toast.error(
          error instanceof Error ? error.message : "Error al cargar poderes"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchPowers();
  }, [fetchWithAuth]);

  const handlePurchase = async (item: PowerItem) => {
    if (!user) {
      navigate("/login");
      toast.error("Por favor, inicia sesión para comprar.");
      return;
    }

    if (user.coins < item.price) {
      toast.error("No tienes suficientes monedas para comprar este poder.");
      return;
    }

    try {
      if (!item._id || !item.type) {
        throw new Error("El ítem no tiene un ID o tipo válido");
      }

      console.log("Intentando comprar:", {
        itemId: item._id,
        itemType: item.type,
      });

      const response = await fetchWithAuth("/api/shop/purchase", {
        method: "POST",
        body: JSON.stringify({
          itemId: item._id,
          itemType: item.type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al realizar la compra");
      }

      const { user: updatedUser } = await response.json();

      updateUser({
        coins: updatedUser.coins,
        lives: updatedUser.lives,
        borders: updatedUser.borders,
        tags: updatedUser.tags,
        powers: updatedUser.powers,
        activeBorder: updatedUser.activeBorder,
        activeTag: updatedUser.activeTag,
        activePowers: updatedUser.activePowers,
      });

      toast.success(`¡Compraste ${item.name} con éxito!`);
    } catch (error) {
      console.error(`Error al comprar ${item.name}:`, error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al procesar la compra. Intenta de nuevo."
      );
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="flex justify-center flex-grow p-4 sm:p-6">
        <div
          className="w-full max-w-5xl rounded-2xl shadow-xl p-6 sm:p-8"
          style={{
            background: theme.colors.card,
            border: `4px solid ${theme.colors.border}`,
          }}
        >
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
            <h1
              className="text-3xl sm:text-4xl font-bold"
              style={{ color: theme.colors.text }}
            >
              Poderes
            </h1>
            <div
              className="text-lg sm:text-xl font-semibold mt-2 sm:mt-0"
              style={{ color: theme.colors.secondaryText }}
            >
              Monedas: 💰 {user?.coins || 0}
            </div>
          </div>

          {/* Búsqueda */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Buscar poderes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-1/2 p-2 rounded-md border-2 focus:outline-none"
              style={{
                borderColor: theme.colors.border,
                background: theme.colors.background,
                color: theme.colors.text,
              }}
            />
          </div>

          {/* Lista de Poderes */}
          {filteredItems.length === 0 ? (
            <div
              className="text-center py-10"
              style={{ color: theme.colors.secondaryText }}
            >
              <p className="text-lg">
                No se encontraron poderes. ¡Intenta con otra búsqueda!
              </p>
              <p className="text-sm">
                Poderes disponibles: {JSON.stringify(items)}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div
                  key={item._id}
                  className="relative p-4 rounded-xl shadow-md hover:shadow-lg transition-transform transform hover:scale-105"
                  style={{
                    background: theme.colors.card,
                    border: `2px solid ${theme.colors.border}`,
                  }}
                >
                  {/* Imagen, CustomLogo o Emoji */}
                  {item.customLogo ? (
                    <img
                      src={item.customLogo}
                      alt={item.name}
                      className="w-full h-40 object-cover rounded-md mb-4"
                    />
                  ) : item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-40 object-cover rounded-md mb-4"
                    />
                  ) : item.emoji ? (
                    <div
                      className="w-full h-40 flex items-center justify-center text-6xl mb-4 rounded-md"
                      style={{ background: theme.colors.background }}
                    >
                      {item.emoji}
                    </div>
                  ) : (
                    <div
                      className="w-full h-40 flex items-center justify-center text-2xl mb-4 rounded-md"
                      style={{
                        background: theme.colors.background,
                        color: theme.colors.secondaryText,
                      }}
                    >
                      Sin imagen
                    </div>
                  )}

                  {/* Información del Poder */}
                  <h3
                    className="text-lg font-bold"
                    style={{ color: theme.colors.text }}
                  >
                    {item.name}
                  </h3>
                  <p
                    className="text-sm mb-2"
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

                  {/* Estado del Poder (Comprado o No) */}
                  {user &&
                    item.type === "power" &&
                    user.powers?.some((p) => p.powerId === item._id) && (
                      <span
                        className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background: theme.colors.success,
                          color: theme.colors.buttonText,
                        }}
                      >
                        Comprado
                      </span>
                    )}

                  {/* Botón de Compra */}
                  <button
                    onClick={() => handlePurchase(item)}
                    className="w-full mt-4 px-4 py-2 rounded-md font-bold transition-colors"
                    style={{
                      background:
                        !user || user.coins < item.price
                          ? theme.colors.secondaryText
                          : theme.colors.success,
                      color: theme.colors.buttonText,
                      cursor:
                        !user || user.coins < item.price
                          ? "not-allowed"
                          : "pointer",
                    }}
                    disabled={!user || user.coins < item.price}
                  >
                    {user &&
                    item.type === "power" &&
                    user.powers?.some((p) => p.powerId === item._id)
                      ? "Ya comprado"
                      : "Comprar"}
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

export default AdminPowers;
