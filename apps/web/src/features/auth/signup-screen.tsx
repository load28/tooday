import { useMutation } from '@tanstack/react-query';
import { Link, useRouteContext, useRouter } from '@tanstack/react-router';
import { signupRequestSchema } from '@tooday/shared';
import { type ChangeEvent, type FormEvent, useState } from 'react';
import { css } from 'styled-system/css';
import { Button, HStack, Screen, Stack, Text, TextField } from '@/shared/ui';

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

const loginLinkCls = css({
  textStyle: 'bodyStrong',
  color: 'textBrand',
  textDecoration: 'none',
  borderRadius: 'xs',
  _focusVisible: { outline: 'none', boxShadow: 'focus' },
});

type FieldErrors = Partial<Record<'name' | 'email' | 'password', string>>;

export function SignupScreen() {
  const router = useRouter();
  const { trpc, queryClient } = useRouteContext({ from: '__root__' });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const signup = useMutation(
    trpc.auth.signup.mutationOptions({
      onSuccess: async ({ user }) => {
        queryClient.setQueryData(trpc.user.me.queryKey(), { user });
        await router.navigate({ to: '/today' });
      },
    }),
  );

  const emailTaken = signup.isError && signup.error.data?.code === 'CONFLICT';

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && password.length > 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || signup.isPending) return;

    const parsed = signupRequestSchema.safeParse({ name, email: email.trim(), password });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === 'name' || field === 'email' || field === 'password') && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    signup.mutate(parsed.data);
  };

  // 입력을 다시 시작하면 해당 필드의 검증 에러와 이전 가입 실패 에러를 지운다
  const clearFieldError = (field: keyof FieldErrors) => {
    if (signup.isError) signup.reset();
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    clearFieldError('name');
    setName(event.currentTarget.value);
  };

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    clearFieldError('email');
    setEmail(event.currentTarget.value);
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    clearFieldError('password');
    setPassword(event.currentTarget.value);
  };

  const emailError = fieldErrors.email ?? (emailTaken ? signup.error.message : undefined);
  const passwordError = fieldErrors.password ?? (signup.isError && !emailTaken ? signup.error.message : undefined);

  return (
    <Screen>
      {/* noValidate: 이메일 형식 검증을 브라우저 네이티브 대신 공유 스키마(zod)로 일원화 */}
      <form className={formCls} onSubmit={handleSubmit} noValidate>
        <Stack gap="lg">
          <Text variant="label" tone="brand">
            TooDay
          </Text>
          <Text as="h1" variant="display">
            회원가입
          </Text>
          <Text variant="body" tone="tertiary">
            이름, 이메일, 비밀번호를 입력해 주세요.
          </Text>
        </Stack>

        <Stack gap="2xl">
          <TextField
            label="이름"
            size="xl"
            type="text"
            name="name"
            autoComplete="name"
            placeholder="이름"
            value={name}
            onChange={handleNameChange}
            error={fieldErrors.name}
          />
          <TextField
            label="이메일"
            size="xl"
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={handleEmailChange}
            error={emailError}
          />
          <TextField
            label="비밀번호"
            size="xl"
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="8자 이상"
            value={password}
            onChange={handlePasswordChange}
            error={passwordError}
          />
        </Stack>

        <Stack gap="2xl">
          <Button type="submit" tone="brand" size="xl" className={submitCls} disabled={!canSubmit} loading={signup.isPending}>
            가입하기
          </Button>
          <HStack gap="md" justify="center">
            <Text variant="bodySm" tone="tertiary">
              이미 계정이 있나요?
            </Text>
            <Link to="/login" className={loginLinkCls}>
              로그인
            </Link>
          </HStack>
        </Stack>
      </form>
    </Screen>
  );
}
