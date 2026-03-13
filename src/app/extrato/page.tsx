'use client'

export const dynamic = 'force-dynamic'

import { supabase } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

type RegistroExtrato = {
  id: string
  valor: number
  descricao: string
  sub_descricao: string
  data: string
  tipo: 'venda' | 'baixa'
  status: string
}

export default function Extrato() {
  const [registros, setRegistros] = useState<RegistroExtrato[]>([])
  const [filtro, setFiltro] = useState<'todos' | 'venda' | 'baixa'>('todos')
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    setCarregando(true)
    try {
      const [resVendas, resClientes, resBaixas, resProdutos] = await Promise.all([
        supabase.from('vendas').select('*'),
        supabase.from('clientes').select('id, nome_completo, posto_grad'),
        supabase.from('baixas').select('*'),
        supabase.from('produtos').select('id, nome')
      ])

      const clientesMap = new Map(resClientes.data?.map(c => [c.id, c]))
      const produtosMap = new Map(resProdutos.data?.map(p => [p.id, p]))

      const vendasFormatadas: RegistroExtrato[] = (resVendas.data || []).map(v => {
        const cliente = clientesMap.get(v.cliente_id)
        return {
          id: v.id,
          valor: Number(v.valor_total),
          descricao: cliente?.nome_completo || 'Venda Avulsa',
          sub_descricao: `${(v.metodo_pagamento || 'PIX').toUpperCase()} • ${cliente?.posto_grad || 'CIVIL'}`,
          data: v.data_venda || v.created_at,
          tipo: 'venda',
          status: v.pago ? 'Liquidado' : 'Pendente'
        }
      })

      const baixasFormatadas: RegistroExtrato[] = (resBaixas.data || []).map(b => {
        const produto = produtosMap.get(b.produto_id)
        return {
          id: b.id,
          valor: Number(b.custo_total),
          descricao: `PERDA: ${produto?.nome || 'Item Desconhecido'}`,
          sub_descricao: (b.motivo || 'NÃO INFORMADO').toUpperCase(),
          data: b.data_baixa || b.created_at,
          tipo: 'baixa',
          status: 'Prejuízo'
        }
      })

      const todos = [...vendasFormatadas, ...baixasFormatadas].sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      )

      setRegistros(todos)
    } catch (err) {
      toast.error('Erro ao sincronizar dados.')
    } finally {
      setCarregando(false)
    }
  }

  async function excluirRegistro(id: string, tipo: 'venda' | 'baixa') {
    const confirmacao = confirm(`Deseja estornar esta ${tipo}? Os itens voltarão ao estoque.`)
    if (!confirmacao) return

    try {
      if (tipo === 'venda') {
        const { data: itens } = await supabase.from('itens_venda').select('produto_id, quantidade').eq('venda_id', id)
        
        if (itens && itens.length > 0) {
          for (const item of itens) {
            const { data: prod } = await supabase.from('produtos').select('estoque').eq('id', item.produto_id).single()
            if (prod) {
              await supabase.from('produtos').update({ estoque: prod.estoque + item.quantidade }).eq('id', item.produto_id)
            }
          }
        }
        await supabase.from('itens_venda').delete().eq('venda_id', id)
        await supabase.from('vendas').delete().eq('id', id)
      } else {
        const { data: baixa } = await supabase.from('baixas').select('*').eq('id', id).single()
        if (baixa) {
          const { data: prod } = await supabase.from('produtos').select('estoque').eq('id', baixa.produto_id).single()
          if (prod) {
            await supabase.from('produtos').update({ estoque: prod.estoque + baixa.quantidade }).eq('id', baixa.produto_id)
          }
        }
        await supabase.from('baixas').delete().eq('id', id)
      }

      toast.success('Registro estornado e estoque atualizado.')
      carregar()
    } catch (err) {
      toast.error('Erro técnico ao processar estorno.')
    }
  }

  useEffect(() => { carregar() }, [])

  const filtrados = registros.filter(r => {
    const matchesBusca = r.descricao.toLowerCase().includes(busca.toLowerCase()) || 
                         r.sub_descricao.toLowerCase().includes(busca.toLowerCase())
    const matchesTipo = filtro === 'todos' || r.tipo === filtro
    return matchesBusca && matchesTipo
  })

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-20 text-stone-900">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <h1 className="text-xl font-medium tracking-tight text-stone-950 italic">Extrato Unificado</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1">Gestão e Estorno</p>
        </header>

        <div className="space-y-4 mb-8">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar registro..."
            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm outline-none ring-1 ring-stone-900/5 focus:border-stone-400 transition-all"
          />

          <div className="flex gap-2 bg-white p-1 rounded-lg border border-stone-200/60 ring-1 ring-stone-900/5">
            {(['todos', 'venda', 'baixa'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFiltro(t)}
                className={`flex-1 rounded-md py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                  filtro === t ? 'bg-stone-950 text-white shadow-sm' : 'text-stone-400 hover:bg-stone-50'
                }`}
              >
                {t === 'baixa' ? 'Perdas' : t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {carregando ? (
            <div className="h-20 rounded-xl bg-white animate-pulse" />
          ) : (
            filtrados.map((r) => (
              <div key={r.id} className={`group relative flex items-center justify-between rounded-xl p-5 border shadow-sm transition-all ${r.tipo === 'baixa' ? 'bg-red-50/40 border-red-100 ring-1 ring-red-950/5' : 'bg-white border-stone-200/60 ring-1 ring-stone-900/5'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    {r.tipo === 'baixa' && <div className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                    <p className={`text-sm font-semibold ${r.tipo === 'baixa' ? 'text-red-900' : 'text-stone-900'}`}>{r.descricao}</p>
                  </div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400 mt-1">
                    {new Date(r.data).toLocaleDateString('pt-BR')} • {r.sub_descricao}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`text-base font-bold tracking-tight ${r.tipo === 'baixa' ? 'text-red-600' : 'text-stone-900'}`}>
                      {r.tipo === 'baixa' ? `- R$ ${r.valor.toFixed(2)}` : `R$ ${r.valor.toFixed(2)}`}
                    </p>
                    <span className="text-[9px] font-bold uppercase opacity-60 text-stone-400">{r.status}</span>
                  </div>
                  <button
                    onClick={() => excluirRegistro(r.id, r.tipo)}
                    className="rounded-md p-2 text-stone-300 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}