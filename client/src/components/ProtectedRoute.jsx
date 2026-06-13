// ============================================================
// File:        ProtectedRoute.jsx
// Path:        client/src/components/ProtectedRoute.jsx
// Project:     RaceArena
// Created:     2026-06-14
// Description: Deny-by-default route guard. Waits for the /me probe to finish
//              (loading) before deciding, so no flash-to-login on reload.
// ============================================================

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-bg)',
          color: 'var(--color-muted)',
        }}
      >
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole === 'admin' && user.role !== 'admin') return <Navigate to="/setup" replace />;
  return children;
}
