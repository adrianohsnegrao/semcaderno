import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Sem Caderno — vendas, fiados e despesas',
  description:
    'Caderno digital simples para pequenos comércios organizarem vendas, fiados, pagamentos e despesas.',
  applicationName: 'Sem Caderno',
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
