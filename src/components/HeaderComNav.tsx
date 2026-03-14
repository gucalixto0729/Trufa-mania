'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BotaoSair } from './BotaoSair'

export default function HeaderComNav() {
  const pathname = usePathname()
  
  if (pathname === '/login') return null

  const navLinks = [
    { name: 'Início', href: '/' },
    { name: 'Vendas', href: '/vendas' },
    { name: 'Estoque', href: '/produtos' },
    { name: 'Clientes', href: '/clientes' },
    { name: 'Desperdício', href: '/baixas' },
    { name: 'Cobranças', href: '/cobrancas' },
    { name: 'Extrato', href: '/extrato' },
    { name: 'Análise', href: '/analise' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/60 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-4 sm:px-6">
        <nav className="flex w-full flex-wrap items-center justify-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-medium tracking-tight transition-all duration-200 sm:px-3.5 ${
                  isActive
                    ? 'bg-stone-950 text-white shadow-sm ring-1 ring-stone-950'
                    : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                {link.name}
              </Link>
            )
          })}
        </nav>
        
        <div className="flex items-center justify-center">
          <BotaoSair />
        </div>
      </div>
    </header>
  )
}