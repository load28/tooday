import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_public/signup')({
  component: SignupPage,
});

function SignupPage() {
  return <>Signup</>;
}
