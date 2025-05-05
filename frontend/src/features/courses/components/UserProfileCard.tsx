import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export const UserProfileCard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();

  return (
    <div
      className="rounded-lg p-4 border-4"
      style={{
        background: theme.colors.card,
        borderColor: theme.colors.border,
      }}
    >
      <div className="flex items-center mb-4">
        <div
          className="w-12 h-12 rounded-md flex items-center justify-center mr-3 border-2"
          style={{
            background: theme.colors.primary,
            borderColor: theme.colors.border,
          }}
        >
          <span
            className="font-bold"
            style={{ color: theme.colors.buttonText }}
          >
            {user?.name?.[0]?.toUpperCase() || "U"}
          </span>
        </div>
        <div>
          <h3 style={{ color: theme.colors.text }}>
            {user?.name || "Usuario"}
          </h3>
          <p className="text-sm" style={{ color: theme.colors.secondaryText }}>
            Nivel {user ? 2 : "Desconocido"}
          </p>
        </div>
      </div>
      <button
        className="w-full py-2 rounded-md transition-colors font-bold border-2"
        onClick={() => navigate("/perfil")}
        style={{
          background: theme.colors.button,
          color: theme.colors.buttonText,
          borderColor: theme.colors.border,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = theme.colors.accent;
          e.currentTarget.style.color = theme.colors.buttonText;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = theme.colors.button;
          e.currentTarget.style.color = theme.colors.buttonText;
        }}
      >
        Ver perfil
      </button>
    </div>
  );
};
