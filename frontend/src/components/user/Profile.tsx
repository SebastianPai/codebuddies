"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "react-toastify";
import Navbar from "@/components/common/Navbar";
import { useNavigate } from "react-router-dom";
import {
  User,
  Zap,
  Edit,
  LogOut,
  Trophy,
  Star,
  Shield,
  Coins,
} from "lucide-react";
import BorderPreview from "@/components/BorderPreview";
import { apiPost } from "@/api";

// Interfaces
interface ThemeColors {
  background: string;
  card: string;
  text: string;
  secondaryText: string;
  accent: string;
  border: string;
  success: string;
  error: string;
  buttonText: string;
  primary: string;
}

interface AuthUser {
  id: string;
  name: string;
  profilePicture?: string;
  university?: string;
  isUniversityStudent?: boolean;
  coins: number;
  streak: number;
  lives: number;
  progress: any; // Adjust type based on actual progress structure
  level: number;
  xp: number;
  maxXp: number;
  achievements?: RawAchievement[];
  borders?: Border[];
  tags?: Tag[];
  powers?: Power[];
  activeBorder?: Border | null;
  activeTag?: Tag | null;
  activePowers?: ActivePower[];
}

interface Achievement {
  id?: string;
  name: string;
  description: string;
  icon?: string;
  image?: string;
  awardedAt?: string;
}

interface RawAchievement {
  achievementId?: {
    _id?: string;
    id?: string;
    name: string;
    description: string;
    icon?: string;
    image?: string;
  };
  id?: string;
  name?: string;
  description?: string;
  icon?: string;
  image?: string;
  awardedAt?: string;
}

interface Border {
  id: string;
  name: string;
  description: string;
  properties: { [key: string]: any };
  image: string;
  acquiredAt?: string;
}

interface Tag {
  tagId: string;
  name: string;
  description: string;
  properties: { [key: string]: any };
  image: string;
  acquiredAt?: string;
}

interface Power {
  powerId: string;
  name: string;
  description: string;
  effect: {
    type: string;
    value: number | string;
    duration: number;
    durationType: string;
  };
  image: string;
  emoji: string;
  usesLeft?: number;
}

interface ActivePower {
  powerId: string;
  name: string;
  description: string;
  effect: {
    type: string;
    value: number | string;
    duration: number;
    durationType: string;
  };
  image: string;
  emoji: string;
  remainingDuration: number;
  activatedAt: string;
}

interface EditForm {
  name: string;
  profilePicture?: string; // Changed to optional to match AuthUser
  university?: string;
  isUniversityStudent: boolean;
  profilePictureFile?: File | null;
}

