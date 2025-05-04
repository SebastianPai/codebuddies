// frontend/src/App.tsx
import { Routes, Route } from "react-router-dom";
import Login from "./features/dashboard/views/Login";
import Register from "./features/dashboard/views/Register";
import Dashboard from "./features/dashboard/views/Dashboard";
import PrivateRoute from "./components/common/PrivateRoute";
import Home from "./features/dashboard/views/Home";
import FindFriends from "./features/social/views/FindFriends";
import FriendRequests from "./features/social/views/FriendRequests";
import FriendList from "./features/social/views/FriendList";
import PendingSentRequests from "./features/social/views/PendingSentRequests";
import Learn from "./views/Learn";
import ChallengeView from "./features/exercises/views/ChallengeView";
import CourseLessons from "./features/courses/views/CourseLessons";
import SolveExercise from "./features/exercises/views/SolveExercise";
import AdminModules from "./pages/AdminModules";
import AdminCourses from "./pages/AdminCourses";
import AdminLessons from "./features/lessons/views/AdminLessons";
import AdminExercise from "./features/exercises/views/AdminExercise";
import UserProfile from "./components/user/UserProfile";

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
