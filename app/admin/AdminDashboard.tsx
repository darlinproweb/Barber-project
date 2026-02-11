'use client';

import { useState, useEffect } from 'react';
import { subscribeToQueueChanges } from '@/app/lib/admin';
import { getAdminQueue } from '@/app/lib/adminActions';
import { useAdminNotifications } from '@/app/hooks/useNotifications';
import { playSound, notifyNewCustomer } from '@/app/lib/notifications';
import { QueueControlPanel } from './QueueControlPanel';
import { AdminStatsPanel } from './AdminStatsPanel';
import type { QueueItem, RealtimePayload } from '@/app/types';
import toast from 'react-hot-toast';

interface AdminDashboardProps {
  barberName: string;
  onLogout: () => void;
}

export function AdminDashboard({ barberName, onLogout }: AdminDashboardProps) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<QueueItem | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const { permission, requestPermission, isSupported } = useAdminNotifications();

  // Auto-request permission
  useEffect(() => {
    if (isSupported && permission === 'default') {
      requestPermission();
    }
  }, [isSupported, permission, requestPermission]);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const result = await getAdminQueue();
        if (result.success && result.queue) {
          setQueue(result.queue);
        } else {
          console.error('Error fetching queue:', result.error);
          toast.error('Error al cargar la cola');
        }
      } catch (error) {
        console.error(error);
        toast.error('Error al cargar la cola');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQueue();

    // Realtime subscription
    const subscription = subscribeToQueueChanges(async (payload: RealtimePayload) => {
      const prevCount = queue.length;

      if (payload?.broadcast && payload.payload) {
        await fetchQueue();
        const newData = payload.payload?.data;
        if (newData?.id) {
          setHighlightedId(newData.id);
          if (soundEnabled) playSound('new_customer', 0.3);
          notifyNewCustomer(newData.customer_name || 'Cliente', newData.position || prevCount + 1);
          setTimeout(() => setHighlightedId(null), 3000);
        }
        return;
      }

      if (payload?.new && payload.new.id) {
        await fetchQueue();
        setHighlightedId(payload.new.id);
        if (soundEnabled) playSound('new_customer', 0.3);
        notifyNewCustomer(payload.new.customer_name, payload.new.position);
        setTimeout(() => setHighlightedId(null), 3000);
        return;
      }

      fetchQueue();
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEnabled]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-2xl font-bold text-white">
              ✂️ Panel de Control
            </h1>
            <p className="text-sm text-slate-400">
              Barbero: <span className="font-semibold text-amber-400">{barberName}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Sound toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${soundEnabled
                  ? 'border-amber-400/30 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20'
                  : 'border-white/10 bg-white/5 text-slate-500 hover:text-slate-400'
                }`}
              title={soundEnabled ? 'Sonidos activados' : 'Sonidos desactivados'}
            >
              {soundEnabled ? '🔔' : '🔕'}
            </button>

            {/* Notification permission */}
            {isSupported && permission !== 'granted' && (
              <button
                onClick={requestPermission}
                className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-400 transition-all hover:bg-blue-500/20"
                title="Activar notificaciones push"
              >
                📲 Notificaciones
              </button>
            )}

            <button
              onClick={onLogout}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20 hover:text-red-300"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Queue (left - 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <AdminStatsPanel queue={queue} />

            {/* Queue List */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Cola Actual</h2>
                <span className="rounded-full bg-amber-400/10 px-3 py-1 text-sm font-semibold text-amber-400">
                  {queue.length} en cola
                </span>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5"></div>
                  ))}
                </div>
              ) : queue.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-4xl mb-3">💈</p>
                  <p className="text-slate-400">No hay clientes en la cola</p>
                  <p className="text-sm text-slate-500 mt-1">Los nuevos clientes aparecerán aquí automáticamente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedCustomer(item)}
                      className={`group cursor-pointer rounded-xl border p-4 transition-all duration-300 ${selectedCustomer?.id === item.id
                        ? 'border-amber-400/50 bg-amber-400/10 shadow-lg shadow-amber-400/5'
                        : highlightedId === item.id
                          ? 'border-emerald-400/50 bg-emerald-400/10 animate-pulse'
                          : 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/5'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold text-sm ${item.status === 'in_service'
                            ? 'bg-emerald-400/20 text-emerald-400'
                            : 'bg-white/10 text-white'
                            }`}>
                            #{item.position}
                          </div>
                          <div>
                            <p className="font-semibold text-white">
                              {item.customer_name}
                            </p>
                            <p className="text-sm text-slate-400">{item.customer_phone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {item.status === 'in_service' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              EN SERVICIO
                            </span>
                          ) : (
                            <p className="text-xs text-slate-500">
                              {getWaitTime(item.entry_time)} min esperando
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Control Panel (right) */}
          <div>
            <QueueControlPanel
              selectedCustomer={selectedCustomer}
              queue={queue}
              onActionComplete={() => setSelectedCustomer(null)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function getWaitTime(entryTime: string): number {
  const entry = new Date(entryTime);
  const now = new Date();
  return Math.floor((now.getTime() - entry.getTime()) / (1000 * 60));
}
