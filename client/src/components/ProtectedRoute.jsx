import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading)
    return (
      <main className="main">
        <div className="loading-box">Loading…</div>
      </main>
    );
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
