-- 1. Índices para a tabela de logs de saída (Melhora buscas por data, tempo e terminal)
CREATE INDEX IF NOT EXISTS idx_exit_logs_tenant_date ON exit_logs (tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_exit_logs_exit_time ON exit_logs (exit_time DESC);

-- 2. Índices para a tabela de filas (Melhora a carga inicial das colunas)
CREATE INDEX IF NOT EXISTS idx_queues_tenant_period ON queues (tenant_id, period);

-- 3. Criação da tabela de arquivo (Opção A de arquivamento)
CREATE TABLE IF NOT EXISTS exit_logs_archive (
    LIKE exit_logs INCLUDING ALL
);

-- 4. Índice para a tabela de arquivo
CREATE INDEX IF NOT EXISTS idx_exit_logs_archive_date ON exit_logs_archive (date DESC);

-- 5. Função para arquivar dados antigos (Move para exit_logs_archive e remove de exit_logs)
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
$$ LANGUAGE plpgsql;
