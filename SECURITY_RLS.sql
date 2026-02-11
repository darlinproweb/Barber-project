-- ========================================
-- Row Level Security (RLS) Configuration
-- ========================================

-- 1. Habilitar RLS en table queue_positions
ALTER TABLE queue_positions ENABLE ROW LEVEL SECURITY;

-- 2. Política para que los clientes solo vean su propia posición
CREATE POLICY "customers_see_own_position"
ON queue_positions
FOR SELECT
USING (customer_id = current_user_id()); 

-- 3. Política para que los clientes puedan insertar su propia entrada
CREATE POLICY "customers_can_join_queue"
ON queue_positions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Para administradores (barberos)
-- 4. Crear tabla de administradores
CREATE TABLE IF NOT EXISTS barber_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Política para que los barberos vean toda la cola
CREATE POLICY "barbers_see_all_queue"
ON queue_positions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM barber_sessions 
    WHERE barber_id = current_user_id()
  )
);

-- 6. Permitir a barberos actualizar estado
CREATE POLICY "barbers_can_update_queue"
ON queue_positions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM barber_sessions 
    WHERE barber_id = current_user_id()
  )
);

-- 7. Permitir a barberos eliminar (cancelar)
CREATE POLICY "barbers_can_delete_queue"
ON queue_positions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM barber_sessions 
    WHERE barber_id = current_user_id()
  )
);

-- Tabla de notificaciones
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 8. Los clientes solo ven sus notificaciones
CREATE POLICY "customers_see_own_notifications"
ON notifications
FOR SELECT
USING (customer_id = current_user_id());

-- 9. Los barberos pueden crear notificaciones
CREATE POLICY "barbers_create_notifications"
ON notifications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM barber_sessions 
    WHERE barber_id = current_user_id()
  )
);

-- ========================================
-- Índices para mejorar rendimiento
-- ========================================

CREATE INDEX IF NOT EXISTS idx_queue_customer_id ON queue_positions(customer_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue_positions(status);
CREATE INDEX IF NOT EXISTS idx_queue_position ON queue_positions(position);
CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_barber_sessions_id ON barber_sessions(barber_id);

-- ========================================
-- Funciones y triggers
-- ========================================

-- Función para actualizar automatically updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para queue_positions
DROP TRIGGER IF EXISTS update_queue_positions_updated_at ON queue_positions;
CREATE TRIGGER update_queue_positions_updated_at BEFORE UPDATE ON queue_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para notificar cuando se llama otro cliente
CREATE OR REPLACE FUNCTION notify_queue_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'queue_update',
    json_build_object(
      'action', TG_OP,
      'customer_id', NEW.customer_id,
      'status', NEW.status,
      'position', NEW.position
    )::text
  );
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para notificaciones en tiempo real
DROP TRIGGER IF EXISTS on_queue_positions_change ON queue_positions;
CREATE TRIGGER on_queue_positions_change AFTER INSERT OR UPDATE OR DELETE ON queue_positions
  FOR EACH ROW EXECUTE FUNCTION notify_queue_update();
