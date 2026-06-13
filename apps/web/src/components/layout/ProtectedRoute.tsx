import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

type Role = 'family' | 'caregiver' | 'admin' | 'support_admin' | 'professional' | 'facility';

interface Props {
  children: React.ReactNode;
  /** A single role or a list of allowed roles. */
  requiredRole?: Role | Role[];
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-9 h-9 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const allowed = requiredRole ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole]) : null;
  if (allowed && (!user?.role || !allowed.includes(user.role as Role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
