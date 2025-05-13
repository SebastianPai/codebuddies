// frontend/src/components/AchievementsCard.tsx
import { useTheme } from "@/context/ThemeContext";
import { Award, Star } from "lucide-react";

interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
}

interface AchievementsCardProps {
  achievements?: Achievement[]; // Hacer la prop opcional
}

export const AchievementsCard: React.FC<AchievementsCardProps> = ({
  achievements = [
    {
      id: "1",
      title: "Primera Lección Completada",
      description: "Completaste tu primera lección en el curso de JavaScript.",
      date: "2025-05-10",
    },
    {
      id: "2",
      title: "5 Ejercicios Resueltos",
      description: "Resolviste 5 ejercicios en un solo curso.",
      date: "2025-05-09",
    },
  ], // Valor por defecto
}) => {
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
      <h3
        className="mb-4 flex items-center text-lg font-bold"
        style={{ color: theme.colors.text }}
      >
        <Award
          className="w-6 h-6 mr-2"
          style={{ color: theme.colors.accent }}
        />
        Logros Recientes
      </h3>
      {achievements.length === 0 ? (
        <p className="text-sm" style={{ color: theme.colors.secondaryText }}>
          ¡Completa más lecciones para desbloquear logros!
        </p>
      ) : (
        <ul className="space-y-3">
          {achievements.map((achievement) => (
            <li
              key={achievement.id}
              className="p-3 rounded-lg border-4"
              style={{
                background: theme.colors.card,
                borderColor: theme.colors.border,
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div className="flex items-center">
                <Star
                  className="w-5 h-5 mr-2"
                  style={{ color: theme.colors.accent }}
                />
                <div>
                  <h4
                    className="font-bold"
                    style={{ color: theme.colors.text }}
                  >
                    {achievement.title}
                  </h4>
                  <p
                    className="text-sm"
                    style={{ color: theme.colors.secondaryText }}
                  >
                    {achievement.description}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: theme.colors.secondaryText }}
                  >
                    {achievement.date}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
