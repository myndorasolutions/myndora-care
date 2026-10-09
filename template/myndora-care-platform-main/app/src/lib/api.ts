// Vanilla tRPC client for use outside React components (auth store, sync engine).
// Components may also use this for one-shot mutations; hooks come from @/providers/trpc.
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '../../api/router';

export const api = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, { ...(init ?? {}), credentials: 'include' });
      },
    }),
  ],
});
