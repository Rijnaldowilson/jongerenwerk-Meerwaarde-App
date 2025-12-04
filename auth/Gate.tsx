// src/auth/Gate.tsx  (of auth/Gate.tsx als je hem daar gebruikt)
import React from "react";
import { AppRole, canSeeTab } from "../auth/roles"; // pas pad aan naar waar roles.ts staat

export type TabKey = "index" | "workspace" | "kennisHub" | "profiel";

type GateProps = {
  role: AppRole | null | undefined;
  allow?: Partial<Record<TabKey | "manager" | "admin" | "worker", boolean>>;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

/**
 * Gebruik:
 * <Gate role={role} allow={{ kennisHub: true }}>
 *   ...alleen voor wie kennisHub mag zien
 * </Gate>
 *
 * Special keys:
 * - allow.manager
 * - allow.admin
 * - allow.worker (jongerenwerker)
 */
export function Gate({ role, allow, children, fallback = null }: GateProps) {
  if (!role) return <>{fallback}</>;
  if (!allow) return <>{children}</>;

  // special keys
  if (allow.admin && role === "admin") return <>{children}</>;
  if (allow.manager && (role === "manager" || role === "admin")) return <>{children}</>;
  if (allow.worker && (role === "jongerenwerker" || role === "admin")) return <>{children}</>;

  // tab keys
  const ok = Object.entries(allow).some(([k, v]) => {
    if (!v) return false;
    if (k === "manager" || k === "admin" || k === "worker") return false;
    return canSeeTab(role, k); // ✅ k is hier tabName
  });

  return ok ? <>{children}</> : <>{fallback}</>;
}
