import { createFileRoute, redirect } from '@tanstack/react-router';
import type { FileRouteTypes } from '@/routeTree.gen.ts';

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    const segment = (context.auth ? '/today' : '/login') satisfies FileRouteTypes['to'];
    throw redirect({ to: segment });
  },
});
