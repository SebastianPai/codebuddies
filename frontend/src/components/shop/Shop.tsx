// src/components/shop/Shop.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "react-toastify";
import Navbar from "@/components/common/Navbar";
import { useNavigate } from "react-router-dom";
import BorderPreview from "@/components/BorderPreview";
import { Border, AuthUser } from "@/types";
import {
  Search,
  Heart,
  Frame,
  Tag,
  Zap,
  CheckCircle,
  Coins,
  Crown,
  Diamond,
  Shield,
  Star,
} from "lucide-react";

interface ShopItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  type: "life" | "border" | "tag" | "power";
  properties?: { [key: string]: any };
  emoji?: string;
  customLogo?: string;
  isNew?: boolean;
  color?: string;
  icon?: string;
}

const Shop: React.FC = () => {
  const { fetchWithAuth, user, updateUser } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "all" | "life" | "border" | "tag" | "power"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const response = await fetchWithAuth("/api/shop");
        if (!response.ok) throw new Error("Error al cargar ítems");
        const data: ShopItem[] = await response.json();
        const mockedData = data.map((item, index) => {
          let color: string | undefined;
          let icon: string | undefined;
          if (item.type === "tag") {
            const tagStyles = [
              {
                color: "bg-gradient-to-r from-amber-500 to-yellow-300",
                icon: "Crown",
              },
              {
                color: "bg-gradient-to-r from-purple-600 to-indigo-400",
                icon: "Diamond",
              },
              {
                color: "bg-gradient-to-r from-red-600 to-orange-400",
                icon: "Shield",
              },
              {
                color: "bg-gradient-to-r from-blue-600 to-sky-400",
                icon: "Star",
              },
            ];
            const tagStyle = tagStyles[index % tagStyles.length];
            color = tagStyle.color;
            icon = tagStyle.icon;
          }
          return {
            ...item,
            isNew: index < 2,
            color,
            icon,
          };
        });
        setItems(mockedData);
        setSelectedItem(mockedData[0] || null);
      } catch (error) {
        console.error("Error al cargar ítems:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Error al cargar ítems de la tienda"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [fetchWithAuth]);

  const handlePurchase = async (item: ShopItem) => {
    if (!user) {
      navigate("/login");
      toast.error("Por favor, inicia sesión para comprar.");
      return;
    }

    if (user.coins < item.price) {
      toast.error("No tienes suficientes monedas para comprar este ítem.");
      return;
    }

    try {
      if (!item._id || !item.type) {
        throw new Error(`Ítem inválido: ID=${item._id}, Type=${item.type}`);
      }

      const response = await fetchWithAuth("/api/shop/purchase", {
        method: "POST",
        body: JSON.stringify({
          itemId: item._id,
          itemType: item.type,
        }),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || "Error al realizar la compra");
      }

      const { user: updatedUser } = responseData;
      updateUser({
        coins: updatedUser.coins,
        lives: updatedUser.lives,
        borders: updatedUser.borders,
        tags: updatedUser.tags,
        powers: updatedUser.powers,
        activeBorder: updatedUser.activeBorder,
        activeTag: updatedUser.activeTag,
        activePowers: updatedUser.activePowers,
      } as Partial<AuthUser>);

      toast.success(`¡Compraste ${item.name} con éxito!`);
    } catch (error) {
      console.error(`Error al comprar ${item.name}:`, error);
      toast.error(
        error instanceof Error ? error.message : "Error al procesar la compra"
      );
    }
  };

  const filteredItems = items
    .filter((item) => activeTab === "all" || item.type === activeTab)
    .filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const renderItemPreview = (item: ShopItem, isSmall = false) => {
    const sizeClass = isSmall ? "w-12 h-12" : "w-[80px] h-[80px]";

    if (item.type === "border") {
      const border: Border = {
        id: item._id,
        name: item.name,
        description: item.description,
        properties: item.properties || {},
        image: item.image || "/placeholder.svg?height=80&width=80",
      };
      return (
        <BorderPreview border={border} size={isSmall ? 48 : 80}>
          <div
            className={`relative overflow-hidden ${sizeClass}`}
            style={{ borderRadius: "50%", background: theme.colors.background }}
          >
            <img
              src={
                user?.profilePicture || "/placeholder.svg?height=80&width=80"
              }
              alt="Foto de perfil"
              className="w-full h-full object-cover"
              onError={(e) =>
                (e.currentTarget.src = "/placeholder.svg?height=80&width=80")
              }
            />
            {!user?.profilePicture && (
              <div
                className="absolute inset-0 flex items-center justify-center text-white text-xl font-bold"
                style={{ background: "rgba(0, 0, 0, 0.5)" }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
            )}
          </div>
        </BorderPreview>
      );
    }

    if (item.type === "tag" && item.color && item.icon) {
      const IconComponent = { Crown, Diamond, Shield, Star }[item.icon] || Star;
      return (
        <div
          className={`px-3 py-1 rounded-full flex items-center gap-1 shadow-lg ${
            item.color
          } ${isSmall ? "text-xs" : ""}`}
          style={{ color: "#ffffff" }}
        >
          <IconComponent className={isSmall ? "w-3 h-3" : "w-4 h-4"} />
          <span className={isSmall ? "font-medium" : "font-bold"}>
            {item.name}
          </span>
        </div>
      );
    }

    if (item.customLogo) {
      return (
        <img
          src={item.customLogo}
          alt={item.name}
          className={`object-cover rounded-xl ${
            isSmall ? "w-12 h-12" : "w-20 h-20"
          }`}
        />
      );
    }

    if (item.image) {
      return (
        <img
          src={item.image}
          alt={item.name}
          className={`object-cover rounded-xl ${
            isSmall ? "w-12 h-12" : "w-20 h-20"
          }`}
        />
      );
    }

    if (item.emoji) {
      return (
        <div
          className={`flex items-center justify-center rounded-xl ${
            isSmall ? "w-12 h-12 text-2xl" : "w-20 h-20 text-4xl"
          }`}
          style={{ background: theme.colors.background }}
        >
          {item.emoji}
        </div>
      );
    }

    return (
      <div
        className={`flex items-center justify-center text-sm rounded-xl ${
          isSmall ? "w-12 h-12" : "w-20 h-20"
        }`}
        style={{
          background: theme.colors.background,
          color: theme.colors.secondaryText,
        }}
      >
        Sin imagen
      </div>
    );
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col font-jersey"
        style={{ background: theme.colors.background }}
      >
        <Navbar />
        <div className="flex justify-center items-center flex-grow">
          <div
            className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4"
            style={{ borderColor: theme.colors.accent }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col font-jersey"
      style={{ background: theme.colors.background }}
    >
      <style>
        {`
          @keyframes shop-item {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-shop-item {
            animation: shop-item 0.5s ease-out forwards;
          }
          @keyframes shop-pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.2); }
            50% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(0, 0, 0, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
          }
          .shop-pulse {
            animation: shop-pulse 2s infinite;
          }
        `}
      </style>
      <Navbar />
      <div className="flex justify-center flex-grow p-4 sm:p-8">
        <div
          className="w-full max-w-6xl rounded-2xl p-6 sm:p-10"
          style={{
            background: `linear-gradient(135deg, ${
              theme.colors.card || "#1e293b"
            } 0%, ${theme.colors.background || "#111827"} 100%)`,
            border: `4px solid ${theme.colors.border || "#4b5563"}`,
            boxShadow: `0 10px 25px rgba(0, 0, 0, 0.2)`,
          }}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8 relative">
            <h1
              className="text-4xl sm:text-5xl font-extrabold tracking-tight"
              style={{ color: theme.colors.text }}
            >
              Tienda Épica
            </h1>
            <div
              className="flex items-center gap-2 mt-4 sm:mt-0 px-4 py-2 rounded-full sm:absolute sm:top-4 sm:right-4"
              style={{
                background: `linear-gradient(90deg, ${
                  theme.colors.accent || "#10b981"
                } 0%, ${theme.colors.primary || "#14b8a6"} 100%)`,
                color: theme.colors.buttonText || "#ffffff",
                boxShadow: `0 0 10px ${theme.colors.accent || "#10b981"}`,
              }}
            >
              <Coins
                className="w-6 h-6 animate-pulse"
                style={{ color: "#D4A017" }}
              />
              <span className="text-lg font-semibold">
                {user?.coins || 0} Monedas
              </span>
            </div>
          </div>

          {/* Previsualización */}
          {selectedItem && (
            <div className="relative flex flex-col items-center justify-center mb-8">
              {(selectedItem.type === "border" ||
                selectedItem.type === "tag") && (
                <div className="flex flex-col items-center">
                  <BorderPreview
                    border={
                      selectedItem.type === "border"
                        ? {
                            id: selectedItem._id,
                            name: selectedItem.name,
                            description: selectedItem.description,
                            properties: selectedItem.properties || {},
                            image:
                              selectedItem.image ||
                              "/placeholder.svg?height=120&width=120",
                          }
                        : user?.activeBorder || null
                    }
                    size={120}
                  >
                    {user?.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt="Foto de perfil"
                        className="w-full h-full object-cover rounded-xl"
                        onError={(e) =>
                          (e.currentTarget.src =
                            "/placeholder.svg?height=120&width=120")
                        }
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center rounded-xl"
                        style={{ background: theme.colors.background }}
                      >
                        <span
                          className="text-2xl font-bold"
                          style={{ color: theme.colors.accent }}
                        >
                          {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                        </span>
                      </div>
                    )}
                  </BorderPreview>
                  <h3
                    className="text-xl font-bold mt-4"
                    style={{ color: theme.colors.text }}
                  >
                    {user?.name || "Usuario"}
                    {selectedItem.type === "tag" &&
                      selectedItem.color &&
                      selectedItem.icon && (
                        <span
                          className={`ml-2 px-3 py-1 rounded-full flex items-center gap-1 shadow-lg text-sm ${selectedItem.color}`}
                          style={{ color: "#ffffff" }}
                        >
                          {(() => {
                            const IconComponent =
                              { Crown, Diamond, Shield, Star }[
                                selectedItem.icon
                              ] || Star;
                            return <IconComponent className="w-4 h-4" />;
                          })()}
                          {selectedItem.name}
                        </span>
                      )}
                  </h3>
                </div>
              )}
              {(selectedItem.type === "life" ||
                selectedItem.type === "power") && (
                <div className="flex flex-col items-center">
                  {renderItemPreview(selectedItem)}
                  <span
                    className="mt-2 font-bold"
                    style={{ color: theme.colors.text }}
                  >
                    {selectedItem.name}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Search and Tabs */}
          <div className="mb-8">
            <div className="relative flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative w-full">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-6 h-6 sm:w-5 sm:h-5"
                  style={{ color: theme.colors.secondaryText }}
                />
                <input
                  type="text"
                  placeholder="Buscar ítems..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 sm:pl-10 p-4 sm:p-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-all"
                  style={{
                    borderColor: theme.colors.border,
                    background: theme.colors.background,
                    color: theme.colors.text,
                    boxShadow: `0 0 5px ${theme.colors.accent}`,
                  }}
                  aria-label="Buscar ítems en la tienda"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              {[
                {
                  id: "all",
                  label: "Todos",
                  icon: <Zap className="w-5 h-5 sm:w-4 sm:h-4 mr-1" />,
                },
                {
                  id: "life",
                  label: "Vida",
                  icon: <Heart className="w-5 h-5 sm:w-4 sm:h-4 mr-1" />,
                },
                {
                  id: "border",
                  label: "Borde",
                  icon: <Frame className="w-5 h-5 sm:w-4 sm:h-4 mr-1" />,
                },
                {
                  id: "tag",
                  label: "Tag",
                  icon: <Tag className="w-5 h-5 sm:w-4 sm:h-4 mr-1" />,
                },
                {
                  id: "power",
                  label: "Poder",
                  icon: <Zap className="w-5 h-5 sm:w-4 sm:h-4 mr-1" />,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className="px-6 sm:px-5 py-3 sm:py-2 rounded-full font-semibold text-base sm:text-sm transition-all duration-300 flex items-center"
                  style={{
                    background:
                      activeTab === tab.id
                        ? theme.colors.accent
                        : theme.colors.background,
                    color:
                      activeTab === tab.id
                        ? theme.colors.buttonText
                        : theme.colors.text,
                    border: `2px solid ${
                      activeTab === tab.id
                        ? theme.colors.accenttwo
                        : theme.colors.border
                    }`,
                  }}
                  aria-pressed={activeTab === tab.id}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          {filteredItems.length === 0 ? (
            <div
              className="text-center py-12"
              style={{ color: theme.colors.secondaryText }}
            >
              <Zap
                className="w-12 h-12 mx-auto mb-4"
                style={{ color: theme.colors.accent }}
              />
              <p className="text-xl font-medium">No se encontraron ítems.</p>
              <p className="text-sm mt-2">
                Prueba con otra categoría o término de búsqueda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item, index) => (
                <div
                  key={item._id}
                  className={`relative p-5 rounded-xl transition-all duration-300 hover:scale-105 animate-shop-item ${
                    selectedItem?._id === item._id ? "border-4" : ""
                  }`}
                  style={{
                    background: theme.colors.card,
                    border: `4px solid ${
                      selectedItem?._id === item._id
                        ? theme.colors.accent
                        : theme.colors.border
                    }`,
                    boxShadow: `0 10px 25px rgba(0, 0, 0, 0.1)`,
                    animationDelay: `${index * 0.1}s`,
                  }}
                  onClick={() => setSelectedItem(item)}
                >
                  {item.isNew && (
                    <span
                      className="absolute -top-3 -right-3 px-3 py-1 rounded-full text-xs font-bold animate-pulse"
                      style={{
                        background: theme.colors.accenttwo,
                        color: theme.colors.buttonText,
                        boxShadow: `0 0 10px ${theme.colors.accenttwo}`,
                      }}
                    >
                      ¡Nuevo!
                    </span>
                  )}
                  <div
                    className="flex justify-center mb-4 relative group"
                    style={{
                      padding: "3px",
                      borderRadius: "12px",
                    }}
                  >
                    {renderItemPreview(item, true)}
                    {item.type === "border" && (
                      <div
                        className="absolute inset-0 group-hover:shadow-[0_0_15px] transition-all"
                        style={{ boxShadow: `0 0 15px ${theme.colors.accent}` }}
                      />
                    )}
                  </div>
                  <h3
                    className="text-lg font-bold truncate"
                    style={{ color: theme.colors.text }}
                    title={item.name}
                  >
                    {item.name}
                  </h3>
                  <p
                    className="text-sm mb-3 line-clamp-2"
                    style={{ color: theme.colors.secondaryText }}
                  >
                    {item.description}
                  </p>
                  <p
                    className="text-sm font-semibold flex items-center gap-1"
                    style={{ color: "#D4A017" }}
                  >
                    <Coins className="w-4 h-4" style={{ color: "#D4A017" }} />
                    <span style={{ color: "#D4A017" }}>{item.price}</span>
                  </p>
                  {user &&
                    ((item.type === "border" &&
                      user.borders?.some((b) => b.id === item._id)) ||
                      (item.type === "tag" &&
                        user.tags?.some((t) => t.tagId === item._id)) ||
                      (item.type === "power" &&
                        user.powers?.some((p) => p.powerId === item._id))) && (
                      <span
                        className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{
                          background: theme.colors.success,
                          color: theme.colors.buttonText,
                          boxShadow: `0 0 5px ${theme.colors.success}`,
                        }}
                      >
                        <CheckCircle className="w-5 h-5" />
                      </span>
                    )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePurchase(item);
                    }}
                    className="w-full mt-4 px-4 py-3 sm:py-2 rounded-lg font-semibold text-sm transition-transform hover:scale-105 shop-pulse"
                    style={{
                      background:
                        !user ||
                        user.coins < item.price ||
                        (user &&
                          ((item.type === "border" &&
                            user.borders?.some((b) => b.id === item._id)) ||
                            (item.type === "tag" &&
                              user.tags?.some((t) => t.tagId === item._id)) ||
                            (item.type === "power" &&
                              user.powers?.some(
                                (p) => p.powerId === item._id
                              ))))
                          ? theme.colors.secondaryText
                          : theme.colors.success,
                      color: theme.colors.buttonText,
                      border: `2px solid ${theme.colors.border}`,
                      cursor:
                        !user ||
                        user.coins < item.price ||
                        (user &&
                          ((item.type === "border" &&
                            user.borders?.some((b) => b.id === item._id)) ||
                            (item.type === "tag" &&
                              user.tags?.some((t) => t.tagId === item._id)) ||
                            (item.type === "power" &&
                              user.powers?.some(
                                (p) => p.powerId === item._id
                              ))))
                          ? "not-allowed"
                          : "pointer",
                      animation:
                        user &&
                        user.coins >= item.price &&
                        !(
                          (item.type === "border" &&
                            user.borders?.some((b) => b.id === item._id)) ||
                          (item.type === "tag" &&
                            user.tags?.some((t) => t.tagId === item._id)) ||
                          (item.type === "power" &&
                            user.powers?.some((p) => p.powerId === item._id))
                        )
                          ? "shop-pulse 2s infinite"
                          : "none",
                    }}
                    disabled={
                      !user ||
                      user.coins < item.price ||
                      (user &&
                        ((item.type === "border" &&
                          user.borders?.some((b) => b.id === item._id)) ||
                          (item.type === "tag" &&
                            user.tags?.some((t) => t.tagId === item._id)) ||
                          (item.type === "power" &&
                            user.powers?.some((p) => p.powerId === item._id))))
                    }
                    aria-label={`Comprar ${item.name}`}
                  >
                    {user &&
                    ((item.type === "border" &&
                      user.borders?.some((b) => b.id === item._id)) ||
                      (item.type === "tag" &&
                        user.tags?.some((t) => t.tagId === item._id)) ||
                      (item.type === "power" &&
                        user.powers?.some((p) => p.powerId === item._id)))
                      ? "Ya comprado"
                      : "Comprar"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Footer Personalizado */}
      <footer
        className="py-8 px-4 sm:px-6 lg:px-8 text-center"
        style={{ background: theme.colors.card, color: theme.colors.text }}
      >
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <img
            src="/images/bitzi2.png"
            alt="Bitzi Footer"
            className="w-10 h-10 mb-4 rounded-full object-contain"
            style={{ border: `2px solid ${theme.colors.accent}` }}
            onError={(e) => {
              e.currentTarget.src = "/images/default-bitzi.jpg";
            }}
          />
          <p
            className="text-sm md:text-base mb-2"
            style={{ color: theme.colors.text }}
          >
            Creado con pasión por Jhon Sebastian Pai
            <a
              href="https://www.linkedin.com/in/sebastian-pai"
              target="_blank"
              rel="noopener noreferrer"
              className="linkedin-link ml-1"
              style={{ color: theme.colors.accent }}
            >
              Conéctate
            </a>
          </p>
          <p
            className="text-xs md:text-sm"
            style={{ color: theme.colors.secondaryText }}
          >
            © 2025 CodeBuddies. ¡Hecho para inspirar programadores!
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Shop;
