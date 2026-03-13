'use client'

export const dynamic = 'force-dynamic'

import { supabase } from '../../lib/supabase'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export default function Configuracoes() {
  const [email, setEmail] = useState('')
  const [colaboradores, setColaboradores] = useState<{email: string}[]>([])

  async function carregarColab() {
    const { data } = await supabase.from('colaboradores').select('email')
    if (data) setColaboradores(data)
  }

  useEffect(() => { carregarColab() }, [])

  async function addColaborador() {
    if (!email) return
    const { error } = await supabase.from('colaboradores').insert([{ email: email.toLowerCase(), role: 'colaborador' }])
    if (error) return toast.error('Erro ao adicionar.')
    toast.success('Acesso liberado para o e-mail.')
    setEmail(''); carregarColab();
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 text-stone-900 font-sans uppercase tracking-tight">
      <div className="mx-auto max-w-md">
        <header className="mb-8 text-center font-normal">
          <h1 className="text-xl text-stone-950">Colaboradores</h1>
          <p className="text-[10px] text-stone-400">Gestão de acessos</p>
        </header>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm mb-6">
          <input 
            placeholder="E-MAIL DO COLABORADOR" 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            className="w-full p-3 bg-stone-50 border border-stone-100 rounded-lg text-xs outline-none mb-3"
          />
          <button onClick={addColaborador} className="w-full py-3 bg-stone-950 text-white rounded-lg text-[10px]">
            CONCEDER ACESSO APENAS VENDAS
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-[9px] text-stone-400 ml-1">E-MAILS COM ACESSO</p>
          {colaboradores.map(c => (
            <div key={c.email} className="bg-white p-4 rounded-xl border border-stone-200 text-[11px] flex justify-between items-center">
              <span>{c.email}</span>
              <span className="text-[8px] bg-stone-100 px-2 py-1 rounded">VENDAS APENAS</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}