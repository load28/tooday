import { createFileRoute, redirect } from '@tanstack/react-router';
import type { FileRouteTypes } from '@/routeTree.gen.ts';
import { fetchSessionUser } from '@/trpc.ts';

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const user = await fetchSessionUser(context);
    const segment = (user ? '/today' : '/login') satisfies FileRouteTypes['to'];
    throw redirect({ to: segment });
  },
});
