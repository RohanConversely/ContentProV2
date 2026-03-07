import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { ClientKycData } from "@/components/ClientKycStep";

export type ProcessStage = "queued" | "kyc" | "images" | "video" | "completed" | "failed";

export interface WorkflowProcess {
  id: string;
  clientName: string;
  kycData: ClientKycData;
  genre: string | null;
  theme: string | null;
  outputType: string | null;
  stage: ProcessStage;
  progress: number; // 0-100
  imagesGenerated: number;
  totalImages: number;
  videoReady: boolean;
  createdAt: Date;
  completedAt: Date | null;
}

interface ProcessContextType {
  processes: WorkflowProcess[];
  addProcess: (p: Omit<WorkflowProcess, "id" | "createdAt" | "completedAt">) => string;
  updateProcess: (id: string, updates: Partial<WorkflowProcess>) => void;
  removeProcess: (id: string) => void;
}

const ProcessContext = createContext<ProcessContextType | null>(null);

// Seed demo data
const demoProcesses: WorkflowProcess[] = [
  {
    id: "proc-1",
    clientName: "Luxe Watches Co.",
    kycData: { companyName: "Luxe Watches Co.", website: "luxewatches.com", industry: "fashion", instagram: "", facebook: "", linkedin: "", twitter: "", productCategory: "Premium Watches" },
    genre: "luxury",
    theme: "dark",
    outputType: "Product Images",
    stage: "completed",
    progress: 100,
    imagesGenerated: 7,
    totalImages: 7,
    videoReady: true,
    createdAt: new Date(Date.now() - 3600000 * 2),
    completedAt: new Date(Date.now() - 3600000),
  },
  {
    id: "proc-2",
    clientName: "GreenLeaf Skincare",
    kycData: { companyName: "GreenLeaf Skincare", website: "greenleaf.co", industry: "health", instagram: "", facebook: "", linkedin: "", twitter: "", productCategory: "Organic Skincare" },
    genre: "lifestyle",
    theme: "pastel",
    outputType: "A+ Content",
    stage: "video",
    progress: 78,
    imagesGenerated: 7,
    totalImages: 7,
    videoReady: false,
    createdAt: new Date(Date.now() - 3600000),
    completedAt: null,
  },
  {
    id: "proc-3",
    clientName: "TechNova Gadgets",
    kycData: { companyName: "TechNova Gadgets", website: "technova.io", industry: "technology", instagram: "", facebook: "", linkedin: "", twitter: "", productCategory: "Smart Devices" },
    genre: "tech",
    theme: "cool",
    outputType: "Product Images",
    stage: "images",
    progress: 42,
    imagesGenerated: 3,
    totalImages: 7,
    videoReady: false,
    createdAt: new Date(Date.now() - 1800000),
    completedAt: null,
  },
  {
    id: "proc-4",
    clientName: "FitPro Equipment",
    kycData: { companyName: "FitPro Equipment", website: "fitpro.in", industry: "health", instagram: "", facebook: "", linkedin: "", twitter: "", productCategory: "Gym Equipment" },
    genre: "studio",
    theme: "neutral",
    outputType: "Social Media",
    stage: "queued",
    progress: 0,
    imagesGenerated: 0,
    totalImages: 7,
    videoReady: false,
    createdAt: new Date(Date.now() - 600000),
    completedAt: null,
  },
  {
    id: "proc-5",
    clientName: "Aura Fragrances",
    kycData: { companyName: "Aura Fragrances", website: "aurafragrance.com", industry: "fashion", instagram: "", facebook: "", linkedin: "", twitter: "", productCategory: "Perfumes" },
    genre: "luxury",
    theme: "warm",
    outputType: "A+ Content",
    stage: "images",
    progress: 60,
    imagesGenerated: 5,
    totalImages: 7,
    videoReady: false,
    createdAt: new Date(Date.now() - 2400000),
    completedAt: null,
  },
];

export const ProcessProvider = ({ children }: { children: ReactNode }) => {
  const [processes, setProcesses] = useState<WorkflowProcess[]>(demoProcesses);

  const addProcess = useCallback((p: Omit<WorkflowProcess, "id" | "createdAt" | "completedAt">) => {
    const id = `proc-${Date.now()}`;
    setProcesses((prev) => [{ ...p, id, createdAt: new Date(), completedAt: null }, ...prev]);
    return id;
  }, []);

  const updateProcess = useCallback((id: string, updates: Partial<WorkflowProcess>) => {
    setProcesses((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const removeProcess = useCallback((id: string) => {
    setProcesses((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <ProcessContext.Provider value={{ processes, addProcess, updateProcess, removeProcess }}>
      {children}
    </ProcessContext.Provider>
  );
};

export const useProcesses = () => {
  const ctx = useContext(ProcessContext);
  if (!ctx) throw new Error("useProcesses must be used within ProcessProvider");
  return ctx;
};
