import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Layout from './components/layout/Layout';
import DashboardLayout from './components/layout/DashboardLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import SubjectDetailPage from './pages/SubjectDetailPage';
import VirtualClassroomPage from './pages/VirtualClassroomPage';
import UserProfilePage from './pages/UserProfilePage';
import AdminPanelPage from './pages/AdminPanelPage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
import TeacherCoursesPage from './pages/TeacherCoursesPage';
import VirtualLibraryPage from './pages/VirtualLibraryPage';
import CourseContentEditorPage from './pages/CourseContentEditorPage';
import GradebookPage from './pages/GradebookPage';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes WITH Main Layout */}
          <Route path="/" element={<Layout><LandingPage /></Layout>} />
          
          {/* Auth Routes WITHOUT Main Layout */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          
          {/* Dashboard Routes (Protected) */}
          
          {/* 1. Student / Common */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <DashboardLayout><StudentDashboard /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard/profile" element={
            <ProtectedRoute>
              <DashboardLayout><UserProfilePage /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard/library" element={
            <ProtectedRoute>
              <DashboardLayout><VirtualLibraryPage /></DashboardLayout>
            </ProtectedRoute>
          } />
          
          {/* 2. Course Flow */}
          <Route path="/dashboard/courses/:id" element={
            <ProtectedRoute>
              <DashboardLayout><SubjectDetailPage /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard/courses/:id/lessons/:lessonId" element={
            <ProtectedRoute>
              <DashboardLayout><VirtualClassroomPage /></DashboardLayout>
            </ProtectedRoute>
          } />
          
          {/* 3. Teacher Specific */}
          <Route path="/dashboard/teacher" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <DashboardLayout><TeacherDashboardPage /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard/teacher/courses" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <DashboardLayout><TeacherCoursesPage /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard/teacher/gradebook" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <DashboardLayout><GradebookPage /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard/teacher/editor" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <DashboardLayout><CourseContentEditorPage /></DashboardLayout>
            </ProtectedRoute>
          } />
          
          {/* 4. Admin Specific */}
          <Route path="/dashboard/admin" element={
            <ProtectedRoute allowedRoles={['admin', 'teacher']}>
              <DashboardLayout><AdminPanelPage /></DashboardLayout>
            </ProtectedRoute>
          } />
          
          {/* Catch-all route */}
          <Route path="*" element={
            <Layout>
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <h1 className="text-4xl font-headline font-black text-primary mb-4 tracking-tight">404 - Página no encontrada</h1>
                <p className="text-on-surface-variant mb-8 font-body">Lo sentimos, la página que buscas no existe o está en construcción.</p>
                <Link to="/" className="bg-primary text-white px-8 py-3 rounded-full font-headline font-bold shadow-lg hover:translate-y-[-2px] transition-all active:scale-95">Volver al inicio</Link>
              </div>
            </Layout>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
