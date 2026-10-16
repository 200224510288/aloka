import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sinhala Daily Lottery Result Sheet Generator',
  description: 'Standardised daily Sinhala lottery result sheet generator with OCR, validation, and print-ready dual A4 PDF export.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="si">
      <head>
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
