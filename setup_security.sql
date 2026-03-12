-- PASSO 1: ATIVAR RLS
ALTER TABLE operator_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_logs_archive ENABLE ROW LEVEL SECURITY;


-- PASSO 2: LIMPAR POLÍTICAS ANTIGAS (Garante que não haja duplicidade)
DROP POLICY IF EXISTS "Leitura pública de operadores via PIN" ON operator_access;
DROP POLICY IF EXISTS "Atualização pública de PIN" ON operator_access;
DROP POLICY IF EXISTS "Acesso aos logs por Tenant" ON exit_logs;
DROP POLICY IF EXISTS "Acesso às filas por Tenant" ON queues;
DROP POLICY IF EXISTS "Leitura de operadores" ON operator_access;
DROP POLICY IF EXISTS "Atualização de PIN" ON operator_access;
DROP POLICY IF EXISTS "Acesso aos logs" ON exit_logs;
DROP POLICY IF EXISTS "Acesso às filas" ON queues;
DROP POLICY IF EXISTS "Acesso aos logs arquivados" ON exit_logs_archive;


-- PASSO 3: CRIAR NOVAS POLÍTICAS (Para usuários anônimos e autenticados/Administradores)
CREATE POLICY "Leitura de operadores" ON operator_access FOR SELECT TO anon, authenticated USING (true); 
CREATE POLICY "Atualização de PIN" ON operator_access FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso aos logs" ON exit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso às filas" ON queues FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso aos logs arquivados" ON exit_logs_archive FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

