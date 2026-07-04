import { revalidateLogic, useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouteContext, useRouter } from '@tanstack/react-router';
import { signupRequestSchema } from '@tooday/shared';
import { css } from 'styled-system/css';
import { firstErrorMessage, hasTrpcErrorCode, SERVER_ERROR_MESSAGES, TRPC_ERROR_CODES } from '@/shared/form';
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

export function SignupScreen() {
  const router = useRouter();
  const { trpc, queryClient } = useRouteContext({ from: '__root__' });

  const signup = useMutation(
    trpc.auth.signup.mutationOptions({
      onSuccess: async ({ user }) => {
        queryClient.setQueryData(trpc.user.me.queryKey(), { user });
        await router.navigate({ to: '/today' });
      },
    }),
  );

  const form = useForm({
    defaultValues: { name: '', email: '', password: '' },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: signupRequestSchema,
      onSubmitAsync: async ({ value }) => {
        try {
          await signup.mutateAsync(value);
          return undefined;
        } catch (error) {
          if (hasTrpcErrorCode(error, TRPC_ERROR_CODES.conflict)) {
            return { fields: { email: SERVER_ERROR_MESSAGES.emailTaken } };
          }
          return { form: error instanceof Error ? error.message : SERVER_ERROR_MESSAGES.fallback };
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
            회원가입
          </Text>
          <Text variant="body" tone="tertiary">
            이름, 이메일, 비밀번호를 입력해 주세요.
          </Text>
        </Stack>

        <Stack gap="2xl">
          <form.Field name="name">
            {(field) => (
              <TextField
                label="이름"
                size="xl"
                type="text"
                name="name"
                autoComplete="name"
                placeholder="이름"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.currentTarget.value)}
                error={firstErrorMessage(field.state.meta.errors)}
              />
            )}
          </form.Field>
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
                error={firstErrorMessage(field.state.meta.errors)}
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
                autoComplete="new-password"
                placeholder="8자 이상"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.currentTarget.value)}
                error={firstErrorMessage(field.state.meta.errors)}
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
                disabled={!(values.name.trim() && values.email.trim() && values.password)}
                loading={isSubmitting}
              >
                가입하기
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
