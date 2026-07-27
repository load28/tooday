import { createFileRoute } from '@tanstack/react-router';
import { SettingsScreen } from '@/features/auth/settings-screen';

// 탭바 없는 풀스크린 — `_tabs` 밖에 두어 push 화면으로 뜨고 AppBar.Leading back으로 돌아간다.
export const Route = createFileRoute('/_app/settings')({ component: SettingsScreen });
