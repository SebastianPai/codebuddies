// frontend/src/components/UserProfileCard.tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import BorderPreview from "@/components/BorderPreview";
import { Crown, Diamond, Shield, Star, Palette } from "lucide-react";

export const UserProfileCard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();

  return (
    <div
      className="rounded-xl p-6 border-4 animate-course-item shine"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.card} 0%, ${theme.colors.background} 100%)`,
        borderColor: theme.colors.border,
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
      }}
    >
      <div className="flex flex-col items-center mb-4">
        <div className="w-20 h-20 rounded-xl overflow-hidden">
          <BorderPreview border={user?.activeBorder || null} size={80}>
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  e.currentTarget.src = "/images/default-profile.jpg";
                }}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.accent} 0%, ${theme.colors.primary} 100%)`,
                }}
              >
                <span
                  className="text-3xl font-bold"
                  style={{ color: theme.colors.buttonText }}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </span>
              </div>
            )}
          </BorderPreview>
        </div>
        <h3
          className="text-lg font-bold mt-3 flex items-center"
          style={{ color: theme.colors.text }}
        >
          {user?.name || "Usuario"}
        </h3>
        <p className="text-sm" style={{ color: theme.colors.secondaryText }}>
          Nivel {user ? user.level || 2 : "Desconocido"}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <button
          className="w-full py-2 rounded-lg transition-transform hover:scale-105 font-bold border-4 course-pulse"
          onClick={() => navigate("/perfil")}
          style={{
            background: theme.colors.accenttwo,
            color: theme.colors.buttonText,
            borderColor: theme.colors.border,
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.1)",
          }}
        >
          Ver perfil
        </button>
        <button
          className="w-full py-2 rounded-lg transition-transform hover:scale-105 font-bold border-4"
          onClick={() => navigate("/shop")}
          style={{
            background: theme.colors.accent,
            color: theme.colors.buttonText,
            borderColor: theme.colors.border,
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Palette className="w-4 h-4 mr-2 inline" />
          Personalizar perfil
        </button>
      </div>
    </div>
  );
};
