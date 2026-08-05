import type { Metadata } from 'next';
import { AppProviders } from '../providers/app-providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'CRM HPL',
  description: 'CRM HPL MVP',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
