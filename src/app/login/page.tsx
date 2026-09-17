'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../../context/auth-context';
import { getDefaultAuthenticatedPath } from '../../lib/auth-routing';
import { getErrorMessage } from '../../lib/errors';
import { useI18n } from '@/i18n/provider';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { ThemeToggle } from '@/components/layout/theme-toggle';

type LoginFormValues = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isInitialized } = useAuth();
  const { t, messages } = useI18n();
  const [requestError, setRequestError] = useState<string | null>(null);
  const hasNavigatedRef = useRef(false);
  const isSubmitNavigationRef = useRef(false);
  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('auth.invalidEmail')),
        password: z.string().min(1, t('auth.passwordRequired')),
      }),
    [t],
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    setRequestError(null);
    isSubmitNavigationRef.current = true;

    try {
      const authenticatedUser = await login(values.email, values.password);
      if (!hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        router.replace(getDefaultAuthenticatedPath(authenticatedUser));
      }
    } catch (error: unknown) {
      isSubmitNavigationRef.current = false;
      setRequestError(
        getErrorMessage(error, t('auth.loginFailed'), messages),
      );
    }
  };

  useEffect(() => {
    if (
      isInitialized &&
      user &&
      !isSubmitNavigationRef.current &&
      !hasNavigatedRef.current
    ) {
      hasNavigatedRef.current = true;
      router.replace(getDefaultAuthenticatedPath(user));
    }
  }, [isInitialized, router, user]);

  if (!isInitialized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground"
          aria-label={t('common.loading')}
        />
      </main>
    );
  }

  if (user) {
    return null;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
      <form
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
        className="w-full max-w-sm rounded border border-border bg-card p-6 shadow-sm"
      >
        <div className="mb-5">
          <h1 className="text-lg font-semibold text-foreground">
            {t('auth.title')}
          </h1>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground">
              {t('auth.email')}
            </span>
            <input
              type="email"
              autoComplete="email"
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
              {...register('email')}
            />
            {errors.email ? (
              <span className="mt-1 block text-sm text-destructive">
                {errors.email.message}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground">
              {t('auth.password')}
            </span>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
              {...register('password')}
            />
            {errors.password ? (
              <span className="mt-1 block text-sm text-destructive">
                {errors.password.message}
              </span>
            ) : null}
          </label>
        </div>

        {requestError ? (
          <p className="mt-4 text-sm text-destructive">{requestError}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 w-full rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? t('auth.submitting') : t('auth.submit')}
        </button>
      </form>
    </main>
  );
}
