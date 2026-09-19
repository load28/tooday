import * as stylex from '@stylexjs/stylex';
import { useLiveSuspenseQuery } from '@tanstack/react-db';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useAuthCommands, useAuthServerQueries } from '@/entities/auth/context';
import { styles } from '@/features/auth/settings-screen.styles';
import { useCommandExecutionStore } from '@/shared/command-execution-store';
import { useT } from '@/shared/i18n';
import { AppBar, BottomSheet, Button, Screen, Stack, Text } from '@/shared/ui';

export function SettingsScreen() {
  const navigate = useNavigate();
  const router = useRouter();
  const auth = useAuthServerQueries();
  const commands = useAuthCommands();
  const t = useT();

  const { data: sessions } = useLiveSuspenseQuery(auth.sessionView());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const logout = useCommandExecutionStore();
  const confirmLogout = () =>
    logout.dispatch(async () => {
      await commands.logout();
      setConfirmOpen(false);
      await navigate({ to: '/login' });
    });

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
        <div {...stylex.props(styles.page)}>
          <Stack gap="xs">
            <Text variant="label" tone="tertiary">
              {t.settings.account.label}
            </Text>
            <Text variant="body">{sessions[0]?.user?.email}</Text>
          </Stack>
          <div {...stylex.props(styles.logoutSlot)}>
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
        <Stack gap="md" sx={styles.sheetActions}>
          {logout.isError ? (
            <Text variant="bodySm" tone="danger" align="center">
              {t.settings.logout.error}
            </Text>
          ) : null}
          <Button tone="danger" size="xl" fullWidth loading={logout.isPending} onClick={confirmLogout}>
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
