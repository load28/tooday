import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_public')({
  beforeLoad: async ({ context }) => {
    const user = await context.auth.resolveUser();
    if (user) {
      throw redirect({ to: '/' });
    }
  },
  component: Outlet,
});
