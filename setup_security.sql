-- PASSO 1: ATIVAR RLS
ALTER TABLE operator_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE queues ENABLE ROW LEVEL SECURITY;

-- PASSO 2: LIMPAR POLÍTICAS ANTIGAS
DROP POLICY IF EXISTS "Leitura pública de operadores via PIN" ON operator_access;
DROP POLICY IF EXISTS "Acesso aos logs por Tenant" ON exit_logs;
DROP POLICY IF EXISTS "Acesso às filas por Tenant" ON queues;

-- PASSO 3: CRIAR NOVAS POLÍTICAS
CREATE POLICY "Leitura pública de operadores via PIN" ON operator_access FOR SELECT TO anon USING (true); 
CREATE POLICY "Atualização pública de PIN" ON operator_access FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acesso aos logs por Tenant" ON exit_logs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acesso às filas por Tenant" ON queues FOR ALL TO anon USING (true) WITH CHECK (true);
