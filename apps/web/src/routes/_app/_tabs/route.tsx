import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AppTabBar } from '@/routes/_app/_tabs/-app-tab-bar';
import { Screen } from '@/shared/ui';

/**
 * 하단 탭 내비를 갖는 화면들의 셸. 뷰포트와 푸터(탭바)를 이 레이아웃이 소유해
 * 탭 전환에도 탭바 DOM이 그대로 살아남는다 — Outlet은 헤더·본문만 교체한다.
 * 탭바가 화면 안에 있으면 전환마다 새로 마운트돼 활성 전환 transition이 초기화된다.
 *
 * pathless(`_` 접두사)라 URL에는 나타나지 않는다: `/today`, `/projects`,
 * `/projects/$projectId`. 탭바가 없는 화면(`/tasks/*`)은 `_app` 직속에 둔다.
 *
 * 스크롤 컨테이너(`Screen.Content`)는 각 화면이 소유한다 — 여기로 올리면 탭 간
 * 스크롤 위치가 공유된다.
 */
export const Route = createFileRoute('/_app/_tabs')({
  component: TabsLayout,
});

function TabsLayout() {
  return (
    <Screen.Root>
      <Outlet />
      <Screen.Footer>
        <AppTabBar />
      </Screen.Footer>
    </Screen.Root>
  );
}
