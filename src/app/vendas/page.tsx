'use client'

import { supabase } from '../../lib/supabase'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'

type Cliente = { id: string; nome_completo: string; posto_grad?: string; tipo?: string; }
type Produto = { id: string; nome: string; preco_venda: number; categoria: string; categoria_pai: string; localizacao: string }
type ItemCarrinho = { produto: Produto; quantidade: number }
type MetodoPagamento = 'FIADO' | 'PIX' | 'CARTÃO' | 'DINHEIRO'

export default function Vendas() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [buscaCliente, setBuscaCliente] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [metodo, setMetodo] = useState<MetodoPagamento>('PIX')
  const [salvando, setSalvando] = useState(false)
  const [descontoManual, setDescontoManual] = useState<number>(0)

  useEffect(() => {
    async function carregar() {
      const [resClientes, resProdutos] = await Promise.all([
        supabase.from('clientes').select('id, nome_completo, posto_grad, tipo'),
        supabase.from('produtos').select('*').eq('localizacao', 'Geladeira').order('categoria_pai'),
      ])
      if (resClientes.data) {
        setClientes(resClientes.data as Cliente[]);
      }
      if (resProdutos.data) setProdutos(resProdutos.data as Produto[])
    }
    carregar()
  }, [])

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c: Cliente) => 
      c.nome_completo.toLowerCase().includes(buscaCliente.toLowerCase())
    )
  }, [clientes, buscaCliente])

  const subtotalGeral = useMemo(() => {
    return carrinho.reduce((s, i) => {
      return s + (Number(i.produto.preco_venda) || 0) * (i.quantidade || 1)
    }, 0)
  }, [carrinho])

  const totalComDesconto = subtotalGeral - descontoManual

  function adicionarProduto(p: Produto) {
    setCarrinho([...carrinho, { produto: p, quantidade: 1 }])
    toast.info(`${p.nome} adicionado`)
  }

  async function finalizar() {
    if (carrinho.length === 0 || !clienteSelecionado) return toast.error('Dados incompletos');
    setSalvando(true);
    let vendaIdCriada: string | null = null;
    try {
      const { data: v, error: ev } = await supabase.from('vendas').insert([{
        cliente_id: clienteSelecionado.id, valor_total: totalComDesconto, 
        desconto: descontoManual,
        pago: metodo !== 'FIADO', metodo_pagamento: metodo, data_venda: new Date().toISOString()
      }]).select('id').single();
      if (ev || !v) throw new Error();
      vendaIdCriada = v.id;
      for (const i of carrinho) {
        const { error: ei } = await supabase.from('itens_venda').insert({ venda_id: v.id, produto_id: i.produto.id, quantidade: i.quantidade, preco_unitario: i.produto.preco_venda });
        if (ei) throw new Error('Falha ao salvar itens da venda');

        const { data: ep, error: eep } = await supabase.from('produtos').select('estoque').eq('id', i.produto.id).single();
        if (eep) throw new Error('Falha ao buscar estoque');

        const { error: eup } = await supabase.from('produtos').update({ estoque: (Number(ep?.estoque) || 0) - i.quantidade }).eq('id', i.produto.id);
        if (eup) throw new Error('Falha ao atualizar estoque');
      }
      toast.success('Venda concluída');
      setCarrinho([]); setClienteSelecionado(null); setBuscaCliente(''); setDescontoManual(0);
    } catch {
      if (vendaIdCriada) {
        await supabase.from('itens_venda').delete().eq('venda_id', vendaIdCriada);
        await supabase.from('vendas').delete().eq('id', vendaIdCriada);
      }
      toast.error('Erro ao processar. Venda cancelada para evitar inconsistência.');
    } finally { setSalvando(false) }
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-24 text-stone-900 font-sans uppercase tracking-tighter">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center font-normal">
          <h1 className="text-xl text-stone-950">Ponto de Venda</h1>
          <p className="text-[10px] text-stone-400">Gerenciamento de Vendas</p>
        </header>

        <section className="mb-6 p-6 bg-white rounded-xl border border-stone-200 shadow-sm font-normal">
          <input type="text" value={buscaCliente} onChange={e => setBuscaCliente(e.target.value)} placeholder="PESQUISAR CLIENTE..." className="w-full p-3 bg-stone-50 border border-stone-100 rounded-lg text-sm outline-none focus:border-stone-400" />
          <div className="max-h-40 overflow-y-auto mt-2">
            {clientesFiltrados.map(c => (
              <button key={c.id} onClick={() => { setClienteSelecionado(c); setBuscaCliente(c.nome_completo) }} className={`block w-full p-2.5 text-left text-[11px] border-b border-stone-50 last:border-0 ${clienteSelecionado?.id === c.id ? 'bg-stone-950 text-white' : 'hover:bg-stone-50'}`}>
                <span className="text-stone-400 mr-2">{c.tipo === 'militar' ? `[${c.posto_grad}]` : '[CIVIL]'}</span> {c.nome_completo}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6 p-6 bg-white rounded-xl border border-stone-200 shadow-sm space-y-6">
          {['Trufas', 'Bolos', 'Pão de Mel'].map(cat => (
            <div key={cat}>
              <p className="mb-3 text-[9px] text-stone-400 border-b pb-1">{cat}</p>
              <div className="grid grid-cols-2 gap-2">
                {produtos.filter(p => p.categoria_pai === cat).map(p => (
                  <button key={p.id} onClick={() => adicionarProduto(p)} className="flex justify-between p-3 bg-stone-50 border border-stone-100 rounded-lg text-[11px] hover:border-stone-950 transition-all uppercase font-normal">
                    <span>{p.nome}</span>
                    <span className="text-stone-400">R$ {Number(p.preco_venda).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        {carrinho.length > 0 && (
          <section className="mb-6 p-6 bg-stone-950 text-white rounded-xl shadow-lg">
            <div className="space-y-2 mb-6 border-b border-white/10 pb-4">
              {carrinho.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs font-normal">
                  <span>
                    {item.quantidade}X {item.produto.nome}
                  </span>
                  <div className="flex gap-4 items-center">
                    <span className="text-white/40">R$ {(item.quantidade * item.produto.preco_venda).toFixed(2)}</span>
                    <button onClick={() => { setCarrinho(carrinho.filter((_, i) => i !== idx)) }} className="text-[9px] text-white/30 underline">REMOVER</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-end justify-between font-normal">
              <div>
                <p className="text-[9px] text-emerald-400 tracking-widest">DESCONTO</p>
                <div className="flex items-center gap-2">
                   <span className="text-lg">- R$</span>
                   <input 
                     type="number" 
                     value={descontoManual}
                     onChange={(e) => setDescontoManual(Math.max(0, Number(e.target.value)))}
                     className="bg-transparent text-lg border-b border-white/20 outline-none w-20 text-white"
                   />
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] opacity-40">TOTAL LÍQUIDO</p>
                <p className="text-3xl text-emerald-400">R$ {totalComDesconto.toFixed(2)}</p>
              </div>
            </div>
          </section>
        )}

        <div className="mb-8 grid grid-cols-4 gap-2">
          {(['FIADO', 'PIX', 'CARTÃO', 'DINHEIRO'] as MetodoPagamento[]).map(m => (
            <button key={m} onClick={() => setMetodo(m)} className={`p-3 text-[9px] border rounded-lg transition-all font-normal uppercase ${metodo === m ? 'bg-stone-950 text-white shadow-sm' : 'bg-white text-stone-400 border-stone-100 hover:bg-stone-50'}`}>{m}</button>
          ))}
        </div>

        <button onClick={finalizar} disabled={salvando || carrinho.length === 0} className="w-full p-5 bg-stone-950 text-white text-[11px] rounded-lg shadow-xl hover:bg-stone-800 transition-all active:scale-95 disabled:opacity-50 uppercase font-normal">
          {salvando ? 'PROCESSANDO...' : 'CONFIRMAR VENDA'}
        </button>
      </div>
    </div>
  )
}