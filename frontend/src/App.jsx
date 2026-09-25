import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/public/Login';
import Dashboard from './pages/student/Dashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import Profile from './pages/Profile';
import ClubsDashboard from './pages/student/ClubsDashboard';

const ProtectedRoute = ({ children, allowedRoles, adminOrClubAdmin }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (adminOrClubAdmin) {
    const isCoreAdmin = ['admin', 'coordinator', 'finance'].includes(user.role);
    const hasAdminPermission = user.permissions?.dashboard_type === 'admin';
    if (!isCoreAdmin && !user.is_club_admin && !hasAdminPermission) {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const isCoreStudent = ['student', 'faculty', 'mentor'].includes(user.role);
    const hasStudentPermission = user.permissions?.dashboard_type === 'student';
    const fallback = (isCoreStudent || hasStudentPermission) ? "/dashboard" : "/admin";
    return <Navigate to={fallback} replace />;
  }
  return children;
};

function AppRoutes() {
  const { user } = useContext(AuthContext);
  
  const getHomeRoute = () => {
    if (!user) return "/login";
    const isCoreStudent = ['student', 'faculty', 'mentor'].includes(user.role);
    const hasStudentPermission = user.permissions?.dashboard_type === 'student';
    return (isCoreStudent || hasStudentPermission) ? "/dashboard" : "/admin";
  };

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={getHomeRoute()} /> : <Login />} />
      <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
      <Route path="/clubs" element={user ? <ClubsDashboard /> : <Navigate to="/login" />} />
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['student', 'faculty', 'mentor']}><Dashboard /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute adminOrClubAdmin={true}><AdminDashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={getHomeRoute()} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
