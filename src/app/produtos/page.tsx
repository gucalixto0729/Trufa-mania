'use client'

export const dynamic = 'force-dynamic'

import { supabase } from '../../lib/supabase'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

type ProdutoRow = {
  id: string
  nome: string
  preco_custo: number
  preco_venda: number
  estoque: number
  categoria: string
  localizacao: string
  categoria_pai: string
}

const PRODUTOS_BASE = ['Bolos', 'Pao de Mel', 'Trufas']

export default function Produtos() {
  const [linhas, setLinhas] = useState<ProdutoRow[]>([])
  const [salvando, setSalvando] = useState(false)

  const [produtoAberto, setProdutoAberto] = useState<string | null>(null)
  const [acaoModal, setAcaoModal] = useState<'adicionar' | 'editar' | 'retirar' | 'confirmar_exclusao' | null>(null)
  const [linhaAlvo, setLinhaAlvo] = useState<ProdutoRow | null>(null)

  const [produtoSelecionado, setProdutoSelecionado] = useState('')
  const [novoProdutoNome, setNovoProdutoNome] = useState('')
  const [saborNome, setSaborNome] = useState('')
  const [custoInput, setCustoInput] = useState('0,00')
  const [vendaInput, setVendaInput] = useState('0,00')
  const [quantidade, setQuantidade] = useState<number>(0)

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0)

  const normalizarMoedaCampo = (valorDigitado: string) => {
    const digitos = valorDigitado.replace(/\D/g, '')
    const valor = Number(digitos || '0') / 100
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const parseMoedaCampo = (valorFormatado: string) => {
    const normalizado = valorFormatado.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
    const numero = Number(normalizado)
    return Number.isFinite(numero) ? numero : 0
  }

  async function carregarLinhas() {
    const { data, error } = await supabase.from('produtos').select('*').order('categoria_pai').order('nome')
    if (error) {
      toast.error('Erro ao carregar estoque.')
      return
    }
    if (data) setLinhas(data as ProdutoRow[])
  }

  useEffect(() => {
    carregarLinhas()
  }, [])

  const produtosDisponiveis = useMemo(() => {
    const dinamicos = linhas.map((l) => (l.categoria_pai || '').trim()).filter(Boolean)
    return Array.from(new Set([...PRODUTOS_BASE, ...dinamicos])).sort((a, b) => a.localeCompare(b))
  }, [linhas])

  const perfisProduto = useMemo(() => {
    return produtosDisponiveis.map((produto) => {
      const sabores = linhas.filter((l) => l.categoria_pai === produto)
      const total = sabores.reduce((acc, curr) => acc + Number(curr.estoque || 0), 0)
      return { produto, total, sabores }
    })
  }, [linhas, produtosDisponiveis])

  function abrirAdicionar(produtoPadrao: string) {
    setAcaoModal('adicionar')
    setProdutoSelecionado(produtoPadrao)
    setNovoProdutoNome('')
    setSaborNome('')
    setCustoInput('0,00')
    setVendaInput('0,00')
    setQuantidade(0)
  }

  function abrirEditar(linha: ProdutoRow) {
    setLinhaAlvo(linha)
    setAcaoModal('editar')
    setProdutoSelecionado(linha.categoria_pai)
    setNovoProdutoNome('')
    setSaborNome(linha.nome)
    setCustoInput(normalizarMoedaCampo(String(Number(linha.preco_custo || 0).toFixed(2))))
    setVendaInput(normalizarMoedaCampo(String(Number(linha.preco_venda || 0).toFixed(2))))
    setQuantidade(Number(linha.estoque || 0))
  }

  function abrirRetirada(linha: ProdutoRow) {
    setLinhaAlvo(linha)
    setAcaoModal('retirar')
    setQuantidade(0)
  }

  function abrirExclusao(linha: ProdutoRow) {
    setLinhaAlvo(linha)
    setAcaoModal('confirmar_exclusao')
  }

  function fecharModal() {
    setAcaoModal(null)
    setLinhaAlvo(null)
    setProdutoSelecionado('')
    setNovoProdutoNome('')
    setSaborNome('')
    setCustoInput('0,00')
    setVendaInput('0,00')
    setQuantidade(0)
  }

  function resolverProdutoFinal() {
    const produtoFinal = (produtoSelecionado === '__novo__' ? novoProdutoNome : produtoSelecionado).trim()
    return produtoFinal
  }

  async function salvarNovaLinha() {
    const produtoFinal = resolverProdutoFinal()
    const saborFinal = saborNome.trim().toUpperCase()
    const custoValor = parseMoedaCampo(custoInput)
    const vendaValor = parseMoedaCampo(vendaInput)

    if (!produtoFinal) return toast.error('Informe o nome do produto.')
    if (!saborFinal) return toast.error('Informe o sabor.')
    if (quantidade <= 0) return toast.error('Informe uma quantidade valida.')

    setSalvando(true)
    try {
      const { data: existente } = await supabase
        .from('produtos')
        .select('*')
        .eq('categoria_pai', produtoFinal)
        .eq('nome', saborFinal)
        .maybeSingle()

      if (existente) {
        const { error: erroUpdate } = await supabase
          .from('produtos')
          .update({
            estoque: Number(existente.estoque || 0) + quantidade,
            preco_custo: custoValor || existente.preco_custo,
            preco_venda: vendaValor || existente.preco_venda,
          })
          .eq('id', existente.id)

        if (erroUpdate) throw erroUpdate
        toast.success('Sabor atualizado no estoque.')
      } else {
        const { error: erroInsert } = await supabase.from('produtos').insert([
          {
            nome: saborFinal,
            categoria_pai: produtoFinal,
            categoria: 'comida',
            localizacao: 'Estoque',
            estoque: quantidade,
            preco_custo: custoValor,
            preco_venda: vendaValor,
          },
        ])

        if (erroInsert) throw erroInsert
        toast.success('Sabor cadastrado no estoque.')
      }

      await carregarLinhas()
      setProdutoAberto(produtoFinal)
      fecharModal()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar item.')
    } finally {
      setSalvando(false)
    }
  }

  async function editarLinha() {
    if (!linhaAlvo) return

    const produtoFinal = resolverProdutoFinal()
    const saborFinal = saborNome.trim().toUpperCase()
    const custoValor = parseMoedaCampo(custoInput)
    const vendaValor = parseMoedaCampo(vendaInput)

    if (!produtoFinal) return toast.error('Informe o nome do produto.')
    if (!saborFinal) return toast.error('Informe o sabor.')
    if (quantidade < 0) return toast.error('Estoque nao pode ser negativo.')

    setSalvando(true)
    try {
      const { error } = await supabase
        .from('produtos')
        .update({
          categoria_pai: produtoFinal,
          nome: saborFinal,
          estoque: quantidade,
          preco_custo: custoValor,
          preco_venda: vendaValor,
          localizacao: 'Estoque',
        })
        .eq('id', linhaAlvo.id)

      if (error) throw error

      toast.success('Item atualizado.')
      await carregarLinhas()
      setProdutoAberto(produtoFinal)
      fecharModal()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar item.')
    } finally {
      setSalvando(false)
    }
  }

  async function retirarEstoque() {
    if (!linhaAlvo) return
    if (quantidade <= 0 || quantidade > linhaAlvo.estoque) return toast.error('Quantidade invalida.')

    setSalvando(true)
    try {
      const { error } = await supabase
        .from('produtos')
        .update({ estoque: Number(linhaAlvo.estoque || 0) - quantidade })
        .eq('id', linhaAlvo.id)

      if (error) throw error

      toast.success('Retirada concluida.')
      await carregarLinhas()
      setProdutoAberto(linhaAlvo.categoria_pai)
      fecharModal()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao retirar do estoque.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluirLinha() {
    if (!linhaAlvo) return

    setSalvando(true)
    try {
      const { error } = await supabase.from('produtos').delete().eq('id', linhaAlvo.id)
      if (error) throw error

      toast.success('Sabor removido.')
      await carregarLinhas()
      setProdutoAberto(linhaAlvo.categoria_pai)
      fecharModal()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir item.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 p-6 pb-24 text-stone-900">
      <div className="mx-auto max-w-md">
        <header className="mb-8 text-center">
          <h1 className="text-xl uppercase tracking-tight text-stone-900">Estoque</h1>
          <p className="text-[10px] uppercase tracking-widest text-stone-500">Produto e Sabores</p>
        </header>

        <div className="mb-6">
          <button
            onClick={() => abrirAdicionar(produtosDisponiveis[0] || 'Trufas')}
            className="w-full rounded-xl border border-stone-200 bg-white py-3 text-[10px] uppercase tracking-widest text-stone-600 shadow-sm hover:bg-stone-50"
          >
            + Adicionar novo item ao estoque
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {perfisProduto.map(({ produto, total }) => (
            <div key={produto} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <div>
                <h3 className="text-sm uppercase tracking-tight text-stone-900">{produto}</h3>
                <p className="mt-1 text-[10px] uppercase text-stone-500">Total: {total} un.</p>
              </div>
              <button
                onClick={() => setProdutoAberto(produto)}
                className="rounded-lg bg-stone-950 px-5 py-2.5 text-[9px] uppercase text-white shadow-sm"
              >
                Gerenciar
              </button>
            </div>
          ))}
        </div>

        {produtoAberto && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/40 p-6 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <header className="mb-5 border-b pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm uppercase text-stone-900">{produtoAberto}</h2>
                    <p className="mt-1 text-[10px] uppercase text-stone-500">
                      Total em estoque:{' '}
                      {
                        perfisProduto.find((p) => p.produto === produtoAberto)?.total || 0
                      }{' '}
                      un.
                    </p>
                  </div>
                  <button onClick={() => setProdutoAberto(null)} className="text-[10px] uppercase text-stone-400">
                    Fechar
                  </button>
                </div>
              </header>

              <div className="mb-5 max-h-[45vh] space-y-2 overflow-y-auto pr-1">
                {perfisProduto
                  .find((p) => p.produto === produtoAberto)
                  ?.sabores.map((linha) => (
                    <div key={linha.id} className="rounded-xl border border-stone-100 bg-stone-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase text-stone-900">Sabor: {linha.nome}</p>
                          <p className="mt-1 text-[9px] uppercase text-stone-400">
                            {linha.estoque} un. | Custo {formatarMoeda(linha.preco_custo)} | Venda {formatarMoeda(linha.preco_venda)}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => abrirEditar(linha)} className="rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[8px] uppercase text-amber-700">Editar</button>
                          <button onClick={() => abrirRetirada(linha)} className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-[8px] uppercase text-red-500">Retirar</button>
                          <button onClick={() => abrirExclusao(linha)} className="px-2 text-[10px] text-stone-300 hover:text-red-600">X</button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              <button
                onClick={() => abrirAdicionar(produtoAberto)}
                className="w-full rounded-2xl border-2 border-dashed border-stone-200 py-4 text-[10px] uppercase text-stone-400 transition-all hover:border-stone-400"
              >
                + Adicionar sabor neste produto
              </button>
            </div>
          </div>
        )}

        {acaoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-6 backdrop-blur-md">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
              {acaoModal === 'confirmar_exclusao' ? (
                <div className="text-center">
                  <h3 className="mb-2 text-sm uppercase text-stone-900">Excluir sabor?</h3>
                  <p className="mb-6 text-[10px] uppercase tracking-widest text-stone-400">
                    Remover {linhaAlvo?.nome} permanentemente.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={fecharModal} className="flex-1 rounded-xl bg-stone-100 py-3 text-[10px] uppercase text-stone-400">Cancelar</button>
                    <button onClick={excluirLinha} disabled={salvando} className="flex-1 rounded-xl bg-red-600 py-3 text-[10px] uppercase text-white">Confirmar</button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="mb-5 text-center text-sm uppercase text-stone-900">
                    {acaoModal === 'adicionar' ? 'Adicionar item' : acaoModal === 'editar' ? 'Editar item' : 'Retirada'}
                  </h3>

                  {(acaoModal === 'adicionar' || acaoModal === 'editar') && (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-[10px] uppercase text-stone-400">Produto</label>
                        <select
                          value={produtoSelecionado}
                          onChange={(e) => setProdutoSelecionado(e.target.value)}
                          className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs uppercase outline-none"
                        >
                          <option value="">Selecione o produto...</option>
                          {produtosDisponiveis.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                          <option value="__novo__">Novo produto</option>
                        </select>
                      </div>

                      {produtoSelecionado === '__novo__' && (
                        <div>
                          <label className="mb-1 block text-[10px] uppercase text-stone-400">Novo produto</label>
                          <input
                            type="text"
                            value={novoProdutoNome}
                            onChange={(e) => setNovoProdutoNome(e.target.value)}
                            placeholder="Nome do produto"
                            className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs uppercase outline-none"
                          />
                        </div>
                      )}

                      <div>
                        <label className="mb-1 block text-[10px] uppercase text-stone-400">Sabor</label>
                        <input
                          type="text"
                          value={saborNome}
                          onChange={(e) => setSaborNome(e.target.value)}
                          placeholder="Ex: Chocolate"
                          className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs uppercase outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[10px] uppercase text-stone-400">Custo</label>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">R$</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={custoInput}
                              onChange={(e) => setCustoInput(normalizarMoedaCampo(e.target.value))}
                              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-3 pl-9 pr-3 text-xs outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] uppercase text-stone-400">Venda</label>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">R$</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={vendaInput}
                              onChange={(e) => setVendaInput(normalizarMoedaCampo(e.target.value))}
                              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-3 pl-9 pr-3 text-xs outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4">
                    <label className="mb-1 block text-[10px] uppercase text-stone-400">
                      {acaoModal === 'editar' ? 'Estoque atual' : acaoModal === 'retirar' ? 'Quantidade para retirada' : 'Quantidade de entrada'}
                    </label>
                    <input
                      type="number"
                      value={quantidade || ''}
                      onChange={(e) => setQuantidade(Number(e.target.value))}
                      className="w-full rounded-2xl border-2 border-stone-100 bg-stone-50 py-4 text-center text-xl outline-none focus:border-stone-950"
                    />
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button onClick={fecharModal} className="flex-1 rounded-xl bg-stone-100 py-3 text-[10px] uppercase text-stone-400">Cancelar</button>
                    <button
                      onClick={acaoModal === 'adicionar' ? salvarNovaLinha : acaoModal === 'editar' ? editarLinha : retirarEstoque}
                      disabled={salvando}
                      className={`flex-1 rounded-xl py-3 text-[10px] uppercase text-white ${acaoModal === 'retirar' ? 'bg-red-600' : 'bg-stone-950'}`}
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