const Profile: React.FC = () => {
  const { user, fetchWithAuth, updateUser, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    profilePicture: "",
    university: "",
    isUniversityStudent: false,
    profilePictureFile: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [powerLoading, setPowerLoading] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [activePowerTimers, setActivePowerTimers] = useState<{
    [key: string]: number;
  }>({});
  const [activeTab, setActiveTab] = useState<
    "achievements" | "borders" | "tags" | "powers" | "activePowers"
  >("achievements");
  const [clickCount, setClickCount] = useState(0);
  const [lastClick, setLastClick] = useState(0);
  const [secretUnlocked, setSecretUnlocked] = useState(false);

  // Cargar datos del usuario
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setLoading(false);
        navigate("/login");
        return;
      }

      try {
        // Initialize editForm with user data, providing defaults for optional fields
        setEditForm({
          name: user.name || "",
          profilePicture: user.profilePicture || "",
          university: user.university || "",
          isUniversityStudent: user.isUniversityStudent || false,
          profilePictureFile: null,
        });

        if (
          !user.name ||
          !user.achievements ||
          !user.borders ||
          !user.tags ||
          !user.powers
        ) {
          const response = await fetchWithAuth("/api/users/me");
          if (!response.ok)
            throw new Error("Error al cargar datos del usuario");
          const userData = await response.json();
          updateUser({
            id: userData.user.id,
            name: userData.user.name,
            profilePicture: userData.user.profilePicture,
            university: userData.user.university,
            isUniversityStudent: userData.user.isUniversityStudent,
            coins: userData.user.coins,
            streak: userData.user.streak,
            lives: userData.user.lives,
            level: userData.user.level,
            xp: userData.user.xp,
            maxXp: userData.user.maxXp,
            achievements: userData.user.achievements,
            borders: userData.user.borders,
            tags: userData.user.tags,
            powers: userData.user.powers,
            activeBorder: userData.user.activeBorder,
            activeTag: userData.user.activeTag,
            activePowers: userData.user.activePowers,
          });
        }

        // Procesar logros y evitar duplicados
        const newAchievements =
          user.achievements?.map((ach: RawAchievement, index: number) => {
            const id =
              ach.achievementId?._id ||
              ach.achievementId?.id ||
              ach.id ||
              `fallback-${index}`;
            return {
              id,
              name: ach.achievementId?.name || ach.name || "Desconocido",
              description:
                ach.achievementId?.description ||
                ach.description ||
                "Sin descripción",
              icon: ach.achievementId?.icon || ach.icon,
              image: ach.achievementId?.image || ach.image,
              awardedAt: ach.awardedAt,
            };
          }) || [];

        // Filtrar logros duplicados por ID
        setAchievements((prev) => {
          const existingIds = new Set(prev.map((ach) => ach.id));
          const filteredAchievements = newAchievements.filter(
            (ach) => !existingIds.has(ach.id)
          );
          return [...prev, ...filteredAchievements];
        });
      } catch (err) {
        console.error("Error al cargar datos del usuario:", err);
        setError("No se pudieron cargar los datos del perfil.");
        toast.error("Error al cargar el perfil.");
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user, fetchWithAuth, updateUser, navigate]);

  // Temporizador optimizado para poderes activos
  useEffect(() => {
    if (!user?.activePowers?.length) return;

    const interval = setInterval(() => {
      setActivePowerTimers((prev) => {
        const updatedTimers = { ...prev };
        const updatedActivePowers = user.activePowers!.filter((power) => {
          if (!power.activatedAt) return false;
          const activatedAt = new Date(power.activatedAt).getTime();
          if (isNaN(activatedAt)) return false;
          const durationMs =
            power.effect.duration *
            (power.effect.durationType === "seconds" ? 1000 : 60000);
          const elapsedMs = Date.now() - activatedAt;
          const remainingMs = Math.max(0, durationMs - elapsedMs);
          updatedTimers[power.powerId] = Math.ceil(
            remainingMs /
              (power.effect.durationType === "seconds" ? 1000 : 60000)
          );
          return remainingMs > 0;
        });

        if (updatedActivePowers.length !== user.activePowers!.length) {
          updateUser({ activePowers: updatedActivePowers });
        }

        return updatedTimers;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [user?.activePowers, updateUser]);

  // Minijuego: Desbloquear logro secreto
  const handleProfileClick = useCallback(async () => {
    if (secretUnlocked) {
      console.log("Logro secreto ya desbloqueado");
      return;
    }

    const now = Date.now();
    console.log(
      `Clic registrado. ClickCount: ${clickCount + 1}, Time since last click: ${
        now - lastClick
      }ms`
    );

    if (now - lastClick > 10000) {
      setClickCount(1);
    } else {
      setClickCount((prev) => prev + 1);
    }
    setLastClick(now);

    if (clickCount + 1 >= 5) {
      console.log("Intentando desbloquear logro secreto...");
      setSecretUnlocked(true);
      try {
        const response = await fetchWithAuth("/api/users/secret-achievement", {
          method: "POST",
          body: JSON.stringify({ achievement: "Rey del Perfil" }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Error al desbloquear logro secreto"
          );
        }
        const data = await response.json();
        const newAchievement = {
          id: `secret-king-${Date.now()}`,
          name: "Rey del Perfil",
          description: "Clicaste 5 veces tu perfil como un verdadero monarca.",
          awardedAt: new Date().toISOString(),
        };
        setAchievements((prev) => {
          if (prev.some((ach) => ach.name === newAchievement.name)) {
            console.log("Logro secreto ya existe, no se agrega");
            return prev;
          }
          return [...prev, newAchievement];
        });
        toast.success(
          data.message || "¡Logro secreto desbloqueado: Rey del Perfil!"
        );
      } catch (error) {
        console.error("Error al desbloquear logro secreto:", error);
        toast.success(
          "¡Logro secreto desbloqueado: Rey del Perfil! (No guardado)"
        );
        const newAchievement = {
          id: `secret-king-${Date.now()}`,
          name: "Rey del Perfil",
          description: "Clicaste 5 veces tu perfil como un verdadero monarca.",
          awardedAt: new Date().toISOString(),
        };
        setAchievements((prev) => {
          if (prev.some((ach) => ach.name === newAchievement.name)) {
            return prev;
          }
          return [...prev, newAchievement];
        });
      }
    }
  }, [clickCount, lastClick, secretUnlocked, fetchWithAuth]);

  // Actualizar perfil
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      // Validar archivo si existe
      if (editForm.profilePictureFile) {
        const file = editForm.profilePictureFile;
        console.log("Archivo seleccionado:", {
          name: file.name,
          type: file.type,
          size: file.size,
        });

        // Validar tipo y tamaño
        const validTypes = ["image/jpeg", "image/png"];
        if (!validTypes.includes(file.type)) {
          throw new Error("Solo se permiten imágenes JPEG o PNG.");
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error("La imagen no debe exceder 5MB.");
        }

        // Crear FormData
        const formData = new FormData();
        formData.append("profilePicture", file);

        // Depuración: Inspeccionar contenido de FormData
        for (const pair of formData.entries()) {
          console.log(`FormData: ${pair[0]} =`, pair[1]);
        }

        // Enviar solicitud para actualizar la foto de perfil usando apiPost
        const profilePictureResponse = await apiPost<{
          message: string;
          profilePicture: string;
        }>("/api/users/profile-picture", formData, "PUT", token);

        if (!profilePictureResponse) {
          throw new Error("No se recibió respuesta del servidor");
        }

        console.log(
          "Respuesta de la actualización de la foto:",
          profilePictureResponse
        );
        editForm.profilePicture = profilePictureResponse.profilePicture || "";
      }

      // Actualizar otros campos del perfil usando fetchWithAuth
      const response = await fetchWithAuth("/api/users/update", {
        method: "PUT",
        body: JSON.stringify({
          name: editForm.name,
          profilePicture: editForm.profilePicture,
          university: editForm.university,
          isUniversityStudent: editForm.isUniversityStudent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar el perfil");
      }

      const updatedUser = await response.json();
      updateUser({
        name: updatedUser.user.name,
        profilePicture: updatedUser.user.profilePicture,
        university: updatedUser.user.university,
        isUniversityStudent: updatedUser.user.isUniversityStudent,
      });
      setIsEditing(false);
      setEditForm((prev) => ({ ...prev, profilePictureFile: null }));
      toast.success("Perfil actualizado correctamente.");
    } catch (err: any) {
      const errorMessage = err.message || "Error al actualizar el perfil";
      console.error("Error en handleUpdate:", err);
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Activar/desactivar poder
  const handleActivatePower = useCallback(
    async (
      powerId: string | null,
      action: "activate" | "deactivate" = "activate"
    ) => {
      if (!powerId && action === "activate") return;
      if (!user) return; // Guard against null user
      if (powerId && action === "activate") {
        const power = user.powers?.find((p) => p.powerId === powerId);
        if (!power || (power.usesLeft !== undefined && power.usesLeft <= 0)) {
          toast.error("No tienes usos disponibles para este poder");
          return;
        }
      }

      setPowerLoading((prev) => ({ ...prev, [powerId || "all"]: true }));
      try {
        const response = await fetchWithAuth("/api/users/activate-power", {
          method: "POST",
          body: JSON.stringify({ powerId, action }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Error al gestionar el poder");
        }
        const responseData = await response.json();
        updateUser({
          powers: responseData.powers,
          activePowers: responseData.activePowers,
        });
        toast.success(responseData.message);
      } catch (error) {
        console.error("Error al gestionar el poder:", error);
        toast.error(
          error instanceof Error ? error.message : "Error al gestionar el poder"
        );
      } finally {
        setPowerLoading((prev) => ({ ...prev, [powerId || "all"]: false }));
      }
    },
    [fetchWithAuth, updateUser, user]
  );

  // Activar/desactivar borde
  const handleActivateBorder = async (borderId: string | null) => {
    try {
      const response = await fetchWithAuth("/api/users/set-active-border", {
        method: "POST",
        body: JSON.stringify({ borderId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al gestionar el borde");
      }
      const responseData = await response.json();
      updateUser({
        activeBorder: responseData.activeBorder || null,
        borders: user?.borders || [],
      });
      toast.success(borderId ? "Borde activado" : "Borde desactivado");
    } catch (error) {
      console.error("Error al gestionar el borde:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al gestionar el borde"
      );
    }
  };

  // Activar/desactivar etiqueta
  const handleActivateTag = async (tagId: string | null) => {
    try {
      const response = await fetchWithAuth("/api/users/set-active-tag", {
        method: "POST",
        body: JSON.stringify({ tagId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al gestionar la etiqueta");
      }
      const responseData = await response.json();
      updateUser({ activeTag: responseData.activeTag || null });
      toast.success(tagId ? "Etiqueta activada" : "Etiqueta desactivada");
    } catch (error) {
      console.error("Error al gestionar la etiqueta:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al gestionar la etiqueta"
      );
    }
  };

  // Logout
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Función para renderizar contenido de pestañas
  const renderTabContent = (tab: typeof activeTab) => {
    if (!user) return null; // Guard against null user
    switch (tab) {
      case "achievements":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.length > 0 ? (
              achievements.map((achievement, index) => (
                <div
                  key={achievement.id || `achievement-${index}`}
                  className="p-4 rounded-xl"
                  style={{
                    background: theme.colors.card,
                    boxShadow: `0 2px 10px rgba(0, 0, 0, 0.1)`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    {achievement.icon || achievement.image ? (
                      <img
                        src={achievement.icon || achievement.image}
                        alt={achievement.name}
                        className="w-10 h-10 rounded-md"
                        loading="lazy"
                        onError={(e) =>
                          (e.currentTarget.src =
                            "/images/achievements/default-trophy.png")
                        }
                      />
                    ) : (
                      <Trophy
                        className="w-10 h-10"
                        style={{ color: theme.colors.accent }}
                      />
                    )}
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: theme.colors.text }}
                      >
                        {achievement.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: theme.colors.secondaryText }}
                      >
                        {achievement.description}
                      </p>
                      {achievement.awardedAt && (
                        <p
                          className="text-xs"
                          style={{ color: theme.colors.secondaryText }}
                        >
                          Obtenido:{" "}
                          {new Date(achievement.awardedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p
                className="col-span-full text-center p-4 rounded-xl"
                style={{
                  color: theme.colors.secondaryText,
                  background: theme.colors.card,
                  boxShadow: `0 2px 10px rgba(0, 0, 0, 0.1)`,
                }}
              >
                No hay logros aún. ¡Sigue aprendiendo!
              </p>
            )}
          </div>
        );
      case "borders":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.borders && user.borders.length > 0 ? (
              user.borders.map((border) => (
                <div
                  key={border.id}
                  className="p-4 rounded-xl"
                  style={{
                    background: theme.colors.card,
                    boxShadow: `0 2px 10px rgba(0, 0, 0, 0.1)`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    {border.image ? (
                      <img
                        src={border.image}
                        alt={border.name}
                        className="w-10 h-10 rounded-md"
                        loading="lazy"
                      />
                    ) : (
                      <Shield
                        className="w-10 h-10"
                        style={{ color: theme.colors.accent }}
                      />
                    )}
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: theme.colors.text }}
                      >
                        {border.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: theme.colors.secondaryText }}
                      >
                        {border.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleActivateBorder(border.id)}
                      className="px-4 py-2 rounded-xl font-semibold text-sm button-transition min-w-12"
                      style={{
                        background:
                          user.activeBorder?.id === border.id
                            ? theme.colors.success
                            : theme.colors.accent,
                        color: theme.colors.buttonText,
                        boxShadow: `0 2px 5px rgba(0, 0, 0, 0.1)`,
                      }}
                      disabled={user.activeBorder?.id === border.id}
                    >
                      {user.activeBorder?.id === border.id
                        ? "Activo"
                        : "Activar"}
                    </button>
                    {user.activeBorder?.id === border.id && (
                      <button
                        onClick={() => handleActivateBorder(null)}
                        className="px-4 py-2 rounded-xl font-semibold text-sm button-transition min-w-12"
                        style={{
                          background: theme.colors.error,
                          color: theme.colors.buttonText,
                          boxShadow: `0 2px 5px rgba(0, 0, 0, 0.1)`,
                        }}
                      >
                        Desactivar
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p
                className="col-span-full text-center p-4 rounded-xl"
                style={{
                  color: theme.colors.secondaryText,
                  background: theme.colors.card,
                  boxShadow: `0 2px 10px rgba(0, 0, 0, 0.1)`,
                }}
              >
                No hay bordes aún. ¡Gana más!
              </p>
            )}
          </div>
        );
      case "tags":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.tags && user.tags.length > 0 ? (
              user.tags.map((tag) => (
                <div
                  key={tag.tagId}
                  className="p-4 rounded-xl"
                  style={{
                    background: theme.colors.card,
                    boxShadow: `0 2px 10px rgba(0, 0, 0, 0.1)`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    {tag.image ? (
                      <img
                        src={tag.image}
                        alt={tag.name}
                        className="w-10 h-10 rounded-md"
                        loading="lazy"
                      />
                    ) : (
                      <Star
                        className="w-10 h-10"
                        style={{ color: theme.colors.accent }}
                      />
                    )}
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: theme.colors.text }}
                      >
                        {tag.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: theme.colors.secondaryText }}
                      >
                        {tag.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleActivateTag(tag.tagId)}
                      className="px-4 py-2 rounded-xl font-semibold text-sm button-transition min-w-12"
                      style={{
                        background:
                          user.activeTag?.tagId === tag.tagId
                            ? theme.colors.success
                            : theme.colors.accent,
                        color: theme.colors.buttonText,
                        boxShadow: `0 2px 5px rgba(0, 0, 0, 0.1)`,
                      }}
                      disabled={user.activeTag?.tagId === tag.tagId}
                    >
                      {user.activeTag?.tagId === tag.tagId
                        ? "Activa"
                        : "Activar"}
                    </button>
                    {user.activeTag?.tagId === tag.tagId && (
                      <button
                        onClick={() => handleActivateTag(null)}
                        className="px-4 py-2 rounded-xl font-semibold text-sm button-transition min-w-12"
                        style={{
                          background: theme.colors.error,
                          color: theme.colors.buttonText,
                          boxShadow: `0 2px 5px rgba(0, 0, 0, 0.1)`,
                        }}
                      >
                        Desactivar
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p
                className="col-span-full text-center p-4 rounded-xl"
                style={{
                  color: theme.colors.secondaryText,
                  background: theme.colors.card,
                  boxShadow: `0 2px 10px rgba(0, 0, 0, 0.1)`,
                }}
              >
                No hay etiquetas aún. ¡Desbloquea algunas!
              </p>
            )}
          </div>
        );
      case "powers":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.powers && user.powers.length > 0 ? (
              user.powers.map((power) => (
                <div
                  key={power.powerId}
                  className="p-4 rounded-xl"
                  style={{
                    background: theme.colors.card,
                    boxShadow: `0 2px 10px rgba(0, 0, 0, 0.1)`,
                    border: user.activePowers?.some(
                      (ap) => ap.powerId === power.powerId
                    )
                      ? `2px solid ${theme.colors.accent}`
                      : "none",
                  }}
                >
                  <div className="flex items-center gap-3">
                    {power.image ? (
                      <img
                        src={power.image}
                        alt={power.name}
                        className="w-10 h-10 rounded-md"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-2xl">{power.emoji}</span>
                    )}
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: theme.colors.text }}
                      >
                        {power.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: theme.colors.secondaryText }}
                      >
                        {power.description}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: theme.colors.accent }}
                      >
                        Efecto: {power.effect.type} {power.effect.value}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: theme.colors.accent }}
                      >
                        Usos: {power.usesLeft ?? "Ilimitado"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() =>
                        handleActivatePower(power.powerId, "activate")
                      }
                      className="px-4 py-2 rounded-xl font-semibold text-sm button-transition min-w-12 disabled:opacity-50"
                      style={{
                        background: user.activePowers?.some(
                          (ap) => ap.powerId === power.powerId
                        )
                          ? theme.colors.success
                          : theme.colors.accent,
                        color: theme.colors.buttonText,
                        boxShadow: `0 2px 5px rgba(0, 0, 0, 0.1)`,
                      }}
                      disabled={
                        user.activePowers?.some(
                          (ap) => ap.powerId === power.powerId
                        ) || powerLoading[power.powerId]
                      }
                    >
                      {powerLoading[power.powerId] ? (
                        <div
                          className="animate-spin rounded-full h-4 w-4 border-2"
                          style={{
                            borderTopColor: theme.colors.buttonText,
                            borderRightColor: theme.colors.buttonText,
                            borderBottomColor: "transparent",
                            borderLeftColor: "transparent",
                          }}
                        ></div>
                      ) : user.activePowers?.some(
                          (ap) => ap.powerId === power.powerId
                        ) ? (
                        "Activo"
                      ) : (
                        "Activar"
                      )}
                    </button>
                    {user.activePowers?.some(
                      (ap) => ap.powerId === power.powerId
                    ) && (
                      <button
                        onClick={() =>
                          handleActivatePower(power.powerId, "deactivate")
                        }
                        className="px-4 py-2 rounded-xl font-semibold text-sm button-transition min-w-12 disabled:opacity-50"
                        style={{
                          background: theme.colors.error,
                          color: theme.colors.buttonText,
                          boxShadow: `0 2px 5px rgba(0, 0, 0, 0.1)`,
                        }}
                        disabled={powerLoading[power.powerId]}
                      >
                        {powerLoading[power.powerId] ? (
                          <div
                            className="animate-spin rounded-full h-4 w-4 border-2"
                            style={{
                              borderTopColor: theme.colors.buttonText,
                              borderRightColor: theme.colors.buttonText,
                              borderBottomColor: "transparent",
                              borderLeftColor: "transparent",
                            }}
                          ></div>
                        ) : (
                          "Desactivar"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p
                className="col-span-full text-center p-4 rounded-xl"
                style={{
                  color: theme.colors.secondaryText,
                  background: theme.colors.card,
                  boxShadow: `0 2px 10px rgba(0, 0, 0, 0.1)`,
                }}
              >
                No hay poderes aún. ¡Consigue algunos!
              </p>
            )}
          </div>
        );
      case "activePowers":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.activePowers && user.activePowers.length > 0 ? (
              user.activePowers.map((power) => (
                <div
                  key={power.powerId}
                  className="p-4 rounded-xl"
                  style={{
                    background: theme.colors.card,
                    boxShadow: `0 2px 10px rgba(0, 0, 0, 0.1)`,
                    border: `2px solid ${theme.colors.accent}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    {power.image ? (
                      <img
                        src={power.image}
                        alt={power.name}
                        className="w-10 h-10 rounded-md"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-2xl">{power.emoji}</span>
                    )}
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: theme.colors.text }}
                      >
                        {power.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: theme.colors.secondaryText }}
                      >
                        {power.description}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: theme.colors.accent }}
                      >
                        Efecto: {power.effect.type} {power.effect.value}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: theme.colors.accent }}
                      >
                        Tiempo restante:{" "}
                        {activePowerTimers[power.powerId] ??
                          power.remainingDuration}{" "}
                        {power.effect.durationType}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p
                className="col-span-full text-center p-4 rounded-xl"
                style={{
                  color: theme.colors.secondaryText,
                  background: theme.colors.card,
                  boxShadow: `0 2px 10px rgba(0, 0, 0, 0.1)`,
                }}
              >
                No hay poderes activos.
              </p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Retornos tempranos después de todos los Hooks
  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col font-mono"
        style={{ background: theme.colors.background }}
      >
        <Navbar />
        <div className="flex justify-center items-center flex-grow">
          <div
            className="animate-spin rounded-full h-12 w-12 border-4"
            style={{
              borderTopColor: theme.colors.accent,
              borderRightColor: theme.colors.accent,
              borderBottomColor: "transparent",
              borderLeftColor: "transparent",
            }}
          ></div>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  // Pestañas
  const tabs = [
    {
      id: "achievements",
      label: "Logros",
      icon: <Trophy className="w-5 h-5" />,
    },
    { id: "borders", label: "Bordes", icon: <Shield className="w-5 h-5" /> },
    { id: "tags", label: "Etiquetas", icon: <Star className="w-5 h-5" /> },
    { id: "powers", label: "Poderes", icon: <Zap className="w-5 h-5" /> },
    {
      id: "activePowers",
      label: "Poderes Activos",
      icon: <Zap className="w-5 h-5" />,
    },
  ];

  return (
    <div
      className="min-h-screen flex flex-col font-mono relative z-0"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.background}, #1a1a1a)`,
        color: theme.colors.text,
      }}
    >
      <style>
        {`
          .royal-gradient {
            background: linear-gradient(90deg, ${theme.colors.accent}, #FFD700, ${theme.colors.primary});
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .button-transition {
            transition: background 0.2s ease, opacity 0.2s ease;
            will-change: background, opacity;
          }
          .tab-active {
            background: ${theme.colors.accent};
            color: ${theme.colors.buttonText};
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          }
          .modal-overlay {
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(5px);
          }
          .secret-particles {
            position: absolute;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: hidden;
          }
          .secret-particle {
            position: absolute;
            width: 6px;
            height: 6px;
            background: #FFD700;
            border-radius: 50%;
            animation: particleFade 1s ease-out forwards;
          }
          @keyframes particleFade {
            0% { transform: translateY(0) scale(1); opacity: 1; }
            100% { transform: translateY(-50px) scale(0); opacity: 0; }
          }
          @media (prefers-reduced-motion) {
            .royal-gradient {
              background: ${theme.colors.text};
              -webkit-background-clip: initial;
              -webkit-text-fill-color: ${theme.colors.text};
            }
            .button-transition, .tab-active {
              transition: none;
            }
            .secret-particle {
              display: none;
            }
          }
          @media (max-width: 767px) {
            .button-transition, .tab-active {
              transition: none;
            }
          }
        `}
      </style>
      <Navbar />
      <div className="flex justify-center items-start flex-grow p-4 sm:p-6 lg:p-8 relative z-10">
        <div
          className="w-full max-w-6xl rounded-2xl p-6 sm:p-8 lg:p-10"
          style={{
            background: `linear-gradient(135deg, ${theme.colors.card}, #1a1a1a90)`,
            boxShadow: `0 4px 20px rgba(0, 0, 0, 0.2)`,
          }}
        >
          {error && (
            <div
              className="p-4 rounded-xl mb-6 text-center"
              style={{
                background: theme.colors.error,
                color: theme.colors.buttonText,
                boxShadow: `0 2px 10px rgba(0, 0, 0, 0.1)`,
              }}
            >
              {error}
            </div>
          )}
          {/* Perfil superior */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <BorderPreview border={user.activeBorder || null} size={128}>
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={`${user.name}'s profile`}
                    className="w-32 h-32 object-cover rounded-xl cursor-pointer"
                    loading="lazy"
                    onClick={handleProfileClick}
                    onError={(e) =>
                      (e.currentTarget.src = "/images/default-client.jpg")
                    }
                  />
                ) : (
                  <div
                    className="w-32 h-32 flex items-center justify-center rounded-xl cursor-pointer"
                    style={{ background: theme.colors.card }}
                    onClick={handleProfileClick}
                  >
                    <User
                      className="w-20 h-20"
                      style={{ color: theme.colors.accent }}
                    />
                  </div>
                )}
              </BorderPreview>
              {secretUnlocked && (
                <div className="secret-particles">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={`particle-${i}`}
                      className="secret-particle"
                      style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 0.5}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold mt-4 tracking-tight royal-gradient"
              style={{ fontWeight: 800 }}
            >
              {user.name}
              {user.activeTag && (
                <span
                  className="text-sm sm:text-base ml-2"
                  style={{ color: theme.colors.secondaryText }}
                >
                  ({user.activeTag.name})
                </span>
              )}
            </h2>
            {user.university && (
              <p
                className="mt-1 text-sm"
                style={{ color: theme.colors.secondaryText }}
              >
                {user.university}
              </p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-xl font-semibold text-sm button-transition min-w-12"
                style={{
                  background: theme.colors.success,
                  color: theme.colors.buttonText,
                  boxShadow: `0 2px 5px rgba(0, 0, 0, 0.1)`,
                }}
              >
                <Edit className="w-4 h-4 inline mr-1" />
                Editar
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl font-semibold text-sm button-transition min-w-12"
                style={{
                  background: theme.colors.error,
                  color: theme.colors.buttonText,
                  boxShadow: `0 2px 5px rgba(0, 0, 0, 0.1)`,
                }}
              >
                <LogOut className="w-4 h-4 inline mr-1" />
                Salir
              </button>
            </div>
          </div>
          {/* Estadísticas */}
          <div className="flex overflow-x-auto gap-4 mb-8 pb-2">
            {[
              {
                label: "Monedas",
                value: user.coins,
                icon: (
                  <Coins className="w-5 h-5" style={{ color: "#FFD700" }} />
                ),
              },
              {
                label: "Racha",
                value: `${user.streak} días`,
                icon: (
                  <Zap
                    className="w-5 h-5"
                    style={{ color: theme.colors.accent }}
                  />
                ),
              },
              {
                label: "Vidas",
                value: user.lives,
                icon: (
                  <User
                    className="w-5 h-5"
                    style={{ color: theme.colors.accent }}
                  />
                ),
              },
              {
                label: "Nivel",
                value: `${user.level} (${user.xp}/${user.maxXp} XP)`,
                icon: (
                  <Trophy
                    className="w-5 h-5"
                    style={{ color: theme.colors.accent }}
                  />
                ),
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex-shrink-0 p-4 rounded-xl w-36"
                style={{
                  background: theme.colors.card,
                  boxShadow: `0 2px 10px rgba(0, 0, 0, 0.1)`,
                }}
              >
                <div className="flex items-center gap-2">
                  {stat.icon}
                  <p
                    className="text-xs"
                    style={{ color: theme.colors.secondaryText }}
                  >
                    {stat.label}
                  </p>
                </div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
          {/* Pestañas */}
          <div className="flex flex-col sm:flex-row gap-2 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm button-transition min-w-12 ${
                  activeTab === tab.id ? "tab-active" : ""
                }`}
                style={{
                  background:
                    activeTab === tab.id
                      ? theme.colors.accent
                      : theme.colors.card,
                  color:
                    activeTab === tab.id
                      ? theme.colors.buttonText
                      : theme.colors.text,
                  boxShadow:
                    activeTab === tab.id
                      ? `0 2px 5px rgba(0, 0, 0, 0.2)`
                      : "none",
                }}
                aria-label={`Ver ${tab.label}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          {/* Contenido de pestañas */}
          {renderTabContent(activeTab)}
          {/* Modal de edición */}
          {isEditing && (
            <div className="fixed inset-0 modal-overlay flex justify-center items-center z-50">
              <div
                className="w-full max-w-md p-6 rounded-xl"
                style={{
                  background: theme.colors.card,
                  boxShadow: `0 4px 20px rgba(0, 0, 0, 0.3)`,
                }}
              >
                <h3
                  className="text-xl font-bold mb-4 royal-gradient"
                  style={{ color: theme.colors.text }}
                >
                  Editar Perfil
                </h3>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1"
                      style={{ color: theme.colors.text }}
                    >
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      className="w-full p-3 rounded-xl text-sm"
                      style={{
                        background: theme.colors.background,
                        color: theme.colors.text,
                        border: `1px solid ${theme.colors.border}`,
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1"
                      style={{ color: theme.colors.text }}
                    >
                      Foto de Perfil (JPEG/PNG, máx. 5MB)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          profilePictureFile: e.target.files
                            ? e.target.files[0]
                            : null,
                        })
                      }
                      className="w-full p-3 rounded-xl text-sm"
                      style={{
                        background: theme.colors.background,
                        color: theme.colors.text,
                        border: `1px solid ${theme.colors.border}`,
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1"
                      style={{ color: theme.colors.text }}
                    >
                      Universidad
                    </label>
                    <input
                      type="text"
                      value={editForm.university || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, university: e.target.value })
                      }
                      className="w-full p-3 rounded-xl text-sm"
                      style={{
                        background: theme.colors.background,
                        color: theme.colors.text,
                        border: `1px solid ${theme.colors.border}`,
                      }}
                      placeholder="Nombre de la universidad"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.isUniversityStudent}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          isUniversityStudent: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                      style={{ accentColor: theme.colors.accent }}
                    />
                    <label
                      className="text-sm"
                      style={{ color: theme.colors.text }}
                    >
                      ¿Estudiante universitario?
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl font-semibold text-sm button-transition min-w-12"
                      style={{
                        background: theme.colors.success,
                        color: theme.colors.buttonText,
                        boxShadow: `0 2px 5px rgba(0, 0, 0, 0.1)`,
                      }}
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-xl font-semibold text-sm button-transition min-w-12"
                      style={{
                        background: theme.colors.error,
                        color: theme.colors.buttonText,
                        boxShadow: `0 2px 5px rgba(0, 0, 0, 0.1)`,
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
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

export default Profile;
