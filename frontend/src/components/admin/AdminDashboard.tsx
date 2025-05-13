"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "react-toastify";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import Navbar from "../common/Navbar";
import {
  Trophy,
  ShoppingBag,
  Zap,
  Save,
  X,
  Trash2,
  Edit,
  Menu,
  HelpCircle,
} from "lucide-react";

// Definir opciones predefinidas con descripciones
const ACHIEVEMENT_CONDITIONS = [
  {
    value: "complete_exercises",
    label: "Completar Ejercicios",
    description: "Completa un número de ejercicios (cualquier curso).",
  },
  {
    value: "complete_exercises_python",
    label: "Completar Ejercicios de Python",
    description: "Completa un número de ejercicios de Python.",
  },
  {
    value: "complete_exercises_javascript",
    label: "Completar Ejercicios de JavaScript",
    description: "Completa un número de ejercicios de JavaScript.",
  },
  {
    value: "level_reached",
    label: "Alcanzar Nivel",
    description: "Alcanza un nivel específico en la plataforma.",
  },
  {
    value: "course_completed",
    label: "Completar Curso",
    description: "Completa un curso entero.",
  },
  {
    value: "daily_streak",
    label: "Racha Diaria",
    description:
      "Mantén una racha de días consecutivos completando ejercicios.",
  },
];

const SHOP_ITEM_TYPES = [
  {
    value: "border",
    label: "Borde",
    description: "Añade un borde decorativo al perfil del usuario.",
  },
  {
    value: "tag",
    label: "Etiqueta",
    description: "Añade una etiqueta personalizada (ej. 'VIP') al perfil.",
  },
  {
    value: "avatar",
    label: "Avatar",
    description: "Desbloquea un avatar único para el perfil.",
  },
  {
    value: "background",
    label: "Fondo",
    description: "Cambia el fondo del perfil.",
  },
];

const POWER_EFFECT_TYPES = [
  {
    value: "double_xp",
    label: "Doble XP",
    description: "Duplica el XP ganado por ejercicios.",
  },
  {
    value: "triple_xp",
    label: "Triple XP",
    description: "Triplica el XP ganado por ejercicios.",
  },
  {
    value: "multiply_xp",
    label: "Multiplicar XP",
    description: "Multiplica el XP ganado por un factor personalizado.",
  },
  {
    value: "skip_exercise",
    label: "Saltar Ejercicio",
    description: "Permite saltar un ejercicio sin completarlo.",
  },
  {
    value: "streak_protector",
    label: "Protector de Racha",
    description: "Protege tu racha diaria si fallas un día.",
  },
  {
    value: "extra_attempts",
    label: "Intentos Extra",
    description: "Otorga intentos adicionales en ejercicios.",
  },
  {
    value: "hint_unlock",
    label: "Desbloquear Pista",
    description: "Desbloquea una pista para un ejercicio.",
  },
];

const POWER_DURATION_TYPES = [
  {
    value: "exercises",
    label: "Ejercicios",
    description: "El efecto dura un número de ejercicios completados.",
  },
  {
    value: "days",
    label: "Días",
    description: "El efecto dura un número de días.",
  },
  {
    value: "uses",
    label: "Usos",
    description: "El efecto se puede usar un número de veces.",
  },
];

// Definir tipos para las restricciones de effect.value
interface FixedConstraint {
  type: "fixed";
  value: number;
  description: string;
}

interface NumberConstraint {
  type: "number";
  options: number[];
  description: string;
}

interface IntegerConstraint {
  type: "integer";
  min: number;
  max: number;
  description: string;
}

type Constraint = FixedConstraint | NumberConstraint | IntegerConstraint;

// Restricciones para effect.value según effect.type
const EFFECT_VALUE_CONSTRAINTS: Record<string, Constraint> = {
  double_xp: {
    type: "fixed",
    value: 2,
    description: "Duplica el XP (factor de 2).",
  },
  triple_xp: {
    type: "fixed",
    value: 3,
    description: "Triplica el XP (factor de 3).",
  },
  multiply_xp: {
    type: "number",
    options: [1.5, 2, 2.5, 3, 4, 5],
    description: "Factor de multiplicación del XP (ej. 2 para duplicar).",
  },
  skip_exercise: {
    type: "fixed",
    value: 1,
    description: "Permite saltar 1 ejercicio por uso.",
  },
  streak_protector: {
    type: "fixed",
    value: 1,
    description: "Protege la racha por 1 día.",
  },
  extra_attempts: {
    type: "integer",
    min: 1,
    max: 5,
    description: "Número de intentos adicionales (1 a 5).",
  },
  hint_unlock: {
    type: "fixed",
    value: 1,
    description: "Desbloquea 1 pista por uso.",
  },
};

interface Achievement {
  _id: string;
  name: string;
  description: string;
  icon?: string;
  image?: string;
  customLogo?: string;
  condition?: { type: string; value: number };
}

interface ShopItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  type: string;
  properties?: { [key: string]: any };
  image?: string;
  customLogo?: string;
  isActive: boolean;
}

