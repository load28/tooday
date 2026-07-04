import { revalidateLogic, useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouteContext, useRouter } from '@tanstack/react-router';
import { type LoginRequest, loginRequestSchema } from '@tooday/shared';
import { css } from 'styled-system/css';
import * as v from 'valibot';
import { fieldErrorMessage, fieldErrors, formError, hasTrpcErrorCode, TRPC_ERROR_CODES, useFormMessages } from '@/shared/form';
import { useT } from '@/shared/i18n';
import { Button, HStack, Screen, Stack, Text, TextField } from '@/shared/ui';

const loginFormSchema = v.object({
  ...loginRequestSchema.entries,
});

type LoginFormValues = v.InferInput<typeof loginFormSchema>;

function toLoginRequest({ email, password }: LoginFormValues): LoginRequest {
  return { email, password };
}

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
  const t = useT();

  const messages = useFormMessages(loginFormSchema, (t) => ({
    email: { min_length: t.auth.login.emailRequired },
    password: { min_length: t.auth.login.passwordRequired },
  }));

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
      onDynamic: loginFormSchema,
      onSubmitAsync: async ({ value }) => {
        try {
          await login.mutateAsync(toLoginRequest(value));
        } catch (error) {
          if (hasTrpcErrorCode(error, TRPC_ERROR_CODES.unauthorized)) {
            return fieldErrors(loginFormSchema, { password: t.auth.login.invalidCredentials });
          }
          return formError(t.common.error.unexpected);
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
            {t.common.brand}
          </Text>
          <Text as="h1" variant="display">
            {t.auth.login.title}
          </Text>
          <Text variant="body" tone="tertiary">
            {t.auth.login.subtitle}
          </Text>
        </Stack>

        <Stack gap="2xl">
          <form.Field name="email">
            {(field) => (
              <TextField
                label={t.auth.email.label}
                size="xl"
                type="email"
                name="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={t.auth.email.placeholder}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.currentTarget.value)}
                error={fieldErrorMessage(field.state.meta.errors, messages.email)}
              />
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <TextField
                label={t.auth.password.label}
                size="xl"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder={t.auth.login.passwordPlaceholder}
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
                {t.auth.login.submit}
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
              {t.auth.login.noAccount}
            </Text>
            <Link to="/signup" className={signupLinkCls}>
              {t.auth.login.signupLink}
            </Link>
          </HStack>
        </Stack>
      </form>
    </Screen>
  );
}
