'use client'

export const dynamic = 'force-dynamic'

import { supabase } from '../../lib/supabase'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

type Produto = {
  id: string
  nome: string
  preco_custo: number
  estoque: number
}

const MOTIVOS = ['Consumo Dono', 'Avaria / Estrago', 'Vencimento', 'Brinde / Cortesia']

export default function Baixas() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [produtoId, setProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState<number>(1)
  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [motivoLivre, setMotivoLivre] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase.from('produtos').select('id, nome, preco_custo, estoque').order('nome')
      if (data) setProdutos(data)
    }
    carregar()
  }, [])

async function registrarBaixa() {
  if (!produtoId || quantidade <= 0) {
    toast.error('Preencha os campos corretamente.')
    return
  }

  const produto = produtos.find(p => p.id === produtoId)
  if (!produto) return

  if (produto.estoque < quantidade) {
    toast.error('Estoque insuficiente.')
    return
  }

  setSalvando(true)
  const custoTotal = Number(produto.preco_custo) * quantidade
  const motivoFinal = motivo === '__outro__' ? motivoLivre.trim() : motivo

  if (!motivoFinal) {
    toast.error('Informe o motivo da baixa.')
    setSalvando(false)
    return
  }

  try {
    // 1. Registro da Baixa
    const { error: errBaixa } = await supabase
      .from('baixas')
      .insert({
        produto_id: produtoId,
        quantidade: Math.floor(quantidade),
        motivo: motivoFinal,
        custo_total: custoTotal
      })

    if (errBaixa) {
      console.error('Erro Supabase Baixa:', errBaixa)
      toast.error('Erro de permissão no banco (401).')
      setSalvando(false)
      return
    }

    // 2. Atualização do Estoque
    const { error: errEstoque } = await supabase
      .from('produtos')
      .update({ estoque: produto.estoque - quantidade })
      .eq('id', produtoId)

    if (errEstoque) {
      toast.error('Baixa registrada, mas erro ao atualizar estoque.')
      return
    }

    toast.success('Operação realizada.')
    
    // Limpeza e recarregamento
    setQuantidade(1)
    setProdutoId('')
    const { data } = await supabase.from('produtos').select('id, nome, preco_custo, estoque').order('nome')
    if (data) setProdutos(data)

  } catch (err) {
    toast.error('Falha na conexão.')
  } finally {
    setSalvando(false)
  }
}

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-20 text-stone-900">
      <div className="mx-auto max-w-md">
        <header className="mb-8 text-center">
          <h1 className="text-xl font-medium tracking-tight text-stone-950 italic">Baixas de Estoque</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1">Consumo e Perdas</p>
        </header>

        <div className="rounded-xl bg-white p-8 shadow-sm border border-stone-200/60 ring-1 ring-stone-900/5">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">Produto</label>
              <select
                value={produtoId}
                onChange={(e) => setProdutoId(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400 transition-all cursor-pointer"
              >
                <option value="">Selecionar item...</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome} (Qtd: {p.estoque})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">Quantidade</label>
                <input
                  type="number"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                  min="1"
                  className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">Motivo</label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400 transition-all cursor-pointer"
                >
                  {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                  <option value="__outro__">Outro...</option>
                </select>
              </div>
            </div>

            {motivo === '__outro__' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">Motivo Personalizado</label>
                <input
                  type="text"
                  value={motivoLivre}
                  onChange={(e) => setMotivoLivre(e.target.value)}
                  placeholder="Descreva o motivo"
                  className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder-stone-300 outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-900/5 transition-all"
                />
              </div>
            )}

            <button
              onClick={registrarBaixa}
              disabled={salvando}
              className="w-full rounded-lg bg-stone-950 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-sm hover:bg-stone-800 disabled:opacity-50 transition-all active:scale-[0.98] mt-2"
            >
              {salvando ? 'Processando...' : 'Registrar Saída'}
            </button>
          </div>
        </div>

        <footer className="mt-8 rounded-lg bg-amber-50 border border-amber-100 p-4">
          <p className="text-[10px] text-amber-700 leading-relaxed italic">
            * As baixas não geram receita. O custo do item será contabilizado como perda na análise de lucro líquido.
          </p>
        </footer>
      </div>
    </div>
  )
}