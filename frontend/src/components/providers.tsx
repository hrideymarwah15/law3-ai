"use client";

import * as React from "react";
import { QueryProvider } from "@/lib/api/query-client";
import { ToastContextProvider } from "@/components/ui/toast";

// ============================================
// Root Providers
// ============================================

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <ToastContextProvider>
        {children}
      </ToastContextProvider>
    </QueryProvider>
  );
}
