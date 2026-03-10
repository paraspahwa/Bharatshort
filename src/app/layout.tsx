import { Space_Grotesk, Manrope } from 'next/font/google'
import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import { Providers } from './providers'

const displayFont = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' })
const bodyFont = Manrope({ subsets: ['latin'], variable: '--font-body' })

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
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  )
}
