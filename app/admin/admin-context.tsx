"use client";

import { createContext, useContext } from "react";

export type AdminRole = "admin" | "moderateur";

interface AdminContextType {
  token: string | null;
  role: AdminRole;
  username: string | null;
  setToken: (t: string | null) => void;
  setRole: (r: AdminRole) => void;
  setUsername: (u: string | null) => void;
}

export const AdminContext = createContext<AdminContextType>({
  token: null,
  role: "moderateur",
  username: null,
  setToken: () => {},
  setRole: () => {},
  setUsername: () => {},
});

export const useAdmin = () => useContext(AdminContext);
