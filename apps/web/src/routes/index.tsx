import { createFileRoute, redirect } from '@tanstack/react-router';
import type { FileRouteTypes } from '@/routeTree.gen.ts';

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const user = await context.auth.resolveUser();
    const segment = (user ? '/today' : '/login') satisfies FileRouteTypes['to'];
    throw redirect({ to: segment });
  },
});
