import { createFileRoute } from '@tanstack/react-router';
import { TodayScreen } from '@/features/today/today-screen';

export const Route = createFileRoute('/_app/today')({
  // 기준 시각을 loader로 고정해 SSR과 하이드레이션이 같은 날짜를 그리게 한다
  loader: () => ({ now: Date.now() }),
  component: TodayRoute,
});

function TodayRoute() {
  const { now } = Route.useLoaderData();
  return <TodayScreen now={now} />;
}
