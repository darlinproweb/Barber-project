'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { QueueEntryForm } from './components/QueueEntryForm';
import { QueueStatus } from './components/QueueStatus';
import type { JoinQueueResult } from '@/app/types';

export default function Home() {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedId = localStorage.getItem('barbershop_customer_id');
    if (savedId) {
      setCustomerId(savedId);
    }
    setIsLoading(false);
  }, []);

  const handleQueueEntry = (data: JoinQueueResult) => {
    if (data.customer_id) {
      setCustomerId(data.customer_id);
      localStorage.setItem('barbershop_customer_id', data.customer_id);
    }
  };

  const handleLogout = () => {
    setCustomerId(null);
    localStorage.removeItem('barbershop_customer_id');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="animate-pulse text-center">
          <div className="mx-auto h-10 w-10 rounded-xl bg-slate-200 mb-4"></div>
          <div className="h-4 w-48 rounded-lg bg-slate-200 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg shadow-lg shadow-blue-500/20">
                ✂️
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">Barbershop Queue</h1>
                <p className="text-[11px] text-slate-400 -mt-0.5">Cola Virtual Inteligente</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300"
              >
                Panel Admin
              </Link>
              {customerId && (
                <button
                  onClick={handleLogout}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition-all hover:bg-red-100"
                >
                  Salir
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {!customerId ? (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Form Section */}
            <div>
              <QueueEntryForm onSuccess={handleQueueEntry} />
            </div>

            {/* Info Section */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-800 mb-4">¿Cómo funciona?</h3>
                <div className="space-y-4">
                  {[
                    { icon: '📝', text: 'Ingresa tu nombre y teléfono para unirte a la cola' },
                    { icon: '📊', text: 'Visualiza tu posición y estimación de tiempo en tiempo real' },
                    { icon: '🔔', text: 'Recibe notificaciones cuando tu turno se acerque' },
                    { icon: '⏱️', text: 'Mantente actualizado sin necesidad de estar pendiente' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm">
                        {item.icon}
                      </span>
                      <span className="text-sm text-slate-600 pt-1">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-emerald-800 mb-3">✓ Beneficios</h3>
                <div className="space-y-2 text-sm text-emerald-700">
                  <p className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    No esperes en la tienda
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    Planifica tu tiempo
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    Notificaciones automáticas
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    Control en tiempo real
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-800">¡Bienvenido! 👋</h2>
              <p className="mt-1 text-slate-500">
                Tu sesión: <code className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-blue-600">{customerId}</code>
              </p>
            </div>
            <QueueStatus customerId={customerId} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white/50 py-6 mt-12">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <p className="text-xs text-slate-400">
            © 2026 Barbershop Queue. Sistema inteligente de gestión de turnos.
          </p>
          <p className="mt-2 text-[10px] text-slate-300 font-mono">
            v1.1 (PWA Ready + Fix)
          </p>
        </div>
      </footer>
    </div>
  );
}
