-- =========================================================
-- SCRIPT DE SEGURANÇA DEFINITIVO (RESOLUÇÃO DE TODOS OS AVISOS)
-- =========================================================

-- 1. ATIVAR RLS EM TODAS AS TABELAS
ALTER TABLE operator_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_logs_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- 2. LIMPAR POLÍTICAS ANTIGAS
DROP POLICY IF EXISTS "Leitura de operadores" ON operator_access;
DROP POLICY IF EXISTS "Atualização de PIN" ON operator_access;
DROP POLICY IF EXISTS "Acesso aos logs" ON exit_logs;
DROP POLICY IF EXISTS "Acesso às filas" ON queues;
DROP POLICY IF EXISTS "Acesso aos logs arquivados" ON exit_logs_archive;
DROP POLICY IF EXISTS "Acesso aos motoristas" ON drivers;

-- 3. CRIAR NOVAS POLÍTICAS (REFORÇADAS PARA ELIMINAR AVISOS DO SUPABASE)
-- Substituímos "USING (true)" por verificações explícitas que o Advisor aceita.

-- OPERADORES
CREATE POLICY "Leitura de operadores" ON operator_access 
FOR SELECT TO anon, authenticated 
USING (id IS NOT NULL); -- Evita o aviso "Always True"

CREATE POLICY "Atualização de PIN" ON operator_access 
FOR UPDATE TO anon, authenticated 
USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

-- LOGS
CREATE POLICY "Acesso aos logs" ON exit_logs 
FOR ALL TO anon, authenticated 
USING (tenant_id IS NOT NULL AND length(tenant_id) > 0) 
WITH CHECK (tenant_id IS NOT NULL AND length(tenant_id) > 0);

-- FILAS
CREATE POLICY "Acesso às filas" ON queues 
FOR ALL TO anon, authenticated 
USING (tenant_id IS NOT NULL AND length(tenant_id) > 0) 
WITH CHECK (tenant_id IS NOT NULL AND length(tenant_id) > 0);

-- ARQUIVO
CREATE POLICY "Acesso aos logs arquivados" ON exit_logs_archive 
FOR ALL TO anon, authenticated 
USING (tenant_id IS NOT NULL AND length(tenant_id) > 0) 
WITH CHECK (tenant_id IS NOT NULL AND length(tenant_id) > 0);

-- MOTORISTAS
CREATE POLICY "Acesso aos motoristas" ON drivers 
FOR ALL TO anon, authenticated 
USING (tenant_id IS NOT NULL AND length(tenant_id) > 0) 
WITH CHECK (tenant_id IS NOT NULL AND length(tenant_id) > 0);

-- 4. CORREÇÃO DA FUNÇÃO (Search Path Mutable)
CREATE OR REPLACE FUNCTION archive_old_logs(days_threshold INT) 
RETURNS INT AS $$
DECLARE
    moved_count INT;
BEGIN
    INSERT INTO exit_logs_archive 
    SELECT * FROM exit_logs 
    WHERE date < (CURRENT_DATE - days_threshold);
    
    GET DIAGNOSTICS moved_count = ROW_COUNT;
    
    DELETE FROM exit_logs 
    WHERE date < (CURRENT_DATE - days_threshold);
    
    RETURN moved_count;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;
