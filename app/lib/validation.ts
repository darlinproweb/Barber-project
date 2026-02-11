/**
 * Validación de entrada y sanitización
 */

// ─── Types ───

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface QueueJoinInput {
  customer_name?: string;
  customer_phone?: string;
  estimated_service_time?: number;
}

interface LoginInput {
  email?: string;
  password?: string;
}

interface CompleteServiceInput {
  customer_id?: string;
  service_duration?: number;
}

// ─── Sanitization ───

/**
 * Sanitizar strings para prevenir inyecciones
 */
export function sanitizeString(input: string, maxLength = 255): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, '')
    .replace(/[;]/g, '');
}

// ─── Validators ───

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[+]?[(]?[0-9]{1,3}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}$/;
  return phoneRegex.test(phone);
}

export function isValidName(name: string): boolean {
  if (!name || name.length < 2 || name.length > 100) return false;
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/;
  return nameRegex.test(name);
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && Number.isInteger(value);
}

export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// ─── Input Validators ───

export function validateQueueJoinInput(data: QueueJoinInput): ValidationResult {
  const errors: string[] = [];

  if (!data.customer_name) {
    errors.push('El nombre es requerido');
  } else if (!isValidName(data.customer_name)) {
    errors.push('El nombre solo puede contener letras, espacios y apóstrofos (2-100 caracteres)');
  }

  if (!data.customer_phone) {
    errors.push('El teléfono es requerido');
  } else if (!isValidPhone(data.customer_phone)) {
    errors.push('El teléfono debe tener un formato válido');
  }

  if (data.estimated_service_time !== undefined) {
    if (!isPositiveNumber(data.estimated_service_time) || data.estimated_service_time > 120) {
      errors.push('El tiempo estimado debe ser un número positivo (máx 120 minutos)');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateLoginInput(data: LoginInput): ValidationResult {
  const errors: string[] = [];

  if (!data.email) {
    errors.push('El email es requerido');
  } else if (!isValidEmail(data.email)) {
    errors.push('El email debe ser válido');
  }

  if (!data.password) {
    errors.push('La contraseña es requerida');
  } else if (data.password.length < 4) {
    errors.push('La contraseña debe tener al menos 4 caracteres');
  }

  return { valid: errors.length === 0, errors };
}

export function validateCompleteServiceInput(data: CompleteServiceInput): ValidationResult {
  const errors: string[] = [];

  if (!data.customer_id) {
    errors.push('El ID del cliente es requerido');
  }

  if (data.service_duration !== undefined) {
    if (!isPositiveNumber(data.service_duration) || data.service_duration > 300) {
      errors.push('La duración del servicio debe ser un número positivo (máx 300 minutos)');
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Rate Limiter ───

const rateLimitStore = new Map<string, number[]>();

export function checkRateLimit(identifier: string, windowMs = 60000, maxRequests = 10): boolean {
  const now = Date.now();
  const timestamps = rateLimitStore.get(identifier) || [];
  const validTimestamps = timestamps.filter(t => now - t < windowMs);

  if (validTimestamps.length >= maxRequests) {
    return false;
  }

  validTimestamps.push(now);
  rateLimitStore.set(identifier, validTimestamps);
  return true;
}
