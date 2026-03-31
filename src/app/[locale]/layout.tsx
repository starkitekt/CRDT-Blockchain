import type { Metadata, Viewport } from 'next';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {IBM_Plex_Sans, Noto_Sans_Devanagari, DM_Sans} from 'next/font/google';
import '../globals.css';
import '../../styles/carbon-theme.scss';
import HoneyHeader from '@/components/Navigation/HoneyHeader';
import BlockchainStatusBanner from '@/components/Blockchain/BlockchainStatusBanner';
import ErrorBoundary from '@/components/ErrorBoundary';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import { Content } from '@carbon/react';

export const metadata: Metadata = {
  title: 'HoneyTRACE — Blockchain Traceability',
  description: 'GS1 EPCIS 2.0 compliant honey supply chain traceability platform.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HoneyTRACE',
  },
};

export const viewport: Viewport = {
  themeColor: '#f5a623',
  width: 'device-width',
  initialScale: 1,
};

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  variable: '--font-plex-sans',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-dm-sans',
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '700'],
  variable: '--font-noto-devanagari',
});

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  const messages = await getMessages();
 
  return (
    <html lang={locale} className={`${plexSans.variable} ${dmSans.variable} ${notoDevanagari.variable}`}>
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:font-bold focus:text-sm"
        >
          Skip to main content
        </a>
        <NextIntlClientProvider messages={messages}>
          <ServiceWorkerRegistrar />
          <HoneyHeader />
          <BlockchainStatusBanner />
          <Content className="!pt-12 !px-0 !bg-transparent">
            <ErrorBoundary>
              <main id="main-content">
                {children}
              </main>
            </ErrorBoundary>
          </Content>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