interface Power {
  _id: string;
  name: string;
  description: string;
  price: number;
  effect: {
    type: string;
    value: number | string;
    duration: number;
    durationType: string;
  };
  image?: string;
  customLogo?: string;
  emoji: string;
  isActive: boolean;
}

interface FormState {
  name: string;
  description: string;
  price?: number;
  icon?: string;
  image?: string;
  imageFile?: File | null;
  customLogo?: string;
  customLogoFile?: File | null;
  type?: string;
  properties?: { [key: string]: any };
  isActive?: boolean;
  effect?: {
    type: string;
    value: number | string;
    duration: number;
    durationType: string;
  };
  emoji?: string;
  condition?: { type: string; value: number };
}

const AdminDashboard: React.FC = () => {
  const { user, fetchWithAuth } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [powers, setPowers] = useState<Power[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    price: 0,
    icon: "",
    image: "",
    imageFile: null,
    customLogo: "",
    customLogoFile: null,
    type: "",
    properties: {},
    isActive: true,
    effect: { type: "", value: 0, duration: 0, durationType: "" },
    emoji: "⚡",
    condition: { type: "", value: 0 },
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuAction, setMenuAction] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/dashboard");
      toast.error("Acceso denegado. Se requiere rol de administrador.");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [achievementsRes, shopItemsRes, powersRes] = await Promise.all([
        fetchWithAuth("/api/admin/achievements"),
        fetchWithAuth("/api/admin/shop"),
        fetchWithAuth("/api/admin/powers"),
      ]);

      if (!achievementsRes.ok) {
        const text = await achievementsRes.text();
        console.error("Achievements response:", text);
        throw new Error(`Error ${achievementsRes.status}: ${text}`);
      }
      if (!shopItemsRes.ok) {
        const text = await shopItemsRes.text();
        console.error("Shop response:", text);
        throw new Error(`Error ${shopItemsRes.status}: ${text}`);
      }
      if (!powersRes.ok) {
        const text = await powersRes.text();
        console.error("Powers response:", text);
        throw new Error(`Error ${powersRes.status}: ${text}`);
      }

      const achievementsData = await achievementsRes.json();
      const shopItemsData = await shopItemsRes.json();
      const powersData = await powersRes.json();

      setAchievements(Array.isArray(achievementsData) ? achievementsData : []);
      setShopItems(Array.isArray(shopItemsData) ? shopItemsData : []);
      setPowers(Array.isArray(powersData) ? powersData : []);
    } catch (err: any) {
      setError(err.message || "Error al cargar datos");
      toast.error(err.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (
    e: React.FormEvent,
    type: "achievements" | "shop" | "powers"
  ) => {
    e.preventDefault();
    try {
      setError(null);

      // Validaciones generales
      if (!form.name || !form.description) {
        throw new Error("Nombre y descripción son obligatorios");
      }
      if (
        type === "achievements" &&
        (!form.condition?.type || !form.condition?.value)
      ) {
        throw new Error("La condición es obligatoria para los logros");
      }
      if (type === "shop" && (!form.price || !form.type)) {
        throw new Error(
          "Precio y tipo son obligatorios para ítems de la tienda"
        );
      }
      if (
        type === "powers" &&
        (!form.price ||
          !form.effect?.type ||
          !form.effect?.durationType ||
          !form.effect?.value)
      ) {
        throw new Error(
          "Precio, tipo de efecto, tipo de duración y valor del efecto son obligatorios para poderes"
        );
      }

      // Validaciones específicas para effect.value en poderes
      if (type === "powers") {
        const constraint =
          EFFECT_VALUE_CONSTRAINTS[
            form.effect!.type as keyof typeof EFFECT_VALUE_CONSTRAINTS
          ];
        if (constraint) {
          if (
            constraint.type === "fixed" &&
            form.effect!.value !== constraint.value
          ) {
            throw new Error(
              `El valor para ${form.effect!.type} debe ser ${constraint.value}`
            );
          } else if (
            constraint.type === "number" &&
            !constraint.options.includes(Number(form.effect!.value))
          ) {
            throw new Error(
              `El valor para ${
                form.effect!.type
              } debe ser uno de: ${constraint.options.join(", ")}`
            );
          } else if (
            constraint.type === "integer" &&
            (Number(form.effect!.value) < constraint.min ||
              Number(form.effect!.value) > constraint.max)
          ) {
            throw new Error(
              `El valor para ${form.effect!.type} debe estar entre ${
                constraint.min
              } y ${constraint.max}`
            );
          }
        }
      }

      let payload = { ...form };
      if (form.imageFile) {
        const formData = new FormData();
        formData.append("image", form.imageFile);
        const imageResponse = await fetchWithAuth("/api/admin/upload-image", {
          method: "POST",
          body: formData,
        });
        if (!imageResponse.ok) {
          const text = await imageResponse.text();
          throw new Error(`Error al subir imagen: ${text}`);
        }
        const imageData = await imageResponse.json();
        payload.image = imageData.imageUrl;
      }
      if (form.customLogoFile) {
        const formData = new FormData();
        formData.append("image", form.customLogoFile);
        const logoResponse = await fetchWithAuth("/api/admin/upload-image", {
          method: "POST",
          body: formData,
        });
        if (!logoResponse.ok) {
          const text = await logoResponse.text();
          throw new Error(`Error al subir logo: ${text}`);
        }
        const logoData = await logoResponse.json();
        payload.customLogo = logoData.imageUrl;
      }

      const endpoint = editingId
        ? `/api/admin/${type}/${editingId}`
        : `/api/admin/${type}`;
      const method = editingId ? "PUT" : "POST";

      if (type === "achievements") {
        delete payload.price;
        delete payload.isActive;
        delete payload.effect;
        delete payload.emoji;
        delete payload.type;
        delete payload.properties;
      } else if (type === "shop") {
        delete payload.icon;
        delete payload.effect;
        delete payload.emoji;
        delete payload.condition;
      } else if (type === "powers") {
        delete payload.icon;
        delete payload.condition;
        delete payload.type;
        delete payload.properties;
      }
      delete payload.imageFile;
      delete payload.customLogoFile;

      const response = await fetchWithAuth(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error ${response.status}: ${text}`);
      }

      await fetchData();
      resetForm();
      toast.success(
        editingId ? "Actualizado correctamente" : "Creado correctamente"
      );
    } catch (err: any) {
      setError(err.message || "Error al guardar");
      toast.error(err.message || "Error al guardar");
    }
  };

  const handleEdit = (
    item: Achievement | ShopItem | Power,
    type: "achievements" | "shop" | "powers"
  ) => {
    setEditingId(item._id);
    setForm({
      name: item.name,
      description: item.description,
      price: "price" in item ? item.price : undefined,
      icon: "icon" in item ? item.icon : undefined,
      image: item.image || "",
      imageFile: null,
      customLogo: item.customLogo || "",
      customLogoFile: null,
      type: "type" in item ? item.type : undefined,
      properties: "properties" in item ? item.properties : undefined,
      isActive: "isActive" in item ? item.isActive : undefined,
      effect: "effect" in item ? item.effect : undefined,
      emoji: "emoji" in item ? item.emoji : undefined,
      condition: "condition" in item ? item.condition : undefined,
    });
    setActiveTab(type === "achievements" ? 0 : type === "shop" ? 1 : 2);
  };

  const handleDelete = async (
    id: string,
    type: "achievements" | "shop" | "powers"
  ) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este elemento?")) return;
    try {
      const response = await fetchWithAuth(`/api/admin/${type}/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error ${response.status}: ${text}`);
      }
      await fetchData();
      toast.success("Eliminado correctamente");
    } catch (err: any) {
      setError(err.message || "Error al eliminar");
      toast.error(err.message || "Error al eliminar");
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: 0,
      icon: "",
      image: "",
      imageFile: null,
      customLogo: "",
      customLogoFile: null,
      type: "",
      properties: {},
      isActive: true,
      effect: { type: "", value: 0, duration: 0, durationType: "" },
      emoji: "⚡",
      condition: { type: "", value: 0 },
    });
    setEditingId(null);
    setMenuAction(null);
  };

  const handleMenuAction = (
    action: string,
    item?: Achievement | ShopItem | Power
  ) => {
    setIsMenuOpen(false);
    setMenuAction(action);
    switch (action) {
      case "create_achievement":
        setActiveTab(0);
        resetForm();
        break;
      case "create_shop_item":
        setActiveTab(1);
        resetForm();
        break;
      case "create_power":
        setActiveTab(2);
        resetForm();
        break;
      case "edit_achievement":
      case "edit_shop_item":
      case "edit_power":
        if (item) {
          handleEdit(
            item,
            action === "edit_achievement"
              ? "achievements"
              : action === "edit_shop_item"
              ? "shop"
              : "powers"
          );
        }
        break;
      case "delete_achievement":
      case "delete_shop_item":
      case "delete_power":
        if (item) {
          handleDelete(
            item._id,
            action === "delete_achievement"
              ? "achievements"
              : action === "delete_shop_item"
              ? "shop"
              : "powers"
          );
        }
        break;
      case "refresh":
        fetchData();
        break;
      default:
        break;
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
      style={{ background: theme.colors.background, color: theme.colors.text }}
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
              className="text-3xl md:text-4xl font-bold tracking-wider"
              style={{ color: theme.colors.text }}
            >
              Panel de Administración
            </h1>
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="px-4 py-2 rounded-md font-bold flex items-center gap-2 hover:brightness-110 transition-all"
                style={{
                  background: theme.colors.accent,
                  color: theme.colors.buttonText,
                }}
              >
                <Menu className="w-5 h-5" />
                Acciones
              </button>
              {isMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-md shadow-lg z-10"
                  style={{ background: theme.colors.card }}
                >
                  <div
                    className="px-4 py-2 font-bold border-b"
                    style={{ borderColor: theme.colors.border }}
                  >
                    Crear
                  </div>
                  <button
                    onClick={() => handleMenuAction("create_achievement")}
                    className="block w-full text-left px-4 py-2 hover:brightness-110"
                    style={{ color: theme.colors.text }}
                  >
                    Crear Logro
                  </button>
                  <button
                    onClick={() => handleMenuAction("create_shop_item")}
                    className="block w-full text-left px-4 py-2 hover:brightness-110"
                    style={{ color: theme.colors.text }}
                  >
                    Crear Ítem de Tienda
                  </button>
                  <button
                    onClick={() => handleMenuAction("create_power")}
                    className="block w-full text-left px-4 py-2 hover:brightness-110"
                    style={{ color: theme.colors.text }}
                  >
                    Crear Poder
                  </button>
                  <div
                    className="px-4 py-2 font-bold border-b"
                    style={{ borderColor: theme.colors.border }}
                  >
                    Editar
                  </div>
                  {achievements.map((item) => (
                    <button
                      key={`edit_achievement_${item._id}`}
                      onClick={() => handleMenuAction("edit_achievement", item)}
                      className="block w-full text-left px-4 py-2 hover:brightness-110"
                      style={{ color: theme.colors.text }}
                    >
                      Editar Logro: {item.name}
                    </button>
                  ))}
                  {shopItems.map((item) => (
                    <button
                      key={`edit_shop_item_${item._id}`}
                      onClick={() => handleMenuAction("edit_shop_item", item)}
                      className="block w-full text-left px-4 py-2 hover:brightness-110"
                      style={{ color: theme.colors.text }}
                    >
                      Editar Ítem: {item.name}
                    </button>
                  ))}
                  {powers.map((item) => (
                    <button
                      key={`edit_power_${item._id}`}
                      onClick={() => handleMenuAction("edit_power", item)}
                      className="block w-full text-left px-4 py-2 hover:brightness-110"
                      style={{ color: theme.colors.text }}
                    >
                      Editar Poder: {item.name}
                    </button>
                  ))}
                  <div
                    className="px-4 py-2 font-bold border-b"
                    style={{ borderColor: theme.colors.border }}
                  >
                    Eliminar
                  </div>
                  {achievements.map((item) => (
                    <button
                      key={`delete_achievement_${item._id}`}
                      onClick={() =>
                        handleMenuAction("delete_achievement", item)
                      }
                      className="block w-full text-left px-4 py-2 hover:brightness-110"
                      style={{ color: theme.colors.text }}
                    >
                      Eliminar Logro: {item.name}
                    </button>
                  ))}
                  {shopItems.map((item) => (
                    <button
                      key={`delete_shop_item_${item._id}`}
                      onClick={() => handleMenuAction("delete_shop_item", item)}
                      className="block w-full text-left px-4 py-2 hover:brightness-110"
                      style={{ color: theme.colors.text }}
                    >
                      Eliminar Ítem: {item.name}
                    </button>
                  ))}
                  {powers.map((item) => (
                    <button
                      key={`delete_power_${item._id}`}
                      onClick={() => handleMenuAction("delete_power", item)}
                      className="block w-full text-left px-4 py-2 hover:brightness-110"
                      style={{ color: theme.colors.text }}
                    >
                      Eliminar Poder: {item.name}
                    </button>
                  ))}
                  <div
                    className="px-4 py-2 font-bold border-b"
                    style={{ borderColor: theme.colors.border }}
                  >
                    Otros
                  </div>
                  <button
                    onClick={() => handleMenuAction("refresh")}
                    className="block w-full text-left px-4 py-2 hover:brightness-110"
                    style={{ color: theme.colors.text }}
                  >
                    Refrescar Datos
                  </button>
                </div>
              )}
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
          <Tabs
            selectedIndex={activeTab}
            onSelect={(index: number) => setActiveTab(index)}
            className="mt-4"
          >
            <TabList
              className="flex flex-wrap gap-2 mb-6"
              style={{ borderBottom: `2px solid ${theme.colors.border}` }}
            >
              <Tab
                className="px-4 py-2 rounded-md font-bold cursor-pointer transition-all"
                selectedClassName="bg-accent text-buttonText"
                style={{
                  background: theme.colors.background,
                  color: theme.colors.text,
                }}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Logros
                </div>
              </Tab>
              <Tab
                className="px-4 py-2 rounded-md font-bold cursor-pointer transition-all"
                selectedClassName="bg-accent text-buttonText"
                style={{
                  background: theme.colors.background,
                  color: theme.colors.text,
                }}
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  Ítems de la Tienda
                </div>
              </Tab>
              <Tab
                className="px-4 py-2 rounded-md font-bold cursor-pointer transition-all"
                selectedClassName="bg-accent text-buttonText"
                style={{
                  background: theme.colors.background,
                  color: theme.colors.text,
                }}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Poderes
                </div>
              </Tab>
            </TabList>

            {/* Logros */}
            <TabPanel>
              <form
                onSubmit={(e) => handleSubmit(e, "achievements")}
                className="mb-8 p-4 rounded-md"
                style={{ background: theme.colors.background }}
              >
                <h2
                  className="text-xl font-bold mb-4"
                  style={{
                    color: theme.colors.text,
                    borderBottom: `2px solid ${theme.colors.border}`,
                  }}
                >
                  {editingId ? "Editar Logro" : "Crear Logro"}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label
                      className="block mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      required
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    />
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Descripción *
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      required
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    />
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Icono (URL, opcional)
                    </label>
                    <input
                      type="text"
                      value={form.icon || ""}
                      onChange={(e) =>
                        setForm({ ...form, icon: e.target.value })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    />
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Imagen (Archivo, JPEG/PNG, máx. 5MB, opcional)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) =>
                        setForm({
                          ...form,
                          imageFile: e.target.files ? e.target.files[0] : null,
                        })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:bg-gray-600 file:text-white hover:file:bg-gray-500"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    />
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Logo Personalizado (Archivo, JPEG/PNG, máx. 5MB, opcional)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) =>
                        setForm({
                          ...form,
                          customLogoFile: e.target.files
                            ? e.target.files[0]
                            : null,
                        })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:bg-gray-600 file:text-white hover:file:bg-gray-500"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    />
                  </div>
                  <div className="relative">
                    <label
                      className="block mb-2 flex items-center gap-2"
                      style={{ color: theme.colors.text }}
                    >
                      Condición - Tipo *
                      <span
                        className="relative group"
                        title={
                          ACHIEVEMENT_CONDITIONS.find(
                            (c) => c.value === form.condition?.type
                          )?.description || "Selecciona un tipo de condición"
                        }
                      >
                        <HelpCircle className="w-4 h-4" />
                      </span>
                    </label>
                    <select
                      value={form.condition?.type || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          condition: {
                            ...form.condition!,
                            type: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      required
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    >
                      <option value="">Selecciona un tipo</option>
                      {ACHIEVEMENT_CONDITIONS.map((condition) => (
                        <option key={condition.value} value={condition.value}>
                          {condition.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Condición - Valor *
                    </label>
                    <input
                      type="number"
                      value={form.condition?.value || 0}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          condition: {
                            ...form.condition!,
                            value: Number(e.target.value),
                          },
                        })
                      }
                      placeholder="Ej. 3"
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      required
                      min="0"
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-md font-bold flex items-center gap-2 hover:brightness-110 transition-all"
                      style={{
                        background: theme.colors.success,
                        color: theme.colors.buttonText,
                      }}
                    >
                      <Save className="w-4 h-4" />
                      {editingId ? "Actualizar" : "Crear"}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2 rounded-md font-bold flex items-center gap-2 hover:brightness-110 transition-all"
                        style={{
                          background: theme.colors.error,
                          color: theme.colors.buttonText,
                        }}
                      >
                        <X className="w-4 h-4" />
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </form>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {achievements.length > 0 ? (
                  achievements.map((item) => (
                    <div
                      key={item._id}
                      className="p-4 rounded-md transition-all duration-300"
                      style={{
                        background: theme.colors.background,
                        border: `2px solid ${theme.colors.border}`,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {item.customLogo ? (
                          <img
                            src={item.customLogo}
                            alt={item.name}
                            className="w-8 h-8"
                          />
                        ) : item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-8 h-8"
                          />
                        ) : item.icon ? (
                          <img
                            src={item.icon}
                            alt={item.name}
                            className="w-8 h-8"
                          />
                        ) : (
                          <Trophy
                            className="w-8 h-8"
                            style={{ color: theme.colors.accent }}
                          />
                        )}
                        <h3
                          className="font-bold"
                          style={{ color: theme.colors.text }}
                        >
                          {item.name}
                        </h3>
                      </div>
                      <p style={{ color: theme.colors.secondaryText }}>
                        {item.description}
                      </p>
                      {item.condition && (
                        <p style={{ color: theme.colors.accent }}>
                          Condición:{" "}
                          {ACHIEVEMENT_CONDITIONS.find(
                            (c) => c.value === item.condition?.type
                          )?.label || item.condition.type}{" "}
                          ({item.condition.value})
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleEdit(item, "achievements")}
                          className="px-3 py-1 rounded-md font-bold flex items-center gap-2 hover:brightness-110 transition-all"
                          style={{
                            background: theme.colors.success,
                            color: theme.colors.buttonText,
                          }}
                        >
                          <Edit className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(item._id, "achievements")}
                          className="px-3 py-1 rounded-md font-bold flex items-center gap-2 hover:brightness-110 transition-all"
                          style={{
                            background: theme.colors.error,
                            color: theme.colors.buttonText,
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: theme.colors.secondaryText }}>
                    No hay logros disponibles.
                  </p>
                )}
              </div>
            </TabPanel>

            {/* Ítems de la Tienda */}
            <TabPanel>
              <form
                onSubmit={(e) => handleSubmit(e, "shop")}
                className="mb-8 p-4 rounded-md"
                style={{ background: theme.colors.background }}
              >
                <h2
                  className="text-xl font-bold mb-4"
                  style={{
                    color: theme.colors.text,
                    borderBottom: `2px solid ${theme.colors.border}`,
                  }}
                >
                  {editingId ? "Editar Ítem" : "Crear Ítem"}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label
                      className="block mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      required
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    />
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Descripción *
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      required
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    />
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Precio *
                    </label>
                    <input
                      type="number"
                      value={form.price || 0}
                      onChange={(e) =>
                        setForm({ ...form, price: Number(e.target.value) })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      required
                      min="0"
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    />
                  </div>
                  <div className="relative">
                    <label
                      className="block mb-2 flex items-center gap-2"
                      style={{ color: theme.colors.text }}
                    >
                      Tipo *
                      <span
                        className="relative group"
                        title={
                          SHOP_ITEM_TYPES.find((t) => t.value === form.type)
                            ?.description || "Selecciona un tipo de ítem"
                        }
                      >
                        <HelpCircle className="w-4 h-4" />
                      </span>
                    </label>
                    <select
                      value={form.type || ""}
                      onChange={(e) =>
                        setForm({ ...form, type: e.target.value })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      required
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    >
                      <option value="">Selecciona un tipo</option>
                      {SHOP_ITEM_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Propiedades (JSON, opcional)
                    </label>
                    <textarea
                      value={JSON.stringify(form.properties || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          const properties = JSON.parse(e.target.value);
                          setForm({ ...form, properties });
                        } catch {
                          toast.error("Formato JSON inválido");
                        }
                      }}
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      placeholder='Ej. {"color": "#ff0000"}'
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    />
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Imagen (Archivo, JPEG/PNG, máx. 5MB, opcional)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) =>
                        setForm({
                          ...form,
                          imageFile: e.target.files ? e.target.files[0] : null,
                        })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:bg-gray-600 file:text-white hover:file:bg-gray-500"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    />
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Logo Personalizado (Archivo, JPEG/PNG, máx. 5MB, opcional)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) =>
                        setForm({
                          ...form,
                          customLogoFile: e.target.files
                            ? e.target.files[0]
                            : null,
                        })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:bg-gray-600 file:text-white hover:file:bg-gray-500"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm({ ...form, isActive: e.target.checked })
                      }
                      style={{ accentColor: theme.colors.accent }}
                    />
                    <label style={{ color: theme.colors.text }}>Activo</label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-md font-bold flex items-center gap-2 hover:brightness-110 transition-all"
                      style={{
                        background: theme.colors.success,
                        color: theme.colors.buttonText,
                      }}
                    >
                      <Save className="w-4 h-4" />
                      {editingId ? "Actualizar" : "Crear"}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2 rounded-md font-bold flex items-center gap-2 hover:brightness-110 transition-all"
                        style={{
                          background: theme.colors.error,
                          color: theme.colors.buttonText,
                        }}
                      >
                        <X className="w-4 h-4" />
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </form>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {shopItems.length > 0 ? (
                  shopItems.map((item) => (
                    <div
                      key={item._id}
                      className="p-4 rounded-md transition-all duration-300"
                      style={{
                        background: theme.colors.background,
                        border: `2px solid ${theme.colors.border}`,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {item.customLogo ? (
                          <img
                            src={item.customLogo}
                            alt={item.name}
                            className="w-8 h-8"
                          />
                        ) : item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-8 h-8"
                          />
                        ) : (
                          <ShoppingBag
                            className="w-8 h-8"
                            style={{ color: theme.colors.accent }}
                          />
                        )}
                        <h3
                          className="font-bold"
                          style={{ color: theme.colors.text }}
                        >
                          {item.name}
                        </h3>
                      </div>
                      <p style={{ color: theme.colors.secondaryText }}>
                        {item.description}
                      </p>
                      <p style={{ color: theme.colors.accent }}>
                        Precio: {item.price} monedas
                      </p>
                      <p style={{ color: theme.colors.accent }}>
                        Tipo:{" "}
                        {SHOP_ITEM_TYPES.find((t) => t.value === item.type)
                          ?.label || item.type}
                      </p>
                      {item.properties && (
                        <p style={{ color: theme.colors.secondaryText }}>
                          Propiedades: {JSON.stringify(item.properties)}
                        </p>
                      )}
                      <p style={{ color: theme.colors.accent }}>
                        Activo: {item.isActive ? "Sí" : "No"}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleEdit(item, "shop")}
                          className="px-3 py-1 rounded-md font-bold flex items-center gap-2 hover:brightness-110 transition-all"
                          style={{
                            background: theme.colors.success,
                            color: theme.colors.buttonText,
                          }}
                        >
                          <Edit className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(item._id, "shop")}
                          className="px-3 py-1 rounded-md font-bold flex items-center gap-2 hover:brightness-110 transition-all"
                          style={{
                            background: theme.colors.error,
                            color: theme.colors.buttonText,
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: theme.colors.secondaryText }}>
                    No hay ítems de la tienda disponibles.
                  </p>
                )}
              </div>
            </TabPanel>

            {/* Poderes */}
            <TabPanel>
              <form
                onSubmit={(e) => handleSubmit(e, "powers")}
                className="mb-8 p-4 rounded-md"
                style={{ background: theme.colors.background }}
              >
                <h2
                  className="text-xl font-bold mb-4"
                  style={{
                    color: theme.colors.text,
                    borderBottom: `2px solid ${theme.colors.border}`,
                  }}
                >
                  {editingId ? "Editar Poder" : "Crear Poder"}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label
                      className="block mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      required
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    />
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Descripción *
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      required
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    />
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Precio *
                    </label>
                    <input
                      type="number"
                      value={form.price || 0}
                      onChange={(e) =>
                        setForm({ ...form, price: Number(e.target.value) })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      required
                      min="0"
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    />
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Imagen (Archivo, JPEG/PNG, máx. 5MB, opcional)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) =>
                        setForm({
                          ...form,
                          imageFile: e.target.files ? e.target.files[0] : null,
                        })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:bg-gray-600 file:text-white hover:file:bg-gray-500"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    />
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Logo Personalizado (Archivo, JPEG/PNG, máx. 5MB, opcional)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) =>
                        setForm({
                          ...form,
                          customLogoFile: e.target.files
                            ? e.target.files[0]
                            : null,
                        })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:bg-gray-600 file:text-white hover:file:bg-gray-500"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    />
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Emoji (opcional)
                    </label>
                    <input
                      type="text"
                      value={form.emoji || "⚡"}
                      onChange={(e) =>
                        setForm({ ...form, emoji: e.target.value })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    />
                  </div>
                  <div className="relative">
                    <label
                      className="block mb-2 flex items-center gap-2"
                      style={{ color: theme.colors.text }}
                    >
                      Efecto - Tipo *
                      <span
                        className="relative group"
                        title={
                          POWER_EFFECT_TYPES.find(
                            (e) => e.value === form.effect?.type
                          )?.description || "Selecciona un tipo de efecto"
                        }
                      >
                        <HelpCircle className="w-4 h-4" />
                      </span>
                    </label>
                    <select
                      value={form.effect?.type || ""}
                      onChange={(e) => {
                        const newType = e.target.value;
                        const constraint =
                          EFFECT_VALUE_CONSTRAINTS[
                            newType as keyof typeof EFFECT_VALUE_CONSTRAINTS
                          ];
                        setForm({
                          ...form,
                          effect: {
                            ...form.effect!,
                            type: newType,
                            value:
                              constraint.type === "fixed"
                                ? constraint.value
                                : "",
                          },
                        });
                      }}
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      required
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    >
                      <option value="">Selecciona un tipo</option>
                      {POWER_EFFECT_TYPES.map((effect) => (
                        <option key={effect.value} value={effect.value}>
                          {effect.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className="block mb-2 flex items-center gap-2"
                      style={{ color: theme.colors.text }}
                    >
                      Efecto - Valor *
                      <span
                        className="relative group"
                        title={
                          form.effect?.type
                            ? EFFECT_VALUE_CONSTRAINTS[
                                form.effect
                                  .type as keyof typeof EFFECT_VALUE_CONSTRAINTS
                              ]?.description ||
                              "Selecciona un tipo de efecto primero"
                            : "Selecciona un tipo de efecto primero"
                        }
                      >
                        <HelpCircle className="w-4 h-4" />
                      </span>
                    </label>
                    {form.effect?.type ? (
                      (() => {
                        const constraint =
                          EFFECT_VALUE_CONSTRAINTS[
                            form.effect
                              .type as keyof typeof EFFECT_VALUE_CONSTRAINTS
                          ];
                        if (!constraint) return null;

                        if (constraint.type === "fixed") {
                          return (
                            <input
                              type="text"
                              value={constraint.value}
                              readOnly
                              className="w-full rounded-md p-3 bg-gray-600 text-gray-300 cursor-not-allowed"
                              style={{
                                background: theme.colors.card,
                                border: `2px solid ${theme.colors.border}`,
                                color: theme.colors.text,
                              }}
                            />
                          );
                        } else if (constraint.type === "number") {
                          return (
                            <select
                              value={form.effect?.value || ""}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  effect: {
                                    ...form.effect!,
                                    value: Number(e.target.value),
                                  },
                                })
                              }
                              className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                              style={{
                                background: theme.colors.card,
                                border: `2px solid ${theme.colors.border}`,
                                color: theme.colors.text,
                              }}
                              required
                              onFocus={(e) =>
                                (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                              }
                              onBlur={(e) =>
                                (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                              }
                            >
                              <option value="">Selecciona un valor</option>
                              {constraint.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}x
                                </option>
                              ))}
                            </select>
                          );
                        } else if (constraint.type === "integer") {
                          return (
                            <input
                              type="number"
                              value={form.effect?.value || ""}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                if (
                                  value >= constraint.min &&
                                  value <= constraint.max
                                ) {
                                  setForm({
                                    ...form,
                                    effect: { ...form.effect!, value },
                                  });
                                } else {
                                  toast.error(
                                    `El valor debe estar entre ${constraint.min} y ${constraint.max}`
                                  );
                                }
                              }}
                              className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                              style={{
                                background: theme.colors.card,
                                border: `2px solid ${theme.colors.border}`,
                                color: theme.colors.text,
                              }}
                              required
                              min={constraint.min}
                              max={constraint.max}
                              onFocus={(e) =>
                                (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                              }
                              onBlur={(e) =>
                                (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                              }
                            />
                          );
                        }
                        return null;
                      })()
                    ) : (
                      <input
                        type="text"
                        value=""
                        disabled
                        className="w-full rounded-md p-3 bg-gray-600 text-gray-300 cursor-not-allowed"
                        style={{
                          background: theme.colors.card,
                          border: `2px solid ${theme.colors.border}`,
                          color: theme.colors.text,
                        }}
                        placeholder="Selecciona un tipo de efecto primero"
                      />
                    )}
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Efecto - Duración *
                    </label>
                    <input
                      type="number"
                      value={form.effect?.duration || 0}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          effect: {
                            ...form.effect!,
                            duration: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      required
                      min="0"
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    />
                  </div>
                  <div className="relative">
                    <label
                      className="block mb-2 flex items-center gap-2"
                      style={{ color: theme.colors.text }}
                    >
                      Efecto - Tipo de Duración *
                      <span
                        className="relative group"
                        title={
                          POWER_DURATION_TYPES.find(
                            (d) => d.value === form.effect?.durationType
                          )?.description || "Selecciona un tipo de duración"
                        }
                      >
                        <HelpCircle className="w-4 h-4" />
                      </span>
                    </label>
                    <select
                      value={form.effect?.durationType || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          effect: {
                            ...form.effect!,
                            durationType: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        color: theme.colors.text,
                      }}
                      required
                      onFocus={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    >
                      <option value="">Selecciona un tipo</option>
                      {POWER_DURATION_TYPES.map((duration) => (
                        <option key={duration.value} value={duration.value}>
                          {duration.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm({ ...form, isActive: e.target.checked })
                      }
                      style={{ accentColor: theme.colors.accent }}
                    />
                    <label style={{ color: theme.colors.text }}>Activo</label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-md font-bold flex items-center gap-2 hover:brightness-110 transition-all"
                      style={{
                        background: theme.colors.success,
                        color: theme.colors.buttonText,
                      }}
                    >
                      <Save className="w-4 h-4" />
                      {editingId ? "Actualizar" : "Crear"}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2 rounded-md font-bold flex items-center gap-2 hover:brightness-110 transition-all"
                        style={{
                          background: theme.colors.error,
                          color: theme.colors.buttonText,
                        }}
                      >
                        <X className="w-4 h-4" />
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </form>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {powers.length > 0 ? (
                  powers.map((item) => (
                    <div
                      key={item._id}
                      className="p-4 rounded-md transition-all duration-300"
                      style={{
                        background: theme.colors.background,
                        border: `2px solid ${theme.colors.border}`,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {item.customLogo ? (
                          <img
                            src={item.customLogo}
                            alt={item.name}
                            className="w-8 h-8"
                          />
                        ) : item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-8 h-8"
                          />
                        ) : (
                          <span className="text-2xl">{item.emoji}</span>
                        )}
                        <h3
                          className="font-bold"
                          style={{ color: theme.colors.text }}
                        >
                          {item.name}
                        </h3>
                      </div>
                      <p style={{ color: theme.colors.secondaryText }}>
                        {item.description}
                      </p>
                      <p style={{ color: theme.colors.accent }}>
                        Precio: {item.price} monedas
                      </p>
                      <p style={{ color: theme.colors.accent }}>
                        Efecto:{" "}
                        {POWER_EFFECT_TYPES.find(
                          (e) => e.value === item.effect.type
                        )?.label || item.effect.type}{" "}
                        ({item.effect.value})
                      </p>
                      <p style={{ color: theme.colors.accent }}>
                        Duración: {item.effect.duration}{" "}
                        {POWER_DURATION_TYPES.find(
                          (d) => d.value === item.effect.durationType
                        )?.label || item.effect.durationType}
                      </p>
                      <p style={{ color: theme.colors.accent }}>
                        Activo: {item.isActive ? "Sí" : "No"}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleEdit(item, "powers")}
                          className="px-3 py-1 rounded-md font-bold flex items-center gap-2 hover:brightness-110 transition-all"
                          style={{
                            background: theme.colors.success,
                            color: theme.colors.buttonText,
                          }}
                        >
                          <Edit className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(item._id, "powers")}
                          className="px-3 py-1 rounded-md font-bold flex items-center gap-2 hover:brightness-110 transition-all"
                          style={{
                            background: theme.colors.error,
                            color: theme.colors.buttonText,
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: theme.colors.secondaryText }}>
                    No hay poderes disponibles.
                  </p>
                )}
              </div>
            </TabPanel>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
