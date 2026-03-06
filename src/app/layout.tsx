import { Inter } from 'next/font/google'
import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

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
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  )
}
