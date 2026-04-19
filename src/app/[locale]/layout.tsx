import '@/lib/env';
import type { Metadata, Viewport } from 'next';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {Plus_Jakarta_Sans, Noto_Sans_Devanagari, DM_Mono} from 'next/font/google';
import '../globals.css';
import '../../styles/carbon-theme.scss';
import HoneyHeader from '@/components/Navigation/HoneyHeader';
import GovFooter from '@/components/Navigation/GovFooter';
import ErrorBoundary from '@/components/ErrorBoundary';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import { Content } from '@carbon/react';

export const metadata: Metadata = {
  title: 'HoneyTRACE — Blockchain Traceability | Ministry of Tribal Affairs × IIT Delhi',
  description: 'GS1 EPCIS 2.0 compliant honey supply chain traceability platform. A Government of India initiative by Ministry of Tribal Affairs in collaboration with IIT Delhi.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HoneyTRACE',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
};

// Primary brand / UI typeface: modern, approachable geometric sans-serif.
// Used for every non-numerical surface (body, headings, eyebrows, buttons).
const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta-sans',
  display: 'swap',
});

// Numerical / blockchain typeface: monospace with tabular lining.
// Used for every digit surface (prices, weights, hashes, GPS, tx ids).
const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '700'],
  variable: '--font-noto-devanagari',
  display: 'swap',
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
    <html lang={locale} className={`${jakartaSans.variable} ${dmMono.variable} ${notoDevanagari.variable}`}>
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
          <Content className="!pt-0 !px-0 !bg-transparent">
            <ErrorBoundary>
              <main id="main-content">
                {children}
              </main>
            </ErrorBoundary>
          </Content>
          <GovFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
