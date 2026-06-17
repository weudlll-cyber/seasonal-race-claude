// ============================================================
// File:        ProtectedRoute.jsx
// Path:        client/src/components/ProtectedRoute.jsx
// Project:     RaceArena
// Created:     2026-06-14
// Description: Deny-by-default route guard. Waits for the /me probe to finish
//              (loading) before deciding, so no flash-to-login on reload.
//
//              authState decision matrix:
//                'online'       → full auth; requiredRole admin-check applies
//                'offline-hint' → rendered ONLY if allowOffline=true AND no requiredRole
//                'anonymous'    → always /login
//
//              allowOffline NEVER grants privileged access — requiredRole routes
//              are always online-only.
// ============================================================

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function ProtectedRoute({ children, requiredRole, allowOffline }) {
  const { user, loading, authState } = useAuth();

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

  if (authState === 'online') {
    if (requiredRole === 'admin' && user.role !== 'admin') return <Navigate to="/setup" replace />;
    return children;
  }

  if (authState === 'offline-hint') {
    if (allowOffline && !requiredRole) return children;
    return <Navigate to="/login" replace />;
  }

  // anonymous
  return <Navigate to="/login" replace />;
}
