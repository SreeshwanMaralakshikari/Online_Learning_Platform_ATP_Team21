import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import LearningAssistant from "./components/LearningAssistant";
import ProtectedRoute from "./components/Protectedroute";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Profile from "./pages/Profile";
import StudentDashboard from "./pages/student/StudentDashboard";
import BrowseCourses from "./pages/student/BrowseCourses";
import CourseDetail from "./pages/student/Coursedetail";
import Payment from "./pages/student/Payment";
import Wishlist from "./pages/student/Wishlist";
import CoursePlayer from "./pages/student/Courseplayer";
import RateCourse from "./pages/student/Ratecourse";
import Certificate from "./pages/student/Certificate";
import CompletedCourses from "./pages/student/CompletedCourses";
import InstructorDashboard from "./pages/instructor/Instructordashboard";
import CreateCourse from "./pages/instructor/Createcourse";
import EditCourse from "./pages/instructor/Editcourses";
import InstructorDoubts from "./pages/instructor/InstructorDoubts";

import AdminDashboard from "./pages/admin/Admindashboard";
import ManageUsers from "./pages/admin/Manageusers";
import ManageCourses from "./pages/admin/Managecourses";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
          <main className="pt-16">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/home" element={<Navigate to="/" replace />} />

              <Route element={<ProtectedRoute allowedRoles={["STUDENT"]} />}>
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student/courses" element={<BrowseCourses />} />
                <Route path="/student/wishlist" element={<Wishlist />} />
                <Route path="/student/courses/:id" element={<CourseDetail />} />
                <Route path="/student/payment/:courseId" element={<Payment />} />
                <Route path="/student/learn/:id" element={<CoursePlayer />} />
                <Route path="/student/review/:courseId" element={<RateCourse />} />
                <Route path="/student/certificate/:courseId" element={<Certificate />} />
                <Route path="/student/completed-courses" element={<CompletedCourses />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["INSTRUCTOR"]} />}>
                <Route path="/instructor/dashboard" element={<InstructorDashboard />} />
                <Route path="/instructor/doubts" element={<InstructorDoubts />} />
                <Route path="/instructor/courses/new" element={<CreateCourse />} />
                <Route path="/instructor/courses/:id/edit" element={<EditCourse />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<ManageUsers />} />
                <Route path="/admin/courses" element={<ManageCourses />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["STUDENT", "INSTRUCTOR", "ADMIN"]} />}>
                <Route path="/profile" element={<Profile />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <LearningAssistant />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
