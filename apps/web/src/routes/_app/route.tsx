import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { fetchSessionUser } from '@/trpc.ts';

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context }) => {
    const user = await fetchSessionUser(context);
    if (!user) {
      throw redirect({ to: '/login' });
    }
    return { user };
  },
  component: Outlet,
});
