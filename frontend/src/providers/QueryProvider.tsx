'use client';

import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { SessionExpiredError } from '@/lib/api';

export default function QueryProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (error instanceof SessionExpiredError) {
              router.replace('/login');
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
