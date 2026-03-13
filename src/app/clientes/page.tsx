'use client'

export const dynamic = 'force-dynamic'

import { supabase } from '../../lib/supabase'
import { useState, useEffect } from 'react'
import { toast } from 'sonner' 

type TipoCliente = 'militar' | 'civil' | null

const OPCOES_POSTO = ['EV', 'EP', 'Cb', 'Sgt', 'Ten', 'Cap']
const OPCOES_CIA = ['1ª Cia', '2ª Cia', 'CCSV', 'Base', 'DE']

export default function Clientes() {
  const [tipo, setTipo] = useState<TipoCliente>(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [posto, setPosto] = useState('EV')
  const [companhia, setCompanhia] = useState('1ª Cia')
  const [salvando, setSalvando] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [editando, setEditando] = useState<any | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editTelefone, setEditTelefone] = useState('')

  async function salvar() {
    if (!nome.trim() || !telefone.trim()) {
      toast.error('Preencha os campos obrigatórios.') 
      return
    }

    setSalvando(true)
    
    const dadosParaSalvar = {
      tipo: tipo ?? 'civil',
      nome_completo: nome.trim(),
      telefone: telefone.trim(),
      ...(tipo === 'militar' && { 
        posto_grad: posto,
        companhia: companhia 
      }),
    }

    const { error } = await supabase.from('clientes').insert([dadosParaSalvar])

    setSalvando(false)
    if (error) {
      toast.error('Erro ao salvar no banco.') 
      return
    }

    toast.success('Registro concluído.') 
    setNome(''); setTelefone(''); setPosto('EV'); setCompanhia('1ª Cia'); setTipo(null);
  }

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase.from('clientes').select('*').order('nome_completo')
      if (data) setClientes(data as any[])
    }
    carregar()
  }, [])

  async function abrirEdicao(c: any) {
    setEditando(c)
    setEditNome(c.nome_completo || '')
    setEditTelefone(c.telefone || '')
  }

  async function salvarEdicao() {
    if (!editNome.trim() || !editTelefone.trim()) { toast.error('Preencha os campos.'); return }
    const id = editando?.id
    if (!id) return
    const { error } = await supabase.from('clientes').update({ nome_completo: editNome.trim(), telefone: editTelefone.trim() }).eq('id', id)
    if (error) { toast.error('Erro ao atualizar'); return }
    setClientes(prev => prev.map(p => p.id === id ? { ...p, nome_completo: editNome.trim(), telefone: editTelefone.trim() } : p))
    toast.success('Contato atualizado')
    setEditando(null)
  }

  async function excluirContato(id: string) {
    const ok = confirm('Excluir contato? Esta ação não pode ser desfeita.')
    if (!ok) return
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) { toast.error('Erro ao excluir'); return }
    setClientes(prev => prev.filter(p => p.id !== id))
    toast.success('Contato excluído')
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-20">
      <div className="mx-auto max-w-md rounded-xl bg-white p-8 shadow-sm border border-stone-200/60 ring-1 ring-stone-900/5">
        <header className="mb-8">
          <h1 className="text-xl font-medium tracking-tight text-stone-950 italic">Cadastro de Cliente</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1">Gestão de Identidade</p>
        </header>

        {tipo === null ? (
          <div className="space-y-6">
            <p className="text-sm text-stone-500 font-medium">Selecione o perfil do cliente:</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTipo('militar')}
                className="flex-1 rounded-lg bg-stone-950 py-3.5 text-white text-xs font-semibold tracking-wide shadow-sm hover:bg-stone-800 transition-all"
              >
                Militar
              </button>
              <button
                type="button"
                onClick={() => setTipo('civil')}
                className="flex-1 rounded-lg bg-white border border-stone-200 py-3.5 text-stone-600 text-xs font-semibold tracking-wide hover:bg-stone-50 transition-all"
              >
                Civil
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => { setTipo(null); setNome(''); setTelefone(''); }}
              className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-950 transition-colors"
            >
              ← Alterar Perfil
            </button>

            <div className="space-y-4">
              {tipo === 'militar' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">Patente</label>
                    <select
                      value={posto}
                      onChange={(e) => setPosto(e.target.value)}
                      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400 transition-all appearance-none cursor-pointer"
                    >
                      {OPCOES_POSTO.map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">Subunidade</label>
                    <select
                      value={companhia}
                      onChange={(e) => setCompanhia(e.target.value)}
                      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400 transition-all appearance-none cursor-pointer"
                    >
                      {OPCOES_CIA.map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">Nome Completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder-stone-300 outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-900/5 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">WhatsApp</label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder-stone-300 outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-900/5 transition-all"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="w-full rounded-lg bg-stone-950 py-4 text-white text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-stone-800 disabled:opacity-50 transition-all mt-4 active:scale-[0.98]"
            >
              {salvando ? 'Processando...' : 'Confirmar Cadastro'}
            </button>
          </div>
        )}
      </div>
      {clientes.length > 0 && (
        <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-sm border border-stone-200/60 ring-1 ring-stone-900/5 mt-6">
          <header className="mb-4">
            <h2 className="text-sm font-medium tracking-tight text-stone-900 italic">Contatos Cadastrados</h2>
            <p className="text-[10px] text-stone-400 mt-1">Clique em editar para alterar nome ou telefone</p>
          </header>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {clientes.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100">
                <div>
                  <p className="text-[11px] font-medium">{c.nome_completo}</p>
                  <p className="text-[10px] text-stone-400">{c.telefone || '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => abrirEdicao(c)} className="text-[10px] px-3 py-2 bg-stone-950 text-white rounded-lg">Editar</button>
                  <button onClick={() => excluirContato(c.id)} className="text-[10px] px-3 py-2 bg-white border border-stone-200 text-stone-600 rounded-lg">Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 backdrop-blur-sm p-6">
          <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-2xl">
            <header className="mb-4">
              <h3 className="text-sm text-stone-900">Editar Contato</h3>
            </header>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-stone-400 uppercase mb-1">Nome Completo</label>
                <input value={editNome} onChange={(e) => setEditNome(e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2" />
              </div>
              <div>
                <label className="block text-[10px] text-stone-400 uppercase mb-1">WhatsApp</label>
                <input value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setEditando(null)} className="flex-1 p-3 bg-stone-100 text-stone-500 rounded-xl">Cancelar</button>
              <button onClick={salvarEdicao} className="flex-1 p-3 bg-stone-950 text-white rounded-xl">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}