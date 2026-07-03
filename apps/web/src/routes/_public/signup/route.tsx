import { createFileRoute } from '@tanstack/react-router';
import { SignupScreen } from '@/features/auth/signup-screen';

export const Route = createFileRoute('/_public/signup')({
  component: SignupScreen,
});
