-- ========================================
-- Funciones atómicas para gestión de cola
-- Ejecutar en Supabase SQL Editor
-- ========================================

-- ─── 1. Asignar posición atómica al unirse a la cola ───
-- Evita race conditions: la posición se calcula dentro de una transacción
CREATE OR REPLACE FUNCTION join_queue_atomic(
  p_customer_id TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_estimated_service_time INTEGER DEFAULT 15
)
RETURNS TABLE(
  id UUID,
  customer_id TEXT,
  position INTEGER,
  status TEXT
) AS $$
DECLARE
  next_pos INTEGER;
  new_id UUID;
BEGIN
  -- Lock the table rows to prevent concurrent reads
  LOCK TABLE queue_positions IN SHARE ROW EXCLUSIVE MODE;

  -- Get the next position atomically
  SELECT COALESCE(MAX(qp.position), 0) + 1
  INTO next_pos
  FROM queue_positions qp
  WHERE qp.status IN ('waiting', 'in_service');

  -- Insert the new entry
  INSERT INTO queue_positions (
    customer_id,
    customer_name,
    customer_phone,
    position,
    status,
    estimated_service_time,
    entry_time,
    created_at,
    updated_at
  ) VALUES (
    p_customer_id,
    p_customer_name,
    p_customer_phone,
    next_pos,
    'waiting',
    p_estimated_service_time,
    NOW(),
    NOW(),
    NOW()
  )
  RETURNING queue_positions.id INTO new_id;

  -- Return the result
  RETURN QUERY
    SELECT new_id, p_customer_id, next_pos, 'waiting'::TEXT;
END;
$$ LANGUAGE plpgsql;


-- ─── 2. Recalcular posiciones atómicamente ───
-- Reemplaza el loop N+1 queries de JavaScript
CREATE OR REPLACE FUNCTION recalculate_positions()
RETURNS VOID AS $$
BEGIN
  WITH ranked AS (
    SELECT
      queue_positions.id,
      ROW_NUMBER() OVER (ORDER BY queue_positions.created_at ASC) AS new_position
    FROM queue_positions
    WHERE queue_positions.status IN ('waiting', 'in_service')
  )
  UPDATE queue_positions
  SET
    position = ranked.new_position,
    updated_at = NOW()
  FROM ranked
  WHERE queue_positions.id = ranked.id
    AND queue_positions.position != ranked.new_position;
END;
$$ LANGUAGE plpgsql;


-- ─── 3. Verificar permisos de ejecución ───
-- Permitir que el rol anon/authenticated pueda ejecutar estas funciones
GRANT EXECUTE ON FUNCTION join_queue_atomic(TEXT, TEXT, TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION join_queue_atomic(TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_positions() TO anon;
GRANT EXECUTE ON FUNCTION recalculate_positions() TO authenticated;
