-- ============================================================================
-- TRUFAS MANIA - Schema de Banco de Dados Supabase
-- ============================================================================
-- Este arquivo contém todas as tabelas e configurações necessárias
-- Execute este SQL no console SQL do Supabase

-- ============================================================================
-- 1. TABELA: CLIENTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo TEXT NOT NULL,
  telefone TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN ('militar', 'civil')),
  -- Campos opcionais para militares
  posto_grad TEXT,
  companhia TEXT,
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome_completo);
CREATE INDEX IF NOT EXISTS idx_clientes_tipo ON clientes(tipo);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);

-- ============================================================================
-- 2. TABELA: PRODUTOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  preco_custo DECIMAL(10, 2) NOT NULL DEFAULT 0,
  preco_venda DECIMAL(10, 2) NOT NULL DEFAULT 0,
  estoque INTEGER NOT NULL DEFAULT 0,
  -- Categorização
  categoria TEXT NOT NULL CHECK (categoria IN ('comida', 'bebida')) DEFAULT 'comida',
  categoria_pai TEXT NOT NULL CHECK (categoria_pai IN ('Trufas', 'Bolos', 'Pão de Mel')),
  -- Localização no estoque
  localizacao TEXT NOT NULL CHECK (localizacao IN ('Geladeira', 'Armário')) DEFAULT 'Armário',
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria_pai ON produtos(categoria_pai);
CREATE INDEX IF NOT EXISTS idx_produtos_localizacao ON produtos(localizacao);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria);

-- ============================================================================
-- 3. TABELA: VENDAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  valor_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  desconto DECIMAL(10, 2) DEFAULT 0,
  pago BOOLEAN NOT NULL DEFAULT FALSE,
  metodo_pagamento TEXT NOT NULL CHECK (metodo_pagamento IN ('FIADO', 'PIX', 'CARTÃO', 'DINHEIRO')),
  data_venda TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data_venda ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_pago ON vendas(pago);
CREATE INDEX IF NOT EXISTS idx_vendas_metodo ON vendas(metodo_pagamento);

-- ============================================================================
-- 4. TABELA: ITENS_VENDA
-- ============================================================================
CREATE TABLE IF NOT EXISTS itens_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario DECIMAL(10, 2) NOT NULL DEFAULT 0,
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON itens_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_produto_id ON itens_venda(produto_id);

-- ============================================================================
-- 5. TABELA: BAIXAS (Perdas/Desperdícios)
-- ============================================================================
CREATE TABLE IF NOT EXISTS baixas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  motivo TEXT NOT NULL CHECK (motivo IN ('Consumo Dono', 'Avaria / Estrago', 'Vencimento', 'Brinde / Cortesia')),
  custo_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  data_baixa TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_baixas_produto_id ON baixas(produto_id);
CREATE INDEX IF NOT EXISTS idx_baixas_data_baixa ON baixas(data_baixa);
CREATE INDEX IF NOT EXISTS idx_baixas_motivo ON baixas(motivo);

-- ============================================================================
-- 6. TABELA: COLABORADORES (Controle de Acessos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'colaborador')) DEFAULT 'colaborador',
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_colaboradores_email ON colaboradores(email);
CREATE INDEX IF NOT EXISTS idx_colaboradores_role ON colaboradores(role);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - POLÍTICAS DE SEGURANÇA
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE baixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;

-- Política para CLIENTES: usuários autenticados podem ler/escrever
CREATE POLICY "clientes_access" ON clientes
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Política para PRODUTOS: usuários autenticados podem ler/escrever
CREATE POLICY "produtos_access" ON produtos
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Política para VENDAS: usuários autenticados podem ler/escrever
CREATE POLICY "vendas_access" ON vendas
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Política para ITENS_VENDA: usuários autenticados podem ler/escrever
CREATE POLICY "itens_venda_access" ON itens_venda
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Política para BAIXAS: usuários autenticados podem ler/escrever
CREATE POLICY "baixas_access" ON baixas
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Política para COLABORADORES: apenas admins podem ler/escrever
CREATE POLICY "colaboradores_access" ON colaboradores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM colaboradores c 
      WHERE c.email = auth.jwt() ->> 'email' 
      AND c.role = 'admin'
    )
  );

-- ============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON TABLE clientes IS 'Armazena informações de clientes (militares e civis)';
COMMENT ON TABLE produtos IS 'Catálogo de produtos: Trufas, Bolos e Pão de Mel';
COMMENT ON TABLE vendas IS 'Registro de todas as vendas realizadas';
COMMENT ON TABLE itens_venda IS 'Itens individuais de cada venda (relaciona vendas com produtos)';
COMMENT ON TABLE baixas IS 'Registro de perdas, desperdícios e saídas sem venda';
COMMENT ON TABLE colaboradores IS 'Usuários com acesso ao sistema';

COMMENT ON COLUMN clientes.tipo IS 'Tipo de cliente: "militar" ou "civil"';
COMMENT ON COLUMN clientes.posto_grad IS 'Patente militar (EV, EP, Cb, Sgt, Ten, Cap) - preenchido apenas para militares';
COMMENT ON COLUMN clientes.companhia IS 'Subunidade militar - preenchido apenas para militares';

COMMENT ON COLUMN produtos.categoria_pai IS 'Categoria principal do produto: "Trufas", "Bolos" ou "Pão de Mel"';
COMMENT ON COLUMN produtos.categoria IS 'Tipo de produto: "comida" ou "bebida" (padrão: comida)';
COMMENT ON COLUMN produtos.localizacao IS 'Onde o produto está armazenado: "Geladeira" ou "Armário"';

COMMENT ON COLUMN vendas.metodo_pagamento IS 'Forma de pagamento: "FIADO", "PIX", "CARTÃO" ou "DINHEIRO"';
COMMENT ON COLUMN vendas.pago IS 'Indica se a venda foi paga (FALSE = fiado)';

COMMENT ON COLUMN baixas.motivo IS 'Motivo da perda: "Consumo Dono", "Avaria / Estrago", "Vencimento" ou "Brinde / Cortesia"';

-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================
