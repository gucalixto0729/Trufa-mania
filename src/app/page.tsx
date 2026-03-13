import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function Home() {
  const menus = [
    { name: 'PDV / Vendas', href: '/vendas', desc: 'Realizar novas vendas', color: 'bg-amber-500' },
    { name: 'Cobranças', href: '/cobrancas', desc: 'Lista de fiados e Zap', color: 'bg-red-500' },
    { name: 'Estoque', href: '/produtos', desc: 'Cadastrar novos lanches', color: 'bg-stone-800' },
    { name: 'Clientes', href: '/clientes', desc: 'Cadastro de clientes', color: 'bg-stone-800' },
    { name: 'Análise', href: '/analise', desc: 'Lucros e mais vendidos', color: 'bg-green-600' },
  ]

  return (
    <div className="min-h-screen bg-stone-100 p-6 pb-24">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 mt-4 text-center">
          <h1 className="text-2xl font-black text-stone-800 tracking-tighter">TRUFAS MANIA</h1>
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mt-1">Gerenciamento de Vendas</p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {menus.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col justify-between rounded-3xl bg-white p-6 shadow-sm border border-stone-200 transition-all active:scale-[0.98] hover:shadow-md"
            >
              <div>
                <div className={`mb-4 h-2 w-12 rounded-full ${item.color}`} />
                <h2 className="text-lg font-black text-stone-800 group-hover:text-amber-600 transition-colors">
                  {item.name}
                </h2>
                <p className="text-sm text-stone-400 font-medium">{item.desc}</p>
              </div>
              <div className="mt-4 flex justify-end">
                <span className="text-xs font-black uppercase tracking-widest text-stone-300">Acessar →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}