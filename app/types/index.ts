// ============================================
// 📋 Tipos centrales de la aplicación
// ============================================

// --- Queue ---

export type QueueStatus = 'waiting' | 'in_service' | 'completed' | 'cancelled';

export interface QueueItem {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  position: number;
  status: QueueStatus;
  entry_time: string;
  estimated_service_time: number;
  service_duration: number;
  created_at: string;
  updated_at: string;
}

// --- Admin / Barbero ---

export interface Barber {
  id: string;
  name: string;
  email: string;
}

export interface BarberWithPassword extends Barber {
  password: string;
}

export interface BarberSession {
  barberId: string;
  barberName: string;
  email: string;
}

export interface AdminStats {
  total_in_queue: number;
  total_served_today: number;
  avg_service_time: number;
  estimated_wait_time: number;
  shop_is_open: boolean;
}

// --- Respuestas de Server Actions ---

export interface ActionResult<T = undefined> {
  success: boolean;
  error?: string;
  details?: string[];
  data?: T;
}

export interface JoinQueueResult extends ActionResult {
  customer_id?: string;
  position?: number;
  message?: string;
}

export interface CallNextResult extends ActionResult {
  customer?: Pick<QueueItem, 'id' | 'customer_id' | 'customer_name' | 'customer_phone' | 'position'>;
  message?: string;
}

export interface CompleteServiceResult extends ActionResult {
  message?: string;
  service_duration?: number;
}

export interface CancelCustomerResult extends ActionResult {
  message?: string;
}

export interface GetQueueResult extends ActionResult {
  queue?: QueueItem[];
  total?: number;
}

export interface GetStatsResult extends ActionResult {
  stats?: AdminStats;
}

export interface QueuePositionResult {
  status: 'waiting' | 'in_service' | 'completed' | 'error';
  position?: number;
  people_ahead?: number;
  estimated_wait_time?: number;
  message?: string;
  error?: string;
}

// --- Realtime Payloads ---

export interface RealtimePayload {
  new?: QueueItem;
  old?: QueueItem;
  eventType?: string;
  broadcast?: boolean;
  payload?: {
    action?: string;
    data?: QueueItem;
  };
}
