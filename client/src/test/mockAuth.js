// ============================================================
// File:        mockAuth.js
// Path:        client/src/test/mockAuth.js
// Project:     RaceArena — TEST-AIDS-1
//
// A SIGNED-IN ADMIN, WITHOUT THE SERVER. Test-only; nothing under `src/modules` or `src/screens`
// imports it. The same shape as `mockServerTracks.js`: a test file hands it to `vi.mock`, which is
// hoisted, so the factory imports this module rather than closing over a variable.
//
//   vi.mock('../../contexts/AuthContext.jsx', async () =>
//     (await import('../../test/mockAuth.js')).authMock('admin')
//   );
//
// WHY IT EXISTS: TEST-AIDS-1 made the setup screen read the SERVER's role (`useAuth`) — the seed and
// identifier tools are admin-only. The setup-screen tests rendered it with no AuthProvider at all,
// which `useAuth` refuses. They describe the screen an admin sees, so they get an admin.
// ============================================================

/**
 * @param {'admin' | 'operator'} role
 * @returns {{ useAuth: () => object, AuthProvider: ({children}) => any }}
 */
export function authMock(role = 'admin') {
  const value = {
    user: { username: role, role, team: 'T' },
    loading: false,
    authState: 'online',
    logout: async () => {},
    login: async () => {},
    setup: async () => {},
    changePassword: async () => {},
  };
  return {
    useAuth: () => value,
    AuthProvider: ({ children }) => children,
  };
}
