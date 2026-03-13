-- ============================================================================
-- TRUFAS MANIA - Dados de Exemplo (PRODUTOS)
-- ============================================================================
-- Execute este SQL após criar o schema (database.sql)
-- Este arquivo insere produtos de exemplo divididos entre Geladeira e Armário

-- ============================================================================
-- TRUFAS - GELADEIRA (Produtos que precisam estar refrigerados)
-- ============================================================================

INSERT INTO produtos (nome, preco_custo, preco_venda, estoque, categoria, categoria_pai, localizacao)
VALUES
  ('CHOCOLATE', 8.50, 18.00, 30, 'comida', 'Trufas', 'Geladeira'),
  ('BRIGADEIRO', 8.50, 18.00, 25, 'comida', 'Trufas', 'Geladeira'),
  ('MORANGO', 9.00, 20.00, 20, 'comida', 'Trufas', 'Geladeira'),
  ('PISTACHE', 10.00, 22.00, 15, 'comida', 'Trufas', 'Geladeira'),
  ('CAFÉ', 8.80, 19.00, 18, 'comida', 'Trufas', 'Geladeira');

-- ============================================================================
-- BOLOS - GELADEIRA (Bolos que precisam estar refrigerados)
-- ============================================================================

INSERT INTO produtos (nome, preco_custo, preco_venda, estoque, categoria, categoria_pai, localizacao)
VALUES
  ('CHOCOLATE', 15.00, 38.00, 12, 'comida', 'Bolos', 'Geladeira'),
  ('CENOURA', 12.00, 32.00, 10, 'comida', 'Bolos', 'Geladeira'),
  ('COCO', 13.50, 35.00, 8, 'comida', 'Bolos', 'Geladeira'),
  ('FUBÁ', 12.50, 33.00, 9, 'comida', 'Bolos', 'Geladeira'),
  ('BRIGADEIRO', 14.50, 37.00, 11, 'comida', 'Bolos', 'Geladeira');

-- ============================================================================
-- PÃO DE MEL - ARMÁRIO (Produtos que não precisam estar refrigerados)
-- ============================================================================

INSERT INTO produtos (nome, preco_custo, preco_venda, estoque, categoria, categoria_pai, localizacao)
VALUES
  ('CHOCOLATE', 5.50, 14.00, 50, 'comida', 'Pão de Mel', 'Armário'),
  ('TRADICIONAL', 5.00, 12.00, 45, 'comida', 'Pão de Mel', 'Armário'),
  ('COM CALDA', 6.50, 16.00, 35, 'comida', 'Pão de Mel', 'Armário');

-- ============================================================================
-- VERIFICAÇÃO: Liste todos os produtos inseridos
-- ============================================================================

-- Descomente a query abaixo após inserir os dados para verificação:
-- SELECT 
--   categoria_pai,
--   nome,
--   preco_custo,
--   preco_venda,
--   estoque,
--   localizacao,
--   ROUND(((preco_venda - preco_custo) / preco_custo * 100)::numeric, 2) as margem_percent
-- FROM produtos
-- ORDER BY categoria_pai, localizacao, nome;

-- ============================================================================
-- RESUMO DE DADOS INSERIDOS
-- ============================================================================
-- Total de produtos: 13 SKUs
-- - Trufas (Geladeira): 5 sabores
-- - Bolos (Geladeira): 5 sabores
-- - Pão de Mel (Armário): 3 sabores
--
-- Margens de Lucro:
-- - Trufas: 111-175% de margem
-- - Bolos: 111-160% de margem
-- - Pão de Mel: 109-167% de margem
--
-- Estoque Total Inicial: ~337 unidades

-- ============================================================================
-- FIM DO ARQUIVO DE DADOS DE EXEMPLO
-- ============================================================================
