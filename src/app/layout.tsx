import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import HeaderComNav from '@/components/HeaderComNav'
import { Toaster } from 'sonner'
import './globals.css'

// Configuração da fonte Inter para um visual clean e profissional
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Trufas Mania',
  description: 'Gestão de Vendas e Estoque',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="scroll-smooth">
      <body className={`${inter.className} min-h-screen bg-stone-50 text-stone-900 antialiased`}>
        {/* Toaster com design minimalista */}
        <Toaster 
          richColors 
          position="top-center" 
          toastOptions={{
            style: { borderRadius: '12px' },
          }} 
        />

        <HeaderComNav />
        
        <main className="mx-auto w-full transition-all duration-300">
          {children}
        </main>
      </body>
    </html>
  )
}