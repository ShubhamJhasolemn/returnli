import './globals.css'

import { Header } from '@/components/Header'

export const metadata = {
  title: 'Returnli',
  description: 'Returns desk for support agents',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-200 antialiased">
        <Header />
        {children}
      </body>
    </html>
  )
}