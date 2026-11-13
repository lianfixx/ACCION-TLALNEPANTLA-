"use client";
import { createContext, useContext, type ReactNode } from "react";
import { defaultCommissions, defaultProcessSteps, type CommissionContent, type ProcessStep } from "@/lib/site-content-defaults";

type Catalog = { commissions: CommissionContent[]; steps: ProcessStep[] };
const CatalogContext = createContext<Catalog>({ commissions: defaultCommissions, steps: defaultProcessSteps });

/** Edited commission names, order and process steps, read on the server and shared with client views. */
export function CommissionCatalogProvider({ commissions, steps, children }: Catalog & { children: ReactNode }) {
  return <CatalogContext.Provider value={{ commissions, steps }}>{children}</CatalogContext.Provider>;
}

export function useCommissionCatalog() {
  const catalog = useContext(CatalogContext);
  return { ...catalog, name: (id: string) => catalog.commissions.find(item => item.id === id)?.name ?? id };
}
