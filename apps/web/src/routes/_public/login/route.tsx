import { createFileRoute } from '@tanstack/react-router';
import { LoginScreen } from '@/features/auth/login-screen';

export const Route = createFileRoute('/_public/login')({ component: LoginScreen });
