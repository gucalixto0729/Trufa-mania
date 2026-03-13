'use client'

export const dynamic = 'force-dynamic'

import { supabase } from '../../lib/supabase'
import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'

type Produto = {
  id: string
  nome: string
  preco_custo: number
  preco_venda: number
  estoque: number
  categoria: string
  localizacao: 'Geladeira' | 'Armário'
  categoria_pai: string
}

const CATEGORIAS_FIXAS = ['Trufas', 'Bolos', 'Pão de Mel']

const SABORES_POR_GRUPO: Record<string, string[]> = {
  'Trufas': ['CHOCOLATE', 'BRIGADEIRO', 'MORANGO', 'PISTACHE', 'CAFÉ'],
  'Bolos': ['CHOCOLATE', 'CENOURA', 'COCO', 'FUBÁ', 'BRIGADEIRO'],
  'Pão de Mel': ['CHOCOLATE', 'TRADICIONAL', 'COM CALDA']
}

export default function Produtos() {
  const [listaProdutos, setListaProdutos] = useState<Produto[]>([])
  const [salvando, setSalvando] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'Geladeira' | 'Armário'>('Armário')

  const [grupoAberto, setGrupoAberto] = useState<string | null>(null)
  const [tipoModalAcao, setTipoModalAcao] = useState<'transferir' | 'retirar' | 'adicionar' | 'confirmar_exclusao' | null>(null)
  const [produtoAlvo, setProdutoAlvo] = useState<Produto | null>(null)
  
  const [nomeSabor, setNomeSabor] = useState('')
  const [custo, setCusto] = useState<number>(0)
  const [venda, setVenda] = useState<number>(0)
  const [quantidade, setQuantidade] = useState<number>(0)

  async function carregarProdutos() {
    const { data } = await supabase.from('produtos').select('*').order('nome')
    if (data) setListaProdutos(data as Produto[])
  }

  useEffect(() => { carregarProdutos() }, [])

  const estoqueAgrupado = useMemo(() => {
    return CATEGORIAS_FIXAS.map(grupo => {
      const itens = listaProdutos.filter(p => p.categoria_pai === grupo && p.localizacao === abaAtiva)
      const total = itens.reduce((acc, curr) => acc + curr.estoque, 0)
      return { grupo, total, itens }
    })
  }, [listaProdutos, abaAtiva])

  async function executarTransferencia() {
    if (!produtoAlvo || quantidade <= 0 || quantidade > produtoAlvo.estoque) {
      return toast.error('Quantidade disponível insuficiente.')
    }

    setSalvando(true)
    try {
      await supabase.from('produtos')
        .update({ estoque: produtoAlvo.estoque - quantidade })
        .eq('id', produtoAlvo.id)

      const { data: existente } = await supabase.from('produtos')
        .select('*')
        .eq('nome', produtoAlvo.nome)
        .eq('localizacao', 'Geladeira')
        .maybeSingle()

      if (existente) {
        await supabase.from('produtos')
          .update({ estoque: existente.estoque + quantidade })
          .eq('id', existente.id)
      } else {
        const { id, ...dadosCopia } = produtoAlvo
        await supabase.from('produtos').insert([{
          ...dadosCopia,
          localizacao: 'Geladeira',
          estoque: quantidade
        }])
      }

      toast.success('Item movido para a geladeira.')
      fecharModais()
    } catch (err) {
      toast.error('Erro ao realizar transferência.')
    } finally {
      setSalvando(false)
    }
  }

  async function executarRetirada() {
    if (!produtoAlvo || quantidade <= 0 || quantidade > produtoAlvo.estoque) {
      return toast.error('Quantidade inválida.')
    }
    try {
      await supabase.from('produtos')
        .update({ estoque: produtoAlvo.estoque - quantidade })
        .eq('id', produtoAlvo.id)
      toast.success('Retirada concluída.')
      fecharModais()
    } catch (err) { toast.error('Erro ao retirar.') }
  }

  async function salvarProduto() {
    if (!nomeSabor || !grupoAberto) return toast.error('Selecione um sabor.')
    setSalvando(true)
    try {
      const { data: existente } = await supabase.from('produtos')
        .select('*')
        .eq('nome', nomeSabor)
        .eq('categoria_pai', grupoAberto)
        .eq('localizacao', abaAtiva)
        .maybeSingle()

      if (existente) {
        await supabase.from('produtos').update({
          estoque: existente.estoque + quantidade,
          preco_custo: custo || existente.preco_custo,
          preco_venda: venda || existente.preco_venda
        }).eq('id', existente.id)
        toast.success('Estoque atualizado.')
      } else {
        await supabase.from('produtos').insert([{
          nome: nomeSabor,
          categoria_pai: grupoAberto,
          localizacao: abaAtiva,
          estoque: quantidade,
          preco_custo: custo,
          preco_venda: venda,
          categoria: 'comida'
        }])
        toast.success('Sabor registrado.')
      }
      fecharModais()
    } catch (err) { toast.error('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  async function excluirTotal() {
    if (!produtoAlvo) return
    const { error } = await supabase.from('produtos').delete().eq('id', produtoAlvo.id)
    if (!error) { toast.success('Removido.'); fecharModais(); }
  }

  function fecharModais() {
    setTipoModalAcao(null); setProdutoAlvo(null); setQuantidade(0); 
    setNomeSabor(''); setCusto(0); setVenda(0); carregarProdutos();
  }

  // Estilização dinâmica baseada no tema
const containerStyle = abaAtiva === 'Armário' 
  ? { 
      backgroundColor: "#4a3728", 
      backgroundImage: "url('https://www.transparenttextures.com/patterns/dark-wood.png')" 
    }
  : { 
      backgroundColor: "#b3e5fc", 
      backgroundImage: "url('https://www.transparenttextures.com/patterns/iced-4.png')" 
    };

  return (
  <div className="min-h-screen p-6 pb-24 text-stone-900 font-sans transition-all duration-500" style={containerStyle}>
    <div className="mx-auto max-w-md">
      <header className="mb-8 text-center font-normal">
        <h1 className={`text-xl uppercase tracking-tight ${abaAtiva === 'Armário' ? 'text-stone-100' : 'text-stone-900'}`}>Estoque</h1>
        <p className={`text-[10px] uppercase tracking-widest ${abaAtiva === 'Armário' ? 'text-stone-400' : 'text-stone-600'}`}>
          {abaAtiva === 'Armário' ? 'Ambiente de Madeira' : 'Ambiente Refrigerado'}
        </p>
      </header>

        <div className="mb-8 flex gap-4 border-b border-stone-900/10 pb-1 font-normal">
        {['Armário', 'Geladeira'].map(loc => (
          <button 
            key={loc} 
            onClick={() => setAbaAtiva(loc as any)} 
            className={`pb-3 text-[10px] uppercase tracking-widest transition-all ${
              abaAtiva === loc 
                ? (abaAtiva === 'Armário' ? 'border-b-2 border-stone-100 text-stone-100' : 'border-b-2 border-stone-900 text-stone-900') 
                : (abaAtiva === 'Armário' ? 'text-stone-500' : 'text-stone-400')
            }`}
          >
            {loc}
          </button>
        ))}
      </div>

        <div className="grid grid-cols-1 gap-4">
        {estoqueAgrupado.map(({ grupo, total }) => (
          <div key={grupo} className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-sm flex items-center justify-between font-normal">
            <div>
              <h3 className="text-sm uppercase text-stone-900 tracking-tight">{grupo}</h3>
              <p className="text-[10px] text-stone-500 uppercase mt-1">Total: {total} un.</p>
            </div>
            <button onClick={() => setGrupoAberto(grupo)} className="bg-stone-950 text-white text-[9px] uppercase px-5 py-2.5 rounded-lg shadow-sm">Gerenciar</button>
          </div>
        ))}
      </div>

        {grupoAberto && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/40 backdrop-blur-sm p-6 animate-in fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
              <header className="mb-6 flex justify-between items-center border-b pb-3 text-stone-900 uppercase text-sm font-normal">
                <span>{grupoAberto}</span>
                <button onClick={() => setGrupoAberto(null)} className="text-stone-400 text-[10px] font-normal uppercase">Fechar</button>
              </header>

              <div className="space-y-2 max-h-[45vh] overflow-y-auto mb-6 pr-1">
                {estoqueAgrupado.find(g => g.grupo === grupoAberto)?.itens.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100 group">
                    <div className="flex-1">
                      <p className="text-[11px] uppercase text-stone-900 font-normal">{p.nome}</p>
                      <p className="text-[9px] text-stone-400 uppercase font-normal">{p.estoque} un. | R$ {p.preco_venda.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-1.5 font-normal">
                      {abaAtiva === 'Armário' && p.estoque > 0 && (
                        <button onClick={() => { setProdutoAlvo(p); setTipoModalAcao('transferir') }} className="text-[8px] uppercase text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 font-normal">Mover</button>
                      )}
                      <button onClick={() => { setProdutoAlvo(p); setTipoModalAcao('retirar') }} className="text-[8px] uppercase text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100 font-normal">Retirar</button>
                      <button onClick={() => { setProdutoAlvo(p); setTipoModalAcao('confirmar_exclusao') }} className="text-[10px] text-stone-300 hover:text-red-600 px-2 font-normal transition-colors">✕</button>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => setTipoModalAcao('adicionar')} className="w-full py-4 border-2 border-dashed border-stone-200 rounded-2xl text-[10px] uppercase text-stone-400 hover:border-stone-400 transition-all font-normal">+ Reposição ou Novo Sabor</button>
            </div>
          </div>
        )}

        {tipoModalAcao && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-6 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-xs rounded-3xl bg-white p-7 shadow-2xl animate-in zoom-in-95">
              
              {tipoModalAcao === 'confirmar_exclusao' ? (
                <div className="text-center font-normal">
                  <h3 className="text-sm uppercase text-stone-900 mb-2 font-normal">Excluir Registro?</h3>
                  <p className="text-[10px] text-stone-400 uppercase tracking-widest leading-relaxed mb-6 px-4 font-normal">Remover {produtoAlvo?.nome} permanentemente da lista.</p>
                  <div className="flex gap-2 font-normal">
                    <button onClick={() => setTipoModalAcao(null)} className="flex-1 rounded-xl bg-stone-100 py-3 text-[10px] uppercase text-stone-400 font-normal">Cancelar</button>
                    <button onClick={excluirTotal} className="flex-1 rounded-xl bg-red-600 py-3 text-[10px] uppercase text-white shadow-lg font-normal">Confirmar</button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-sm uppercase text-stone-900 text-center mb-6 font-normal">
                    {tipoModalAcao === 'adicionar' ? `Reposição ${grupoAberto}` : tipoModalAcao === 'transferir' ? 'Mover para Geladeira' : 'Retirada'}
                  </h3>
                  
                  <div className="space-y-3 mb-6 font-normal">
                    {tipoModalAcao === 'adicionar' && (
                      <>
                        <select value={nomeSabor} onChange={e => setNomeSabor(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs uppercase outline-none appearance-none font-normal">
                          <option value="">Selecione o sabor...</option>
                          {SABORES_POR_GRUPO[grupoAberto || '']?.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <div className="grid grid-cols-2 gap-2 font-normal">
                          <input type="number" placeholder="Custo" onChange={e => setCusto(Number(e.target.value))} className="rounded-xl border border-stone-200 p-4 text-xs font-bold outline-none font-normal" />
                          <input type="number" placeholder="Venda" onChange={e => setVenda(Number(e.target.value))} className="rounded-xl border border-stone-200 p-4 text-xs font-bold outline-none font-normal" />
                        </div>
                      </>
                    )}
                    <input type="number" value={quantidade || ''} onChange={e => setQuantidade(Number(e.target.value))} className="w-full rounded-2xl border-2 border-stone-100 bg-stone-50 py-5 text-center text-xl outline-none focus:border-stone-950 font-normal" />
                  </div>

                  <div className="flex gap-2 font-normal">
                    <button onClick={() => setTipoModalAcao(null)} className="flex-1 rounded-xl bg-stone-100 py-4 text-[10px] uppercase text-stone-400 font-normal">Cancelar</button>
                    <button 
                      onClick={tipoModalAcao === 'transferir' ? executarTransferencia : tipoModalAcao === 'adicionar' ? salvarProduto : executarRetirada} 
                      disabled={salvando}
                      className={`flex-1 rounded-xl py-4 text-[10px] uppercase text-white shadow-lg font-normal ${tipoModalAcao === 'transferir' ? 'bg-blue-600' : tipoModalAcao === 'adicionar' ? 'bg-stone-950' : 'bg-red-600'}`}
                    >
                      {salvando ? '...' : 'Confirmar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}