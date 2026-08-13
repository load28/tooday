import { revalidateLogic, useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useRouteContext } from '@tanstack/react-router';
import { MIN_PASSWORD_LENGTH, type SignupRequest, signupRequestSchema } from '@tooday/shared';
import * as v from 'valibot';
import { formCls } from '@/features/auth/signup-screen.css';
import { fieldErrorMessage, fieldErrors, formError, hasTrpcErrorCode, TRPC_ERROR_CODES, useFormMessages } from '@/shared/form';
import { useT } from '@/shared/i18n';
import { Button, HStack, Screen, Stack, Text, TextField } from '@/shared/ui';

const signupFormSchema = v.object({
  ...signupRequestSchema.entries,
});

type SignupFormValues = v.InferInput<typeof signupFormSchema>;

function toSignupRequest({ name, email, password }: SignupFormValues): SignupRequest {
  return { name, email, password };
}

export function SignupScreen() {
  const navigate = useNavigate();
  const { trpc, queryClient } = useRouteContext({ from: '__root__' });
  const t = useT();

  const messages = useFormMessages(signupFormSchema, (t) => ({
    name: { min_length: t.auth.signup.nameRequired },
    email: { email: t.auth.signup.emailInvalid },
    password: { min_length: t.auth.signup.passwordTooShort({ min: MIN_PASSWORD_LENGTH }) },
  }));

  const signup = useMutation(
    trpc.auth.signup.mutationOptions({
      onSuccess: async ({ user }) => {
        queryClient.setQueryData(trpc.user.me.queryKey(), { user });
        await navigate({ to: '/today' });
      },
    }),
  );

  const form = useForm({
    defaultValues: { name: '', email: '', password: '' },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: signupFormSchema,
      onSubmitAsync: async ({ value }) => {
        try {
          await signup.mutateAsync(toSignupRequest(value));
        } catch (error) {
          if (hasTrpcErrorCode(error, TRPC_ERROR_CODES.conflict)) {
            return fieldErrors(signupFormSchema, { email: t.auth.signup.emailTaken });
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
            {t.auth.signup.title}
          </Text>
          <Text variant="body" tone="tertiary">
            {t.auth.signup.subtitle}
          </Text>
        </Stack>

        <Stack gap="2xl">
          <form.Field name="name">
            {(field) => (
              <TextField
                label={t.auth.name.label}
                size="xl"
                type="text"
                name="name"
                autoComplete="name"
                placeholder={t.auth.name.placeholder}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.currentTarget.value)}
                error={fieldErrorMessage(field.state.meta.errors, messages.name)}
              />
            )}
          </form.Field>
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
                autoComplete="new-password"
                placeholder={t.auth.signup.passwordPlaceholder}
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
                fullWidth
                disabled={!(values.name.trim() && values.email.trim() && values.password)}
                loading={isSubmitting}
              >
                {t.auth.signup.submit}
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
          <HStack gap="0" justify="center">
            <Text variant="bodySm" tone="tertiary">
              {t.auth.signup.hasAccount}
            </Text>
            <Button asChild tone="brandGhost" size="sm">
              <Link to="/login">{t.auth.signup.loginLink}</Link>
            </Button>
          </HStack>
        </Stack>
      </form>
    </Screen>
  );
}
