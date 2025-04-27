// frontend/src/App.tsx
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PrivateRoute from "./components/PrivateRoute";
import Home from "./pages/Home";
import FindFriends from "./pages/FindFriends";
import FriendRequests from "./pages/FriendRequests";
import FriendList from "./pages/FriendList";
import PendingSentRequests from "./pages/PendingSentRequests";
import Learn from "./views/Learn";
import ModuleDetail from "./views/ModuleDetail";
import LessonDetail from "./views/LessonDetail";
import ChallengeView from "./views/ChallengeView";
import CourseLessons from "./views/CourseLessons";
import SolveExercise from "./views/SolveExercise";
import AdminModules from "./pages/AdminModules";
import AdminCourses from "./pages/AdminCourses";
import AdminLessons from "./pages/AdminLessons";
import AdminExercise from "./pages/AdminExercise";
import UserProfile from "./components/UserProfile";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/buscar-amigos"
        element={
          <PrivateRoute>
            <FindFriends />
          </PrivateRoute>
        }
      />
      <Route
        path="/solicitudes"
        element={
          <PrivateRoute>
            <FriendRequests />
          </PrivateRoute>
        }
      />
      <Route path="/friends" element={<FriendList />} />
      <Route path="/enviadas" element={<PendingSentRequests />} />
      <Route path="/learn" element={<Learn />} />
      <Route path="/perfil" element={<UserProfile />} />
      <Route path="/learn/module/:moduleId" element={<ModuleDetail />} />
      <Route path="/learn/lesson/:lessonId" element={<LessonDetail />} />
      <Route
        path="/learn/lesson/:lessonId/challenge"
        element={<ChallengeView />}
      />
      <Route path="/learn/course/:id" element={<CourseLessons />} />
      <Route
        path="/courses/:courseId/lessons/:lessonId/exercises/:exerciseOrder"
        element={<SolveExercise />}
      />
      <Route path="/admin/modules" element={<AdminModules />} />
      <Route
        path="/admin/modules/:moduleId/courses"
        element={<AdminCourses />}
      />
      <Route path="/admin/lessons/:courseId" element={<AdminLessons />} />
      <Route path="/admin/exercise/:lessonId" element={<AdminExercise />} />
      <Route
        path="/admin/exercise/:lessonId/:order"
        element={<AdminExercise />}
      />
    </Routes>
  );
}
// frontend/src/api.tsx
const API_URL: string = import.meta.env.VITE_API_URL || "http://localhost:5000";
console.log("API_URL:", API_URL); // Añade este console.log para depurar
