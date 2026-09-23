import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/public/Login';
import Dashboard from './pages/student/Dashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import Profile from './pages/Profile';
import ClubsDashboard from './pages/student/ClubsDashboard';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallback = user.role === 'student' ? "/dashboard" : "/admin";
    return <Navigate to={fallback} replace />;
  }
  return children;
};

function AppRoutes() {
  const { user } = useContext(AuthContext);
  
  const getHomeRoute = () => {
    if (!user) return "/login";
    return user.role === 'student' ? "/dashboard" : "/admin";
  };

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={getHomeRoute()} /> : <Login />} />
      <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
      <Route path="/clubs" element={user ? <ClubsDashboard /> : <Navigate to="/login" />} />
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['student']}><Dashboard /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin', 'coordinator', 'finance', 'mentor', 'faculty']}><AdminDashboard /></ProtectedRoute>} />
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
