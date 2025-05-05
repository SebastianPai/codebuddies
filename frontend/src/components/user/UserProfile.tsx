"use client";

import { useState, useEffect, JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  Star,
  Zap,
  Shield,
  Flame,
  Wind,
  Edit,
  LogOut,
  Trophy,
  User,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import Navbar from "../common/Navbar";
import { useAuth } from "../../context/AuthContext";
import { apiGet, apiPost } from "../../api";

interface EditForm {
  name: string;
  profilePicture: string;
  university: string;
  isUniversityStudent: boolean;
  profilePictureFile?: File | null;
}

interface ApiResponse {
  user: {
    id: string;
    name: string;
    email: string;
    profilePicture: string;
    university: string;
    isUniversityStudent: boolean;
    level: number;
    xp: number;
    maxXp: number;
    powers: { name: string; icon: string }[];
    achievements: { name: string; description: string }[];
  };
  message?: string;
}

interface Ranking {
  rank: number;
  name: string;
  xp: number;
  level: number; // Cambiado de opcional a requerido
  profilePicture: string; // Cambiado de opcional a requerido
  isCurrentUser?: boolean;
}

interface ThemeColors {
  background: string;
  text: string;
  card: string;
  border: string;
  accent: string;
  secondaryText: string;
  primary: string;
  success: string;
  error: string;
  buttonText: string;
}

interface ThemeContext {
  theme: { colors: ThemeColors };
}

export default function UserProfile() {
  const { theme } = useTheme() as ThemeContext;
  const navigate = useNavigate();
  const { user, logout, fetchWithAuth } = useAuth();

  const [userData, setUserData] = useState({
    id: "",
    name: "",
    email: "",
    profilePicture: "",
    university: "",
    isUniversityStudent: false,
    level: 1,
    xp: 0,
    maxXp: 100,
    powers: [] as { name: string; icon: string }[],
    achievements: [] as { name: string; description: string }[],
  });
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    profilePicture: "",
    university: "",
    isUniversityStudent: false,
    profilePictureFile: null,
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user || !localStorage.getItem("token")) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  // Sync userData with AuthContext global state
  useEffect(() => {
    if (user) {
      setUserData((prev) => ({
        ...prev,
        id: user.id,
        name: user.name,
        email: user.email,
        level: user.level || 1,
        xp: user.xp || 0,
        maxXp: user.maxXp || 100,
        profilePicture: user.profilePicture || "",
        university: user.university || "",
        isUniversityStudent: user.isUniversityStudent || false,
        achievements: user.achievements || [],
      }));
      setEditForm({
        name: user.name,
        profilePicture: user.profilePicture || "",
        university: user.university || "",
        isUniversityStudent: user.isUniversityStudent || false,
        profilePictureFile: null,
      });
    }
  }, [user]);

  // Fetch complete user data and rankings
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError("");
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        // Fetch user data
        const userDataResponse = await apiGet<ApiResponse>(
          "/api/users/me",
          token,
          { signal: controller.signal }
        );
        if (isMounted) {
          setUserData({
            id: userDataResponse.user.id || "",
            name: userDataResponse.user.name || "",
            email: userDataResponse.user.email || "",
            profilePicture: userDataResponse.user.profilePicture || "",
            university: userDataResponse.user.university || "",
            isUniversityStudent:
              userDataResponse.user.isUniversityStudent || false,
            level: userDataResponse.user.level || 1,
            xp: userDataResponse.user.xp || 0,
            maxXp: userDataResponse.user.maxXp || 100,
            powers: Array.isArray(userDataResponse.user.powers)
              ? userDataResponse.user.powers
              : [],
            achievements: Array.isArray(userDataResponse.user.achievements)
              ? userDataResponse.user.achievements
              : [],
          });
          setEditForm({
            name: userDataResponse.user.name || "",
            profilePicture: userDataResponse.user.profilePicture || "",
            university: userDataResponse.user.university || "",
            isUniversityStudent:
              userDataResponse.user.isUniversityStudent || false,
            profilePictureFile: null,
          });
        }

        // Fetch rankings
        const rankingsResponse = await fetchWithAuth("/api/users/rankings", {
          signal: controller.signal,
        });
        if (!rankingsResponse.ok) {
          const errorData = await rankingsResponse.json();
          throw new Error(
            errorData.message ||
              `Error ${rankingsResponse.status} fetching rankings`
          );
        }
        const rankingsData = await rankingsResponse.json();
        const formattedRankings = (rankingsData.rankings || []).map(
          (rank: Ranking) => ({
            ...rank,
            isCurrentUser: rank.name === user?.name,
          })
        );
        if (isMounted) {
          setRankings(formattedRankings);
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          return;
        }
        const errorMessage = err.message || "Error loading profile or rankings";
        if (isMounted) {
          setError(errorMessage);
          if (
            err.message.includes(
              "Por favor, inicia sesión para acceder al curso"
            )
          ) {
            navigate("/login", { replace: true, state: { fromCourse: true } });
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (user && localStorage.getItem("token")) {
      fetchData();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [fetchWithAuth, user, navigate]);

  // Handle profile update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      // Validate file
      if (editForm.profilePictureFile) {
        const file = editForm.profilePictureFile;
        const validTypes = ["image/jpeg", "image/png"];
        if (!validTypes.includes(file.type)) {
          throw new Error("Only JPEG or PNG images are allowed.");
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error("Image must not exceed 5MB.");
        }

        const formData = new FormData();
        formData.append("profilePicture", file);

        const profilePictureResponse = await apiPost<{
          message: string;
          profilePicture: string;
        }>("/api/users/profile-picture", formData, "PUT", token);
        editForm.profilePicture = profilePictureResponse.profilePicture;
      }

      // Update other fields
      const data = await apiPost<ApiResponse>(
        "/api/users/update",
        {
          name: editForm.name,
          profilePicture: editForm.profilePicture,
          university: editForm.university,
          isUniversityStudent: editForm.isUniversityStudent,
        },
        "PUT",
        token
      );

      setUserData((prev) => ({
        ...prev,
        ...data.user,
        powers: prev.powers,
        achievements: prev.achievements,
      }));
      setIsEditing(false);
      setEditForm((prev) => ({ ...prev, profilePictureFile: null }));
    } catch (err: any) {
      const errorMessage =
        err.message || err.response?.data?.message || "Error updating profile";
      setError(errorMessage);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const xpPercentage = userData.maxXp
    ? (userData.xp / userData.maxXp) * 100
    : 0;

  const iconMap: { [key: string]: JSX.Element } = {
    Flame: <Flame className="w-6 h-6" style={{ color: theme.colors.accent }} />,
    Wind: <Wind className="w-6 h-6" style={{ color: theme.colors.primary }} />,
    Zap: <Zap className="w-6 h-6" style={{ color: theme.colors.success }} />,
    Shield: (
      <Shield className="w-6 h-6" style={{ color: theme.colors.accent }} />
    ),
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex flex-col font-mono"
        style={{
          background: theme.colors.background,
          color: theme.colors.text,
        }}
      >
        <Navbar />
        <div className="flex justify-center items-center flex-grow">
          <div className="text-center" style={{ color: theme.colors.text }}>
            Loading profile...
          </div>
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

          <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
            <div className="relative">
              <div
                className="w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden flex items-center justify-center"
                style={{
                  border: `4px solid ${theme.colors.accent}`,
                  background: theme.colors.border,
                }}
              >
                {userData.profilePicture ? (
                  <img
                    src={userData.profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/images/default-profile.jpg";
                    }}
                  />
                ) : (
                  <User
                    className="w-16 h-16 md:w-20 md:h-20"
                    style={{ color: theme.colors.accent }}
                  />
                )}
              </div>
              <div
                className="absolute -bottom-2 -right-2 text-xs rounded-md px-2 py-1 animate-pulse"
                style={{
                  background: theme.colors.primary,
                  color: theme.colors.buttonText,
                  border: `2px solid ${theme.colors.border}`,
                }}
              >
                LVL {userData.level}
              </div>
            </div>

            <div className="flex flex-col items-center md:items-start">
              <h1
                className="text-3xl md:text-4xl font-bold tracking-wider"
                style={{ color: theme.colors.text }}
              >
                {userData.name}
              </h1>
              <div
                className="text-lg mt-1"
                style={{ color: theme.colors.secondaryText }}
              >
                Level {userData.level}
              </div>
              {userData.isUniversityStudent && userData.university && (
                <div
                  className="text-sm mt-1"
                  style={{ color: theme.colors.secondaryText }}
                >
                  Student at {userData.university}
                </div>
              )}
              {!userData.isUniversityStudent && userData.university && (
                <div
                  className="text-sm mt-1"
                  style={{ color: theme.colors.secondaryText }}
                >
                  {userData.university}
                </div>
              )}

              <div className="w-full mt-3">
                <div
                  className="flex justify-between text-sm mb-1"
                  style={{ color: theme.colors.secondaryText }}
                >
                  <span>
                    XP: {userData.xp}/{userData.maxXp}
                  </span>
                  <span>{Math.round(xpPercentage)}%</span>
                </div>
                <div
                  className="w-full h-4 rounded-md overflow-hidden"
                  style={{
                    background: theme.colors.border,
                    border: `2px solid ${theme.colors.border}`,
                  }}
                >
                  <div
                    className="h-full rounded-sm transition-all duration-500 ease-in-out"
                    style={{
                      width: `${xpPercentage}%`,
                      background: theme.colors.accent,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4 md:mt-0 md:ml-auto">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-md font-bold flex items-center gap-2 hover:brightness-110 transition-all"
                style={{
                  background: theme.colors.success,
                  color: theme.colors.buttonText,
                }}
              >
                <Edit className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-md font-bold flex items-center gap-2 hover:brightness-110 transition-all"
                style={{
                  background: theme.colors.error,
                  color: theme.colors.buttonText,
                }}
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {isEditing && (
            <div
              className="mb-8 p-4 rounded-md"
              style={{ background: theme.colors.card }}
            >
              <h2
                className="text-xl font-bold mb-4"
                style={{
                  color: theme.colors.text,
                  borderBottom: `2px solid ${theme.colors.border}`,
                }}
              >
                Edit Profile
              </h2>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block mb-2"
                    style={{ color: theme.colors.text }}
                  >
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                    style={{
                      background: theme.colors.background,
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
                    htmlFor="profilePictureFile"
                    className="block mb-2"
                    style={{ color: theme.colors.text }}
                  >
                    Profile Picture (JPEG/PNG, max 5MB)
                  </label>
                  <input
                    id="profilePictureFile"
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
                    className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:bg-gray-600 file:text-white hover:file:bg-gray-500"
                    style={{
                      background: theme.colors.background,
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
                    htmlFor="university"
                    className="block mb-2"
                    style={{ color: theme.colors.text }}
                  >
                    University or Institution
                  </label>
                  <input
                    id="university"
                    type="text"
                    value={editForm.university}
                    onChange={(e) =>
                      setEditForm({ ...editForm, university: e.target.value })
                    }
                    className="w-full rounded-md p-3 focus:outline-none focus:scale-[1.02] transition-all duration-300"
                    style={{
                      background: theme.colors.background,
                      border: `2px solid ${theme.colors.border}`,
                      color: theme.colors.text,
                    }}
                    placeholder="University name"
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
                    id="isUniversityStudent"
                    type="checkbox"
                    checked={editForm.isUniversityStudent}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        isUniversityStudent: e.target.checked,
                      })
                    }
                    style={{ accentColor: theme.colors.accent }}
                  />
                  <label
                    htmlFor="isUniversityStudent"
                    style={{ color: theme.colors.text }}
                  >
                    University student?
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md font-bold hover:brightness-110 transition-all"
                    style={{
                      background: theme.colors.success,
                      color: theme.colors.buttonText,
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-md font-bold hover:brightness-110 transition-all"
                    style={{
                      background: theme.colors.error,
                      color: theme.colors.buttonText,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="mb-8">
            <h2
              className="text-xl font-bold mb-4"
              style={{
                color: theme.colors.text,
                borderBottom: `2px solid ${theme.colors.border}`,
              }}
            >
              POWERS AND ABILITIES
            </h2>
            {userData.powers.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {userData.powers.map((power, index) => (
                  <div
                    key={index}
                    className="rounded-md p-3 flex items-center gap-2"
                    style={{
                      background: theme.colors.border,
                      border: `2px solid ${theme.colors.border}`,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                    }
                  >
                    {iconMap[power.icon] || (
                      <Star
                        className="w-6 h-6"
                        style={{ color: theme.colors.accent }}
                      />
                    )}
                    <span style={{ color: theme.colors.text }}>
                      {power.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: theme.colors.secondaryText }}>
                No powers available.
              </p>
            )}
          </div>

          <div className="mb-8">
            <h2
              className="text-xl font-bold mb-4"
              style={{
                color: theme.colors.text,
                borderBottom: `2px solid ${theme.colors.border}`,
              }}
            >
              WEEKLY RANKINGS
            </h2>
            {rankings.length > 0 ? (
              <div className="grid gap-2">
                {rankings.map((player, index) => (
                  <div key={player.rank}>
                    <div
                      className="flex items-center p-3 rounded-md"
                      style={{
                        background: player.isCurrentUser
                          ? theme.colors.card
                          : theme.colors.background,
                        border: `2px solid ${
                          player.isCurrentUser
                            ? theme.colors.accent
                            : theme.colors.border
                        }`,
                      }}
                    >
                      <div
                        className="flex items-center justify-center w-8 h-8 rounded-md mr-3"
                        style={{ background: theme.colors.background }}
                      >
                        <Trophy
                          className="w-5 h-5"
                          style={{
                            color:
                              player.rank === 1
                                ? theme.colors.accent
                                : player.rank === 2
                                ? theme.colors.secondaryText
                                : player.rank === 3
                                ? theme.colors.primary
                                : theme.colors.text,
                          }}
                        />
                      </div>
                      <div
                        className="text-xl font-bold mr-3"
                        style={{ color: theme.colors.text }}
                      >
                        #{player.rank}
                      </div>
                      <div className="w-8 h-8 rounded-full overflow-hidden mr-3">
                        {player.profilePicture ? (
                          <img
                            src={player.profilePicture}
                            alt={`${player.name}'s profile`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src =
                                "/images/default-profile.jpg";
                            }}
                          />
                        ) : (
                          <User
                            className="w-8 h-8 p-1"
                            style={{ color: theme.colors.accent }}
                          />
                        )}
                      </div>
                      <div
                        className="flex-grow flex items-center gap-2"
                        style={{ color: theme.colors.text }}
                      >
                        <span>{player.name}</span>
                        <span
                          className="text-sm"
                          style={{ color: theme.colors.secondaryText }}
                        >
                          (Lv. {player.level})
                        </span>
                      </div>
                      <div
                        className="font-bold"
                        style={{ color: theme.colors.accent }}
                      >
                        {player.xp} XP
                      </div>
                    </div>
                    {index === 4 && rankings.length > 5 && (
                      <div
                        className="w-full text-center py-2"
                        style={{ color: theme.colors.secondaryText }}
                      >
                        ...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: theme.colors.secondaryText }}>
                No rankings available. {error && `(${error})`}
              </p>
            )}
          </div>

          <div>
            <h2
              className="text-xl font-bold mb-4"
              style={{
                color: theme.colors.text,
                borderBottom: `2px solid ${theme.colors.border}`,
              }}
            >
              UNLOCKED ACHIEVEMENTS
            </h2>
            {userData.achievements.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {userData.achievements.map((achievement, index) => (
                  <div
                    key={index}
                    className="rounded-md p-4"
                    style={{
                      background: theme.colors.border,
                      border: `2px solid ${theme.colors.border}`,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                    }
                  >
                    <div className="flex justify-center mb-2">
                      <Star
                        className="w-8 h-8"
                        style={{ color: theme.colors.accent }}
                      />
                    </div>
                    <h3
                      className="font-bold text-center"
                      style={{ color: theme.colors.text }}
                    >
                      {achievement.name}
                    </h3>
                    <p
                      className="text-xs text-center"
                      style={{ color: theme.colors.secondaryText }}
                    >
                      {achievement.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: theme.colors.secondaryText }}>
                No achievements unlocked.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
