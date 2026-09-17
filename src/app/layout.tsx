import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { AppProviders } from '../providers/app-providers';
import {
  LOCALE_COOKIE,
  THEME_COOKIE,
  parseLocale,
  parseTheme,
} from '@/i18n/config';
import { THEME_INIT_SCRIPT } from '@/theme/theme-script';
import './globals.css';

export const metadata: Metadata = {
  title: 'CRM HPL',
  description: 'CRM HPL MVP',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = parseLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html
      lang={locale}
      className={theme === 'dark' ? 'dark' : undefined}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <AppProviders initialLocale={locale} initialTheme={theme}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
