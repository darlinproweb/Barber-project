'use client';

import { useEffect, useState, useRef } from 'react';
import { subscribeToQueueUpdates, supabase, cancelByCustomer } from '@/app/lib/supabase';
import { useQueueNotifications } from '@/app/hooks/useNotifications';
import { notifyTurnNow, playSound } from '@/app/lib/notifications';
import type { QueueItem } from '@/app/types';
import toast from 'react-hot-toast';

interface QueueStatusProps {
  customerId: string;
  onPositionChange?: (position: QueueItem) => void;
}

export function QueueStatus({ customerId, onPositionChange }: QueueStatusProps) {
  const [queuePosition, setQueuePosition] = useState<QueueItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const previousPosition = useRef<number | null>(null);

  const {
    permission,
    requestPermission,
    notifyPositionChange,
    isSupported,
  } = useQueueNotifications();

  // Ask for notification permission on mount
  useEffect(() => {
    if (isSupported && permission === 'default') {
      // Small delay so the user sees the page first
      const timer = setTimeout(() => {
        requestPermission();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission, requestPermission]);

  useEffect(() => {
    const fetchInitialPosition = async () => {
      try {
        const { data } = await supabase
          .from('queue_positions')
          .select('*')
          .eq('customer_id', customerId)
          .in('status', ['waiting', 'in_service'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          const item = data as QueueItem;
          setQueuePosition(item);
          previousPosition.current = item.position;
        }
      } catch (error) {
        console.error('Error fetching initial position:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialPosition();

    const subscription = subscribeToQueueUpdates(customerId, (payload) => {
      if (payload.new) {
        const updatedPosition = payload.new;
        setQueuePosition(updatedPosition);
        onPositionChange?.(updatedPosition);

        // 🔔 Trigger notifications based on position change
        notifyPositionChange(updatedPosition.position, previousPosition.current);

        if (updatedPosition.status === 'in_service') {
          notifyTurnNow();
          playSound('your_turn', 0.4);
          toast.success('🚨 ¡ES TU TURNO! Dirígete a la barbería', { duration: 10000 });
        }

        if (updatedPosition.status === 'cancelled') {
          playSound('error', 0.2);
          toast.error('Tu cita ha sido cancelada');
        }

        previousPosition.current = updatedPosition.position;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [customerId, onPositionChange, notifyPositionChange]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-32 rounded-lg bg-slate-200"></div>
          <div className="h-12 w-48 rounded-lg bg-slate-200"></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-24 rounded-xl bg-slate-100"></div>
            <div className="h-24 rounded-xl bg-slate-100"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!queuePosition) {
    return (
      <div className="rounded-2xl border border-amber-200/50 bg-amber-50 p-6">
        <p className="text-amber-700 font-medium">No hay una posición en cola activa</p>
        <p className="text-amber-600/70 text-sm mt-1">Tu turno puede haber sido cancelado o completado</p>
      </div>
    );
  }

  const peopleBefore = Math.max(0, queuePosition.position - 1);
  const estimatedWait = peopleBefore * queuePosition.estimated_service_time;

  const getStatusColor = () => {
    switch (queuePosition.status) {
      case 'waiting': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'in_service': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusText = () => {
    switch (queuePosition.status) {
      case 'waiting': return 'Esperando';
      case 'in_service': return '¡ES TU TURNO!';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      default: return 'Desconocido';
    }
  };

  const handleCancel = async () => {
    if (!queuePosition) return;
    if (!confirm('¿Estás seguro que quieres cancelar tu cita?')) return;

    setIsCancelling(true);
    try {
      const res = await cancelByCustomer(customerId);
      if (res.success) {
        toast.success('Tu cita fue cancelada');
        setQueuePosition(null);
        localStorage.removeItem('barbershop_customer_id');
      } else {
        toast.error(res.error || 'No se pudo cancelar la cita');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al cancelar la cita');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification permission banner */}
      {isSupported && permission === 'default' && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
          <span className="text-2xl">🔔</span>
          <div className="flex-1">
            <p className="font-semibold text-blue-800 text-sm">¿Quieres recibir alertas?</p>
            <p className="text-blue-600 text-xs mt-0.5">Te avisaremos cuando tu turno se acerque</p>
          </div>
          <button
            onClick={requestPermission}
            className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-blue-400"
          >
            Activar
          </button>
        </div>
      )}

      {/* Notification status */}
      {isSupported && permission === 'granted' && (
        <div className="rounded-xl border border-emerald-200/50 bg-emerald-50 px-4 py-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <p className="text-xs text-emerald-700 font-medium">Notificaciones activadas — te alertaremos cuando falten 2 turnos</p>
        </div>
      )}

      {/* Alert banner for in_service */}
      {queuePosition.status === 'in_service' && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-center text-white shadow-lg shadow-emerald-500/20 animate-pulse">
          <p className="text-2xl font-bold">🚨 ¡ES TU TURNO AHORA! 🚨</p>
          <p className="mt-1 text-sm text-emerald-100">Dirígete a la barbería</p>
        </div>
      )}

      {/* Urgent warning for 1-2 people ahead */}
      {queuePosition.status === 'waiting' && peopleBefore <= 2 && peopleBefore > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 p-4 text-center text-white shadow-lg shadow-amber-500/20">
          <p className="font-bold">
            {peopleBefore === 1
              ? '⏳ ¡Solo 1 persona delante de ti!'
              : '⏳ ¡Solo 2 personas delante de ti!'}
          </p>
          <p className="text-xs text-amber-100 mt-1">Prepárate para tu turno</p>
        </div>
      )}

      {/* Main card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5">
          <h2 className="text-xl font-bold text-white">📍 Tu Estado en la Cola</h2>
        </div>

        <div className="p-6">
          {/* People before - hero section */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-6 mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Personas Delante de Ti</p>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-6xl font-bold text-emerald-600">{peopleBefore}</p>
              <div className="text-right">
                {peopleBefore === 0 && (
                  <div className="animate-bounce rounded-xl bg-emerald-500 px-4 py-2 shadow-lg shadow-emerald-500/20">
                    <p className="font-bold text-white">¡ERES EL SIGUIENTE!</p>
                  </div>
                )}
                {peopleBefore === 1 && (
                  <p className="text-sm font-semibold text-emerald-700">Solo una persona delante</p>
                )}
                {peopleBefore > 1 && (
                  <p className="text-sm font-semibold text-emerald-700">{peopleBefore} personas en la cola</p>
                )}
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Espera</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">
                {estimatedWait > 0 ? `${estimatedWait} min` : 'Ahora'}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {queuePosition.estimated_service_time} min × {peopleBefore}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Posición</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">#{queuePosition.position}</p>
              <p className="mt-1 text-[11px] text-slate-400">En la cola</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</p>
              <span className={`mt-2 inline-block rounded-lg border px-3 py-1.5 text-xs font-semibold ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
          </div>

          {/* Your info */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Tu Información</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] text-slate-400">Nombre</p>
                <p className="font-semibold text-slate-800">{queuePosition.customer_name}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Teléfono</p>
                <p className="font-semibold text-slate-800">{queuePosition.customer_phone}</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Progreso</p>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(peopleBefore + 1, 10) }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2.5 flex-1 rounded-full transition-all ${i === 0
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                      : 'bg-slate-200'
                    }`}
                ></div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {peopleBefore === 0 ? '¡Listo para tu turno!' : 'Avanzando en la cola...'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {queuePosition.status === 'waiting' && (
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
              >
                {isCancelling ? 'Cancelando...' : 'Cancelar cita'}
              </button>
            )}

            {/* Notification toggle */}
            {isSupported && permission !== 'granted' && (
              <button
                onClick={requestPermission}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50"
              >
                🔔 Activar alertas
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
