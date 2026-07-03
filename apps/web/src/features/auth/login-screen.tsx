import { useMutation } from '@tanstack/react-query';
import { Link, useRouteContext, useRouter } from '@tanstack/react-router';
import { type ChangeEvent, type FormEvent, useState } from 'react';
import { css } from 'styled-system/css';
import { HStack, Pressable, Screen, Stack, Text, TextField } from '@/shared/ui';

const formCls = css({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  maxWidth: '420px',
  minHeight: '100%',
  marginX: 'auto',
  paddingX: 'pageX',
  paddingTop: 'clamp(48px, 16dvh, 140px)',
  paddingBottom: '4xl',
  gap: '4xl',
});

const submitCls = css({ width: '100%' });

const signupLinkCls = css({
  textStyle: 'bodyStrong',
  color: 'textBrand',
  textDecoration: 'none',
  borderRadius: 'xs',
  _focusVisible: { outline: 'none', boxShadow: 'focus' },
});

export function LoginScreen() {
  const router = useRouter();
  const { trpc, queryClient } = useRouteContext({ from: '__root__' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation(
    trpc.auth.login.mutationOptions({
      onSuccess: async ({ user }) => {
        queryClient.setQueryData(trpc.user.me.queryKey(), { user });
        await router.navigate({ to: '/today' });
      },
    }),
  );

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || login.isPending) return;
    login.mutate({ email: email.trim(), password });
  };

  // 입력을 다시 시작하면 이전 로그인 실패 에러를 지운다
  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (login.isError) login.reset();
    setEmail(event.currentTarget.value);
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (login.isError) login.reset();
    setPassword(event.currentTarget.value);
  };

  return (
    <Screen>
      <form className={formCls} onSubmit={handleSubmit}>
        <Stack gap="lg">
          <Text variant="label" tone="brand">
            TooDay
          </Text>
          <Text as="h1" variant="display">
            로그인
          </Text>
          <Text variant="body" tone="tertiary">
            이메일과 비밀번호를 입력해 주세요.
          </Text>
        </Stack>

        <Stack gap="2xl">
          <TextField
            label="이메일"
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={handleEmailChange}
          />
          <TextField
            label="비밀번호"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="비밀번호"
            value={password}
            onChange={handlePasswordChange}
            error={login.isError ? login.error.message : undefined}
          />
        </Stack>

        <Stack gap="2xl">
          <Pressable type="submit" tone="brand" size="xl" className={submitCls} disabled={!canSubmit || login.isPending}>
            {login.isPending ? '로그인 중…' : '로그인'}
          </Pressable>
          <HStack gap="md" justify="center">
            <Text variant="bodySm" tone="tertiary">
              아직 계정이 없나요?
            </Text>
            <Link to="/signup" className={signupLinkCls}>
              가입하기
            </Link>
          </HStack>
        </Stack>
      </form>
    </Screen>
  );
}
