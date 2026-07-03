import { createFileRoute, redirect } from '@tanstack/react-router';
import { fetchSessionUser } from '@/app/trpc.ts';
import type { FileRouteTypes } from '@/routeTree.gen.ts';

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const user = await fetchSessionUser(context);
    const segment = (user ? '/today' : '/login') satisfies FileRouteTypes['to'];
    throw redirect({ to: segment });
  },
});
