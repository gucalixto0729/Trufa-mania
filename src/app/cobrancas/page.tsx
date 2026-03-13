'use client'

import { supabase } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

type ItemExtrato = {
  nome: string
  quantidade: number
  valor: number
}

type Devedor = {
  cliente_id: string
  nome: string
  posto: string
  companhia: string
  telefone: string
  total: number
  detalhes: string
  vendaIds: string[]
}

export default function GestaoCobrancas() {
  const [devedores, setDevedores] = useState<Devedor[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [processandoId, setProcessandoId] = useState<string | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)

  function nomeComboPorProdutoId(produtoId?: string) {
    if (!produtoId || !produtoId.startsWith('combo-')) return null
    const codigo = produtoId.split('-')[1]
    if (codigo === 'G') return 'Combo G'
    if (codigo === 'E') return 'Combo E'
    if (codigo === 'GB') return 'Combo GB'
    if (codigo === 'EB') return 'Combo EB'
    return 'Combo Promocional'
  }

  async function carregar() {
    setCarregando(true)
    try {
      const { data: vendas } = await supabase
        .from('vendas')
        .select(`
          id, valor_total, cliente_id,
          itens_venda(produto_id, quantidade, preco_unitario, produtos(nome))
        `)
        .eq('pago', false)

      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome_completo, posto_grad, companhia, telefone')

      if (!vendas || !clientes) return

      const clientesMap = new Map(clientes.map(c => [c.id, c]))
      const agrupado = new Map<string, Devedor>()

      vendas.forEach((v: any) => {
        const c = clientesMap.get(v.cliente_id)
        if (!c) return

        if (!agrupado.has(v.cliente_id)) {
          agrupado.set(v.cliente_id, {
            cliente_id: v.cliente_id,
            nome: c.nome_completo,
            posto: c.posto_grad,
            companhia: c.companhia,
            telefone: c.telefone,
            total: 0,
            detalhes: '',
            vendaIds: []
          })
        }

        const dev = agrupado.get(v.cliente_id)!
        dev.total += Number(v.valor_total)
        dev.vendaIds.push(v.id)
        
        let somaItens = 0
        v.itens_venda.forEach((item: any) => {
          const nomeCombo = nomeComboPorProdutoId(item.produto_id)
          const nomeItem = item.produtos?.nome || nomeCombo || 'Item não identificado'
          const subtotalItem = (Number(item.quantidade) || 0) * (Number(item.preco_unitario) || 0)
          somaItens += subtotalItem
          dev.detalhes += `• ${item.quantidade}x ${nomeItem} - R$ ${subtotalItem.toFixed(2)}\n`
        })

        const diferenca = Number(v.valor_total) - somaItens
        if (Math.abs(diferenca) >= 0.01) {
          dev.detalhes += `• Combo/Ajuste não discriminado - R$ ${diferenca.toFixed(2)}\n`
        }
      })

      setDevedores(Array.from(agrupado.values()))
    } catch (err) {
      toast.error('Erro ao sincronizar cobranças.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function liquidar(devedor: Devedor) {
    if (!confirm(`Confirmar pagamento de R$ ${devedor.total.toFixed(2)}?`)) return
    setProcessandoId(devedor.cliente_id)
    const { error } = await supabase.from('vendas').update({ pago: true }).eq('cliente_id', devedor.cliente_id).eq('pago', false)
    setProcessandoId(null)
    if (error) return toast.error('Erro ao liquidar.')
    toast.success('Conta encerrada.')
    carregar()
  }

  async function estornar(devedor: Devedor) {
    if (!confirm(`Cancelar TODAS as vendas de ${devedor.nome} e devolver ao estoque?`)) return
    setProcessandoId(devedor.cliente_id)
    try {
      for (const id of devedor.vendaIds) {
        const { data: itens } = await supabase.from('itens_venda').select('produto_id, quantidade').eq('venda_id', id)
        if (itens) {
          for (const i of itens) {
            const { data: p } = await supabase.from('produtos').select('estoque').eq('id', i.produto_id).single()
            if (p) await supabase.from('produtos').update({ estoque: p.estoque + i.quantidade }).eq('id', i.produto_id)
          }
        }
        await supabase.from('vendas').delete().eq('id', id)
      }
      toast.success('Vendas estornadas.')
      carregar()
    } catch (err) { toast.error('Erro no estorno.') }
    finally { setProcessandoId(null) }
  }

  function enviarZap(d: Devedor) {
    const msg = `*TRUFAS MANIA - EXTRATO*\n\nOlá ${d.nome}.\nConsumo atual:\n${d.detalhes}\n*TOTAL: R$ ${d.total.toFixed(2)}*`
    window.open(`https://wa.me/55${d.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function exportarPlanilhaCobrancas() {
    if (devedores.length === 0) {
      toast.error('Sem dados para exportar.')
      return
    }

    const cabecalho = ['POSTO', 'NOME', 'COMPANHIA', 'TELEFONE', 'TOTAL_PENDENTE', 'DETALHES']
    const linhas = devedores.map(d => {
      const detalhesLimpos = d.detalhes.replace(/\n/g, ' | ').replace(/"/g, '""')
      const telefone = (d.telefone || '').replace(/\D/g, '')
      return [
        d.posto || '',
        d.nome || '',
        d.companhia || '',
        telefone,
        d.total.toFixed(2),
        detalhesLimpos
      ].map(valor => `"${String(valor)}"`).join(';')
    })

    const csv = [cabecalho.join(';'), ...linhas].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `cobrancas_pendentes_${stamp}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Planilha exportada com sucesso.')
  }

  const filtrados = devedores.filter(d => d.nome.toLowerCase().includes(busca.toLowerCase()) || d.companhia.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-20 text-stone-900">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <h1 className="text-xl font-medium italic">Gestão de Créditos</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1">Cobrança e Liquidação</p>
        </header>

        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou companhia..."
          className="mb-8 w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm outline-none ring-1 ring-stone-900/5 focus:border-stone-400 shadow-sm"
        />

        <button
          onClick={exportarPlanilhaCobrancas}
          className="mb-8 w-full rounded-lg bg-white border border-stone-200 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-700 hover:bg-stone-50 transition-all"
        >
          Exportar Planilha de Cobranças (CSV)
        </button>

        <div className="space-y-4">
          {filtrados.map((d) => (
            <div key={d.cliente_id} className="rounded-xl bg-white border border-stone-200/60 shadow-sm ring-1 ring-stone-900/5 transition-all overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div onClick={() => setExpandido(expandido === d.cliente_id ? null : d.cliente_id)} className="cursor-pointer group">
                    <h2 className="text-base font-semibold text-stone-900 group-hover:text-stone-600 transition-colors">
                      <span className="text-stone-400 font-medium mr-1">{d.posto}</span> {d.nome}
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-0.5">{d.companhia} • <span className="text-stone-300 italic">Ver detalhes</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600 tracking-tight">R$ {d.total.toFixed(2)}</p>
                  </div>
                </div>

                {expandido === d.cliente_id && (
                  <pre className="mb-6 whitespace-pre-wrap text-[10px] text-stone-500 bg-stone-50 p-4 rounded-lg font-sans leading-relaxed border border-stone-100 animate-in fade-in slide-in-from-top-2">
                    {d.detalhes}
                  </pre>
                )}

                <div className="flex gap-2">
                  <button onClick={() => enviarZap(d)} className="flex-1 rounded-lg bg-stone-50 border border-stone-200 py-2.5 text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:bg-stone-100 transition-all">WhatsApp</button>
                  <button onClick={() => liquidar(d)} disabled={!!processandoId} className="flex-1 rounded-lg bg-stone-950 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-stone-800 transition-all disabled:opacity-50">Liquidar</button>
                  <button onClick={() => estornar(d)} className="rounded-lg bg-white border border-stone-200 px-3 py-2.5 text-stone-300 hover:text-red-600 hover:border-red-100 hover:bg-red-50 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}