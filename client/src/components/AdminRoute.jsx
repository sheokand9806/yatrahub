import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Only admins may open admin pages (the API enforces this too)
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <main className="main"><div className="loading-box">Loading…</div></main>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/me" replace />;
  return children;
}
