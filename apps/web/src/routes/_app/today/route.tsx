import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/today')({
  component: TodayPage,
});

function TodayPage() {
  return <>Today</>;
}
