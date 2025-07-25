"use client";

import { useState, useContext, createContext, useEffect } from "react";
import axios from "axios";

// Types
interface User {
  id: number;
  email: string;
  is_premium: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

// Auth Context
const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const savedToken = sessionStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      fetchUserProfile(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Fetch user profile
  const fetchUserProfile = async (authToken: string) => {
    try {
      const response = await apiClient.get("/user/profile", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      setUser(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "API Error:",
          error.response?.status,
          error.response?.data
        );
        if (error.response?.status === 401) {
          console.log("Token expired or invalid");
        }
      } else {
        console.error("Error fetching user profile:", error);
      }
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  // Login

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiClient.post("/login", {
        email,
        password,
      });

      const data = response.data;
      setToken(data.access_token);
      sessionStorage.setItem("token", data.access_token);
      await fetchUserProfile(data.access_token);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Login error:",
          error.response?.status,
          error.response?.data
        );
        if (error.response?.status === 401) {
          console.log("Invalid credentials");
        }
      } else {
        console.error("Login error:", error);
      }
      return false;
    }
  };

  // Register a new user
  const register = async (
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      const response = await apiClient.post("/register", {
        email,
        password,
      });

      const data = response.data;
      setToken(data.access_token);
      sessionStorage.setItem("token", data.access_token);
      await fetchUserProfile(data.access_token);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Registration error:",
          error.response?.status,
          error.response?.data
        );
        if (error.response?.status === 400) {
          console.log("Email already exists or validation error");
        }
      } else {
        console.error("Registration error:", error);
      }
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, register, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}
