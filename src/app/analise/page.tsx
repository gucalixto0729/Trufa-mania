'use client'

import { supabase } from '../../lib/supabase'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis
} from 'recharts'

type Periodo = 'hoje' | 'mes'
const CATEGORIAS_FILTRO = ['Trufas', 'Bolos', 'Pão de Mel']

type Venda = { id: string; valor_total: number; pago: boolean; data_venda?: string }
type ItemVenda = { venda_id: string; produto_id: string; quantidade: number; preco_unitario: number; custo_produto?: number; categoria_pai?: string; nome_produto?: string }
type Baixa = { id: string; custo_total: number; data_baixa: string }
type Produto = { id: string; nome: string; preco_custo: number; preco_venda: number; estoque: number; categoria_pai: string }

export default function Analise() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([])
  const [baixas, setBaixas] = useState<Baixa[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [categoriaInspecionar, setCategoriaInspecionar] = useState('Trufas')
  const [carregando, setCarregando] = useState(true)

  function nomeComboPorProdutoId(produtoId?: string) {
    if (!produtoId || !produtoId.startsWith('combo-')) return null
    const codigo = produtoId.split('-')[1]
    if (codigo === 'G') return 'Combo G'
    if (codigo === 'E') return 'Combo E'
    if (codigo === 'GB') return 'Combo GB'
    if (codigo === 'EB') return 'Combo EB'
    return 'Combo Promocional'
  }

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      try {
        const [resVendas, resItens, resProdutos, resBaixas] = await Promise.all([
          supabase.from('vendas').select('id, valor_total, pago, data_venda'),
          supabase.from('itens_venda').select('venda_id, produto_id, quantidade, preco_unitario, produtos(nome, preco_custo, categoria_pai)'),
          supabase.from('produtos').select('*'),
          supabase.from('baixas').select('id, custo_total, data_baixa')
        ])

        const itensFormatados = (resItens.data || []).map(item => {
          const pInfo = Array.isArray((item as any).produtos) ? (item as any).produtos[0] : (item as any).produtos
          const nomeCombo = nomeComboPorProdutoId(String(item.produto_id || ''))
          const nomeFallback = nomeCombo || 'Produto'
          return {
            ...item,
            nome_produto: pInfo?.nome || nomeFallback,
            custo_produto: pInfo?.preco_custo || 0,
            categoria_pai: pInfo?.categoria_pai || (String(item.produto_id || '').startsWith('combo-') ? 'Combos' : 'Outros')
          }
        })
        
        setVendas(resVendas.data || [])
        setProdutos(resProdutos.data || [])
        setBaixas(resBaixas.data || [])
        setItensVenda(itensFormatados)
      } catch (err) { toast.error('Erro ao carregar dados.') } 
      finally { setCarregando(false) }
    }
    carregar()
  }, [])

  const stats = useMemo(() => {
    const hoje = new Date()
    const mesAtual = hoje.getMonth()
    const anoAtual = hoje.getFullYear()

    const filtrarPorData = (d?: string) => {
      if (!d) return false
      const dv = new Date(d)
      return periodo === 'hoje'
        ? dv.toDateString() === hoje.toDateString()
        : dv.getMonth() === mesAtual && dv.getFullYear() === anoAtual
    }

    const vendasF = vendas.filter(v => filtrarPorData(v.data_venda))
    const baixasF = baixas.filter(b => filtrarPorData(b.data_baixa))
    const bruto = vendasF.reduce((s, v) => s + Number(v.valor_total), 0)
    const perdas = baixasF.reduce((s, b) => s + Number(b.custo_total), 0)
    
    const idsF = new Set(vendasF.map(v => v.id))
    const itensF = itensVenda.filter(i => idsF.has(i.venda_id))
    const vendasMes = vendas.filter(v => {
      if (!v.data_venda) return false
      const dv = new Date(v.data_venda)
      return dv.getMonth() === mesAtual && dv.getFullYear() === anoAtual
    })
    const idsMes = new Set(vendasMes.map(v => v.id))
    const itensMes = itensVenda.filter(i => idsMes.has(i.venda_id))

    const somaItensPorVenda = new Map<string, number>()
    itensF.forEach(i => {
      const somaAtual = somaItensPorVenda.get(i.venda_id) || 0
      const subtotalItem = (Number(i.quantidade) || 0) * (Number(i.preco_unitario) || 0)
      somaItensPorVenda.set(i.venda_id, somaAtual + subtotalItem)
    })

    const ajusteNaoDiscriminado = vendasF.reduce((s, v) => {
      const somaItensVenda = somaItensPorVenda.get(v.id) || 0
      const diff = Number(v.valor_total) - somaItensVenda
      return s + (Math.abs(diff) >= 0.01 ? diff : 0)
    }, 0)
    
    const lucroVendas = itensF.reduce((s, i) => s + (Number(i.quantidade) * (Number(i.preco_unitario) - Number(i.custo_produto))), 0) + ajusteNaoDiscriminado

    // Dados Gráfico de Linha
    const dias = vendasF.reduce((acc: Record<string, number>, v) => {
      const dia = new Date(v.data_venda!).toLocaleDateString('pt-BR', { day: '2-digit' })
      acc[dia] = (acc[dia] || 0) + Number(v.valor_total)
      return acc
    }, {})
    const dataLinha = Object.entries(dias)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => Number(a.name) - Number(b.name))

    // Dados Gráfico de Teia (Sabores da Categoria Selecionada)
    const saboresMap = new Map<string, number>()
    itensF.filter(i => i.categoria_pai === categoriaInspecionar).forEach(i => {
      const nome = (i as any).nome_produto
      saboresMap.set(nome, (saboresMap.get(nome) || 0) + Number(i.quantidade))
    })
    
    const rankSabores = Array.from(saboresMap.entries())
      .map(([subject, A]) => ({ subject, A }))
      .sort((a, b) => b.A - a.A)
      .slice(0, 6)

    const rankingMap = new Map<string, number>()
    itensMes.forEach(i => {
      const nome = i.nome_produto || 'Produto'
      rankingMap.set(nome, (rankingMap.get(nome) || 0) + Number(i.quantidade || 0))
    })

    const rankProdutosMes = Array.from(rankingMap.entries())
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10)

    const invest = produtos.reduce((s, p) => s + (Number(p.estoque) * Number(p.preco_custo)), 0)
    const fiado = vendasF.filter(v => !v.pago).reduce((s, v) => s + Number(v.valor_total), 0)

    return { bruto, liquido: lucroVendas - perdas, perdas, invest, fiado, dataLinha, rankSabores, rankProdutosMes }
  }, [vendas, itensVenda, produtos, baixas, periodo, categoriaInspecionar])

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-24 text-stone-900 font-sans uppercase tracking-tight">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <h1 className="text-xl text-stone-950 font-normal">Performance de Vendas</h1>
          <p className="text-[10px] text-stone-400 font-normal">Inteligência de Gôndola</p>
        </header>

        <div className="mb-8 flex gap-2 bg-white p-1 rounded-lg border border-stone-200">
          {['hoje', 'mes'].map(p => (
            <button key={p} onClick={() => setPeriodo(p as any)} className={`flex-1 py-2.5 text-[11px] rounded-md transition-all ${periodo === p ? 'bg-stone-950 text-white shadow-sm' : 'text-stone-400'}`}>{p}</button>
          ))}
        </div>

        {!carregando && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card title="Receita Bruta" value={stats.bruto} color="text-stone-950" />
              <Card title="Baixas" value={stats.perdas} color="text-red-500" />
              <Card title="Lucro Líquido" value={stats.liquido} color="text-emerald-500" />
            </div>

            {/* Gráfico de Linha */}
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <h2 className="text-[9px] text-stone-400 mb-6 tracking-widest">Vendas por Dia (R$)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.dataLinha}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#0c0a09" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico de Teia com Dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-[9px] text-stone-400 tracking-widest">Mix de Sabores</h2>
                  <select 
                    value={categoriaInspecionar} 
                    onChange={e => setCategoriaInspecionar(e.target.value)}
                    className="text-[10px] bg-stone-50 border-none outline-none font-normal"
                  >
                    {CATEGORIAS_FILTRO.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.rankSabores}>
                      <PolarGrid stroke="#f5f5f5" />
                      <PolarAngleAxis dataKey="subject" fontSize={8} />
                      <Radar name="Qtd" dataKey="A" stroke="#0c0a09" fill="#0c0a09" fillOpacity={0.1} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-stone-950 p-6 rounded-xl text-white shadow-lg flex flex-col justify-center">
                <p className="text-[9px] text-stone-500 mb-1 tracking-widest">Patrimônio</p>
                <p className="text-3xl font-light tracking-tighter mb-6">R$ {stats.invest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-[9px] text-red-400 mb-1 tracking-widest">Fiado Pendente</p>
                <p className="text-3xl font-light tracking-tighter text-red-400 italic">R$ {stats.fiado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <h2 className="text-[9px] text-stone-400 mb-4 tracking-widest">Ranking de Produtos Mais Vendidos no Mês</h2>
              {stats.rankProdutosMes.length === 0 ? (
                <p className="text-xs text-stone-400">Sem vendas no mês atual.</p>
              ) : (
                <div className="space-y-2">
                  {stats.rankProdutosMes.map((item, idx) => (
                    <div key={`${item.nome}-${idx}`} className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-xs">
                      <span className="text-stone-900">{idx + 1}. {item.nome}</span>
                      <span className="text-stone-500">{item.quantidade} un.</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
      <p className="text-[9px] text-stone-400 mb-2 tracking-widest">{title}</p>
      <p className={`text-lg font-normal tracking-tight ${color}`}>R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
    </div>
  )
}