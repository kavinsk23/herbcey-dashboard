// AuthContext.tsx - Create an authentication context
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  idToken: string | null;
  accessToken: string | null;
  userName: string | null;
  login: (idToken: string, accessToken: string, userName: string) => void;
  logout: () => void;
  checkAuthStatus: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Check if tokens are valid (simple expiry check)
  const isTokenValid = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      return false;
    }
  };

  const checkAuthStatus = (): boolean => {
    const storedIdToken = localStorage.getItem("google_id_token");
    const storedAccessToken = localStorage.getItem("google_access_token");

    if (storedIdToken && storedAccessToken) {
      // Check if ID token is still valid
      if (isTokenValid(storedIdToken)) {
        try {
          const payload = JSON.parse(atob(storedIdToken.split(".")[1]));
          setIdToken(storedIdToken);
          setAccessToken(storedAccessToken);
          setUserName(payload.name);
          setIsAuthenticated(true);
          return true;
        } catch (error) {
          console.error("Failed to decode stored token", error);
          logout();
          return false;
        }
      } else {
        // Token expired, logout
        logout();
        return false;
      }
    }
    return false;
  };

  const login = (
    newIdToken: string,
    newAccessToken: string,
    newUserName: string
  ) => {
    localStorage.setItem("google_id_token", newIdToken);
    localStorage.setItem("google_access_token", newAccessToken);
    setIdToken(newIdToken);
    setAccessToken(newAccessToken);
    setUserName(newUserName);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("google_id_token");
    localStorage.removeItem("google_access_token");
    setIdToken(null);
    setAccessToken(null);
    setUserName(null);
    setIsAuthenticated(false);
  };

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Periodically check token validity (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isAuthenticated && idToken) {
        if (!isTokenValid(idToken)) {
          console.log("Token expired, logging out...");
          logout();
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, idToken]);

  const value = {
    isAuthenticated,
    idToken,
    accessToken,
    userName,
    login,
    logout,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
