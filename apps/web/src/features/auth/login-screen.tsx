import { revalidateLogic, useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouteContext, useRouter } from '@tanstack/react-router';
import { type LoginRequest, loginRequestSchema } from '@tooday/shared';
import { css } from 'styled-system/css';
import { type FormMessages, fieldErrorMessage, hasTrpcErrorCode, TRPC_ERROR_CODES } from '@/shared/form';
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

const messages = {
  email: '이메일을 입력해 주세요.',
  password: '비밀번호를 입력해 주세요.',
} satisfies FormMessages<LoginRequest>;

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

  const login = useMutation(
    trpc.auth.login.mutationOptions({
      onSuccess: async ({ user }) => {
        queryClient.setQueryData(trpc.user.me.queryKey(), { user });
        await router.navigate({ to: '/today' });
      },
    }),
  );

  const form = useForm({
    defaultValues: { email: '', password: '' },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: loginRequestSchema,
      onSubmitAsync: async ({ value }) => {
        try {
          await login.mutateAsync(value);
          return undefined;
        } catch (error) {
          if (hasTrpcErrorCode(error, TRPC_ERROR_CODES.unauthorized)) {
            return { fields: { password: '이메일 또는 비밀번호가 올바르지 않습니다.' } };
          }
          return { form: error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.' };
        }
      },
    },
  });

  return (
    <Screen>
      <form
        className={formCls}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
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
          <form.Field name="email">
            {(field) => (
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
                value={field.state.value}
                onBlur={field.handleBlur}
                // trim: 자동완성이 붙이는 앞뒤 공백 제거
                onChange={(event) => field.handleChange(event.currentTarget.value.trim())}
                error={fieldErrorMessage(field.state.meta.errors, messages.email)}
              />
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <TextField
                label="비밀번호"
                size="xl"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="비밀번호"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.currentTarget.value)}
                error={fieldErrorMessage(field.state.meta.errors, messages.password)}
              />
            )}
          </form.Field>
        </Stack>

        <Stack gap="2xl">
          <form.Subscribe selector={(state) => [state.values, state.isSubmitting] as const}>
            {([values, isSubmitting]) => (
              <Button
                type="submit"
                tone="brand"
                size="xl"
                className={submitCls}
                disabled={!(values.email.trim() && values.password)}
                loading={isSubmitting}
              >
                로그인
              </Button>
            )}
          </form.Subscribe>
          <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
            {(formError) =>
              typeof formError === 'string' ? (
                <Text variant="bodySm" tone="danger" align="center">
                  {formError}
                </Text>
              ) : null
            }
          </form.Subscribe>
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
