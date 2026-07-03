import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { fetchSessionUser } from '@/app/trpc.ts';

export const Route = createFileRoute('/_public')({
  beforeLoad: async ({ context }) => {
    const user = await fetchSessionUser(context);
    if (user) {
      throw redirect({ to: '/' });
    }
  },
  component: Outlet,
});
