-- INDICES PARA LOGS DE SAIDA
CREATE INDEX IF NOT EXISTS idx_exit_logs_tenant_date ON exit_logs (tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_exit_logs_exit_time ON exit_logs (exit_time DESC);

-- INDICES PARA FILAS
CREATE INDEX IF NOT EXISTS idx_queues_tenant_period ON queues (tenant_id, period);

-- TABELA DE ARQUIVO
CREATE TABLE IF NOT EXISTS exit_logs_archive (
    LIKE exit_logs INCLUDING ALL
);

-- INDICE PARA TABELA DE ARQUIVO 
CREATE INDEX IF NOT EXISTS idx_exit_logs_archive_date ON exit_logs_archive (date DESC);

-- FUNCAO PARA ARQUIVAR DADOS ANTIGOS
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
