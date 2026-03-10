import { Space_Grotesk, Manrope } from 'next/font/google'
import './globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'
import { Toaster } from 'react-hot-toast'
import { Providers } from './providers'

const displayFont = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' })
const bodyFont = Manrope({ subsets: ['latin'], variable: '--font-body' })
const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export const metadata: Metadata = {
  title: 'BharatShort AI - AI-Powered Short Video Generator',
  description: 'Create stunning short videos automatically with AI. Generate scripts, images, voiceovers, and captions instantly.',
  keywords: 'AI video generator, short videos, YouTube Shorts, Instagram Reels, TikTok, content creation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable} font-[var(--font-body)]`}>
          {gaMeasurementId ? (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
                strategy="afterInteractive"
              />
              <Script id="ga4-init" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  window.gtag = gtag;
                  gtag('js', new Date());
                  gtag('config', '${gaMeasurementId}');
                `}
              </Script>
            </>
          ) : null}
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  )
}
