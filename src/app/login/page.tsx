'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../../context/auth-context';
import { getDefaultAuthenticatedPath } from '../../lib/auth-routing';
import { getErrorMessage } from '../../lib/errors';

const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isInitialized } = useAuth();
  const [requestError, setRequestError] = useState<string | null>(null);
  const hasNavigatedRef = useRef(false);
  const isSubmitNavigationRef = useRef(false);
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
        getErrorMessage(error, 'Не удалось войти. Проверьте email и пароль.'),
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
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"
          aria-label="Загрузка"
        />
      </main>
    );
  }

  if (user) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
        className="w-full max-w-sm rounded border border-gray-300 bg-white p-6 shadow-sm"
      >
        <div className="mb-5">
          <h1 className="text-lg font-semibold text-gray-900">
            Вход в CRM HPL
          </h1>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500"
              {...register('email')}
            />
            {errors.email ? (
              <span className="mt-1 block text-sm text-red-600">
                {errors.email.message}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Пароль
            </span>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500"
              {...register('password')}
            />
            {errors.password ? (
              <span className="mt-1 block text-sm text-red-600">
                {errors.password.message}
              </span>
            ) : null}
          </label>
        </div>

        {requestError ? (
          <p className="mt-4 text-sm text-red-600">{requestError}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 w-full rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-500"
        >
          {isSubmitting ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </main>
  );
}
