import { createFileRoute } from '@tanstack/react-router';
import { TodayScreen } from '@/features/today/today-screen';
import { weekRange } from '@/features/today/week';
import { AppTabBar } from '@/routes/-app-tab-bar';

export const Route = createFileRoute('/_app/today')({
  // 기준 시각을 loader로 고정해 SSR과 하이드레이션이 같은 날짜를 그리게 한다
  loader: async ({ context }) => {
    const now = Date.now();
    await context.queryClient.ensureQueryData(context.trpc.task.range.queryOptions(weekRange(new Date(now))));
    return { now };
  },
  component: TodayRoute,
});

function TodayRoute() {
  const { now } = Route.useLoaderData();
  return <TodayScreen now={now} tabBar={<AppTabBar active="today" />} />;
}
