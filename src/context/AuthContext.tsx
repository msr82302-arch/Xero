import {createContext, useCallback, useContext, useEffect, useState, type ReactNode} from 'react';
import {
  apiClient,
  ensureCsrfToken,
  setAuthToken,
  setUnauthorizedHandler,
} from '@/src/lib/api';
import type {AuthUser} from '@/src/types/xbms';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  setupRequired: boolean;
  staffSetupRequired: boolean;
  localResetAllowed: boolean;
  backendOffline: boolean;
  login: (email: string, passcode: string) => Promise<void>;
  setupAdmin: (email: string, name: string, passcode: string) => Promise<void>;
  loginStaff: (email: string, passcode: string) => Promise<void>;
  setupStaff: (email: string, name: string, passcode: string) => Promise<void>;
  signin: (email: string, passcode: string) => Promise<AuthUser>;
  applyPasswordRotation: (token: string, updatedUser: AuthUser) => void;
  resetPortalCredentials: (overridePin?: string) => Promise<string>;
  logout: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [staffSetupRequired, setStaffSetupRequired] = useState(false);
  const [localResetAllowed, setLocalResetAllowed] = useState(false);
  const [backendOffline, setBackendOffline] = useState(false);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    try {
      await ensureCsrfToken();
      const {data} = await apiClient.get<{
        setupRequired?: boolean;
        staffSetupRequired?: boolean;
        localResetAllowed?: boolean;
      }>('/auth/status/');
      if (
        typeof data?.setupRequired !== 'boolean' ||
        typeof data?.staffSetupRequired !== 'boolean'
      ) {
        setBackendOffline(true);
      } else {
        setBackendOffline(false);
        setSetupRequired(data.setupRequired);
        setStaffSetupRequired(data.staffSetupRequired);
        setLocalResetAllowed(Boolean(data.localResetAllowed));
        try {
          const meRes = await apiClient.get<{user?: AuthUser}>('/auth/me/');
          if (meRes.data?.user) {
            setUser(meRes.data.user);
          }
        } catch {
          // No active session cookie yet
        }
      }
    } catch {
      setBackendOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthToken(null);
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const setupAdmin = useCallback(async (email: string, name: string, passcode: string) => {
    await ensureCsrfToken();
    const {data} = await apiClient.post<{token: string; user: AuthUser}>('/auth/setup/', {
      email,
      name,
      passcode,
    });
    setBackendOffline(false);
    setAuthToken(data.token);
    setUser(data.user);
    setSetupRequired(false);
  }, []);

  const login = useCallback(async (email: string, passcode: string) => {
    await ensureCsrfToken();
    const {data} = await apiClient.post<{token: string; user: AuthUser}>('/auth/login/', {
      email,
      passcode,
    });
    setBackendOffline(false);
    setAuthToken(data.token);
    setUser(data.user);
    setSetupRequired(false);
  }, []);

  const setupStaff = useCallback(async (email: string, name: string, passcode: string) => {
    await ensureCsrfToken();
    const {data} = await apiClient.post<{token: string; user: AuthUser}>('/auth/staff/setup/', {
      email,
      name,
      passcode,
    });
    setBackendOffline(false);
    setAuthToken(data.token);
    setUser(data.user);
    setStaffSetupRequired(false);
  }, []);

  const loginStaff = useCallback(async (email: string, passcode: string) => {
    await ensureCsrfToken();
    const {data} = await apiClient.post<{token: string; user: AuthUser}>('/auth/staff/login/', {
      email,
      passcode,
    });
    setBackendOffline(false);
    setAuthToken(data.token);
    setUser(data.user);
    setStaffSetupRequired(false);
  }, []);

  const signin = useCallback(async (email: string, passcode: string): Promise<AuthUser> => {
    await ensureCsrfToken();
    const {data} = await apiClient.post<{token: string; user: AuthUser}>('/auth/signin/', {
      email,
      passcode,
    });
    setBackendOffline(false);
    setAuthToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const applyPasswordRotation = useCallback((token: string, updatedUser: AuthUser) => {
    setAuthToken(token);
    setUser(updatedUser);
  }, []);

  const resetPortalCredentials = useCallback(async (overridePin?: string): Promise<string> => {
    await ensureCsrfToken();
    const {data} = await apiClient.post<{
      ok: boolean;
      setupRequired: boolean;
      staffSetupRequired: boolean;
      message: string;
    }>('/auth/reset-portal/', overridePin ? {overridePin} : {});
    setAuthToken(null);
    setUser(null);
    setSetupRequired(data.setupRequired);
    setStaffSetupRequired(data.staffSetupRequired);
    return data.message;
  }, []);

  const logout = useCallback(async () => {
    try {
      await ensureCsrfToken();
      await apiClient.post('/auth/logout/');
    } catch {
      // Ignore network errors during logout cleanup
    } finally {
      setAuthToken(null);
      setUser(null);
      try {
        const {data} = await apiClient.get<{
          setupRequired?: boolean;
          staffSetupRequired?: boolean;
          localResetAllowed?: boolean;
        }>('/auth/status/');
        if (
          typeof data?.setupRequired === 'boolean' &&
          typeof data?.staffSetupRequired === 'boolean'
        ) {
          setBackendOffline(false);
          setSetupRequired(data.setupRequired);
          setStaffSetupRequired(data.staffSetupRequired);
          setLocalResetAllowed(Boolean(data.localResetAllowed));
        }
      } catch {
        // Keep current status
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setupRequired,
        staffSetupRequired,
        localResetAllowed,
        backendOffline,
        login,
        setupAdmin,
        loginStaff,
        setupStaff,
        signin,
        applyPasswordRotation,
        resetPortalCredentials,
        logout,
        refreshStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return ctx;
}
