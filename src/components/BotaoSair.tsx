'use client'

import { toast } from 'sonner'

export function BotaoSair() {
  async function sair() {
    try {
      // Chamar logout API para limpar cookies no servidor
      await fetch('/api/logout', { method: 'POST' })
    } catch (err) {
      console.error('Erro ao fazer logout:', err)
    }

    // Limpar sessionStorage
    sessionStorage.removeItem('user_email')
    sessionStorage.removeItem('user_role')
    
    // Redirecionar para login
    toast.success('Sessão encerrada.')
    window.location.href = '/login'
  }

  return (
    <button
      onClick={sair}
      className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all active:scale-[0.98]"
    >
      Sair
    </button>
  )
}