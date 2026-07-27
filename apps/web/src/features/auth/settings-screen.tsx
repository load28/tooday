import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useRouteContext, useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { css } from 'styled-system/css';
import { useT } from '@/shared/i18n';
import { AppBar, BottomSheet, Button, Screen, Stack, Text } from '@/shared/ui';

const pageCls = css({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100%',
  paddingX: 'pageX',
  paddingTop: '2xl',
  paddingBottom: '4xl',
  gap: '2xl',
});

// 파괴적 로그아웃은 하단(엄지 도달)에 둔다 — 계정 정보는 위, 버튼은 뷰포트 바닥으로 민다.
const logoutSlotCls = css({ marginTop: 'auto' });

const sheetActionsCls = css({ paddingTop: 'lg' });

export function SettingsScreen() {
  const navigate = useNavigate();
  const router = useRouter();
  const { trpc, queryClient } = useRouteContext({ from: '__root__' });
  const t = useT();

  const { data } = useSuspenseQuery(trpc.user.me.queryOptions());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const logout = useMutation(
    trpc.auth.logout.mutationOptions({
      onSuccess: async () => {
        setConfirmOpen(false);
        // 웹뷰는 새로고침으로 리셋되지 않는다 — 이전 유저 데이터가 남지 않게 전 캐시를 비운다.
        queryClient.clear();
        await navigate({ to: '/login' });
      },
    }),
  );

  const closeConfirm = () => {
    if (logout.isPending) return; // 진행 중엔 시트를 닫지 않는다
    logout.reset(); // 재오픈 시 이전 에러가 남지 않게 리셋
    setConfirmOpen(false);
  };

  return (
    <>
      <Screen
        topBar={
          <AppBar>
            <AppBar.Leading>
              <Button size="icon" shape="square" aria-label={t.common.back} onClick={() => router.history.back()}>
                <ChevronLeft size={22} />
              </Button>
            </AppBar.Leading>
            <AppBar.Title>{t.settings.title}</AppBar.Title>
          </AppBar>
        }
      >
        <div className={pageCls}>
          <Stack gap="xs">
            <Text variant="label" tone="tertiary">
              {t.settings.account.label}
            </Text>
            <Text variant="body">{data.user?.email}</Text>
          </Stack>
          <div className={logoutSlotCls}>
            <Button tone="danger" size="xl" fullWidth onClick={() => setConfirmOpen(true)}>
              {t.settings.logout.action}
            </Button>
          </div>
        </div>
      </Screen>

      <BottomSheet open={confirmOpen} onClose={closeConfirm} ariaLabel={t.settings.logout.confirmTitle}>
        <BottomSheet.Header>
          <BottomSheet.Title>{t.settings.logout.confirmTitle}</BottomSheet.Title>
          <BottomSheet.Description>{t.settings.logout.confirmDescription}</BottomSheet.Description>
        </BottomSheet.Header>
        <Stack gap="md" className={sheetActionsCls}>
          {logout.isError ? (
            <Text variant="bodySm" tone="danger" align="center">
              {t.settings.logout.error}
            </Text>
          ) : null}
          <Button tone="danger" size="xl" fullWidth loading={logout.isPending} onClick={() => logout.mutate()}>
            {t.settings.logout.confirm}
          </Button>
          <Button tone="ghost" size="xl" fullWidth disabled={logout.isPending} onClick={closeConfirm}>
            {t.settings.logout.cancel}
          </Button>
        </Stack>
      </BottomSheet>
    </>
  );
}
