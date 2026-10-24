"use client";

import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { wagmiConfig } from "@/lib/wagmi";
import { LanguageProvider } from "@/lib/i18n";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 4_000, refetchOnWindowFocus: true, retry: 2 } } }),
  );
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <MotionConfig reducedMotion="user">{children}</MotionConfig>
        </LanguageProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
