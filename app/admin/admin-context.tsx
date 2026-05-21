"use client";

import { createContext, useContext } from "react";

interface AdminContextType {
  token: string | null;
  setToken: (t: string | null) => void;
}

export const AdminContext = createContext<AdminContextType>({ token: null, setToken: () => {} });
export const useAdmin = () => useContext(AdminContext);
