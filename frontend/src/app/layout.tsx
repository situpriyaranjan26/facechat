import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'FaceChat — Meet Someone New',
  description:
    'Talk face-to-face with people from around the world. Instant video chat, no sign-up required.',
  keywords: ['video chat', 'random video chat', 'meet new people', 'facechat'],
  themeColor: '#7C3AED',
  openGraph: {
    title: 'FaceChat — Meet Someone New',
    description: 'Talk face-to-face with people from around the world.',
    type: 'website',
    siteName: 'FaceChat',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FaceChat — Meet Someone New',
    description: 'Talk face-to-face with people from around the world.',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="color-scheme" content="dark" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-bg-base text-text-primary font-sans antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1A1A26',
              color: '#F8F8FF',
              border: '1px solid #2A2A3A',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#10B981', secondary: '#0A0A0F' },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#0A0A0F' },
            },
          }}
        />
      </body>
    </html>
  )
}
