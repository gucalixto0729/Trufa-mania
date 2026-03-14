-- ============================================================================
-- TRUFAS MANIA - HOTFIX (RLS + CONSTRAINTS)
-- Data: 2026-03-14
-- Objetivo:
-- 1) Eliminar 401 nas operações client-side (clientes/produtos/baixas/vendas/itens_venda)
-- 2) Liberar modelo de estoque Produto -> Sabor (categoria_pai dinâmica)
-- 3) Remover amarra de localizacao (Geladeira/Armario) para usar "Estoque"
-- 4) Permitir motivo personalizado em baixas
--
-- Execute no SQL Editor do Supabase.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1) Políticas RLS permissivas para operação via chave anon no frontend
-- --------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.baixas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clientes_access ON public.clientes;
DROP POLICY IF EXISTS produtos_access ON public.produtos;
DROP POLICY IF EXISTS vendas_access ON public.vendas;
DROP POLICY IF EXISTS itens_venda_access ON public.itens_venda;
DROP POLICY IF EXISTS baixas_access ON public.baixas;

CREATE POLICY clientes_access ON public.clientes
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY produtos_access ON public.produtos
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY vendas_access ON public.vendas
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY itens_venda_access ON public.itens_venda
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY baixas_access ON public.baixas
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- --------------------------------------------------------------------------
-- 2) Produtos: remover checks rígidos de categoria_pai e localizacao
-- --------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.produtos
  DROP CONSTRAINT IF EXISTS produtos_categoria_pai_check;

ALTER TABLE IF EXISTS public.produtos
  DROP CONSTRAINT IF EXISTS produtos_localizacao_check;

-- Mantém categoria como está (comida/bebida), mas libera produto pai dinâmico.
-- Também troca default de localizacao para "Estoque".
ALTER TABLE IF EXISTS public.produtos
  ALTER COLUMN localizacao SET DEFAULT 'Estoque';

UPDATE public.produtos
SET localizacao = 'Estoque'
WHERE localizacao IS NULL
   OR localizacao IN ('Geladeira', 'Armário', 'Armario');

-- --------------------------------------------------------------------------
-- 3) Baixas: permitir motivo livre (remove check antigo)
-- --------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.baixas
  DROP CONSTRAINT IF EXISTS baixas_motivo_check;

COMMIT;

-- ============================================================================
-- Observação de segurança:
-- As policies acima são permissivas para resolver o fluxo atual sem auth JWT.
-- Se quiser endurecer segurança depois, migrar para autenticação real e
-- policies por usuário/role.
-- ============================================================================
