'use client';

import { useState } from 'react';
import { callNextCustomer, completeService, cancelCustomer, addWalkInCustomer } from '@/app/lib/adminActions';
import { playSound } from '@/app/lib/notifications';
import type { QueueItem } from '@/app/types';
import toast from 'react-hot-toast';

interface QueueControlPanelProps {
  selectedCustomer: QueueItem | null;
  queue: QueueItem[];
  onActionComplete: () => void;
}

export function QueueControlPanel({
  selectedCustomer,
  queue,
  onActionComplete,
}: QueueControlPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [serviceDuration, setServiceDuration] = useState(15);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [walkInData, setWalkInData] = useState({ name: '', phone: '' });
  const [isAddingWalkIn, setIsAddingWalkIn] = useState(false);

  const handleCallNext = async () => {
    setIsLoading(true);
    try {
      const result = await callNextCustomer();
      if (result.success) {
        toast.success(`Llamando a ${result.customer?.customer_name}`);
        playSound('success', 0.3);
        onActionComplete();
      } else {
        toast.error(result.error || 'Error al llamar siguiente');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteService = async () => {
    if (!selectedCustomer) return;

    setIsLoading(true);
    try {
      const result = await completeService(selectedCustomer.id, serviceDuration);
      if (result.success) {
        toast.success(`Servicio completado para ${selectedCustomer.customer_name}`);
        playSound('success', 0.3);
        onActionComplete();
      } else {
        toast.error('Error al completar servicio');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelCustomer = async () => {
    if (!selectedCustomer) return;

    setIsLoading(true);
    try {
      const result = await cancelCustomer(selectedCustomer.id);
      if (result.success) {
        toast.success('Cliente cancelado');
        setShowCancelConfirm(false);
        onActionComplete();
      } else {
        toast.error(result.error || 'Error al cancelar');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walkInData.name.trim() || walkInData.name.trim().length < 2) {
      toast.error('Ingresa un nombre válido (mínimo 2 caracteres)');
      return;
    }

    setIsAddingWalkIn(true);
    try {
      const result = await addWalkInCustomer(
        walkInData.name.trim(),
        walkInData.phone.trim() || 'walk-in'
      );

      if (result.success) {
        toast.success(result.message || `${walkInData.name} agregado a la cola`);
        playSound('new_customer', 0.3);
        setWalkInData({ name: '', phone: '' });
        setShowWalkInForm(false);
        onActionComplete();
      } else {
        toast.error(result.error || 'Error al agregar cliente');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error inesperado');
    } finally {
      setIsAddingWalkIn(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Actions */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <h3 className="mb-4 text-lg font-bold text-white">Controles</h3>

        <div className="space-y-3">
          <button
            onClick={handleCallNext}
            disabled={isLoading || queue.length === 0}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/40 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-40 disabled:shadow-none"
          >
            {isLoading ? 'Procesando...' : '📞 Llamar Siguiente'}
          </button>

          <button
            onClick={() => setShowWalkInForm(!showWalkInForm)}
            className={`w-full rounded-xl border px-4 py-3 font-semibold transition-all ${showWalkInForm
                ? 'border-amber-400/40 bg-amber-400/10 text-amber-400'
                : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/5 hover:border-white/20'
              }`}
          >
            {showWalkInForm ? '✕ Cerrar' : '➕ Agregar Cliente (Walk-in)'}
          </button>
        </div>
      </div>

      {/* Walk-in Form */}
      {showWalkInForm && (
        <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-b from-amber-400/5 to-transparent p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-lg">🚶</span>
            <div>
              <p className="font-bold text-white text-sm">Cliente sin cita</p>
              <p className="text-xs text-slate-400">Se agregará al final de la cola</p>
            </div>
          </div>

          <form onSubmit={handleAddWalkIn} className="space-y-3">
            <div>
              <label htmlFor="walkin-name" className="block text-xs font-medium text-slate-400 mb-1">
                Nombre *
              </label>
              <input
                id="walkin-name"
                type="text"
                value={walkInData.name}
                onChange={(e) => setWalkInData({ ...walkInData, name: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 transition-all focus:border-amber-400/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-amber-400/30"
                placeholder="Nombre del cliente"
                disabled={isAddingWalkIn}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="walkin-phone" className="block text-xs font-medium text-slate-400 mb-1">
                Teléfono <span className="text-slate-600">(opcional)</span>
              </label>
              <input
                id="walkin-phone"
                type="tel"
                value={walkInData.phone}
                onChange={(e) => setWalkInData({ ...walkInData, phone: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 transition-all focus:border-amber-400/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-amber-400/30"
                placeholder="Opcional"
                disabled={isAddingWalkIn}
              />
            </div>

            <button
              type="submit"
              disabled={isAddingWalkIn || !walkInData.name.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2.5 font-bold text-slate-900 shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/40 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 disabled:shadow-none"
            >
              {isAddingWalkIn ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-transparent"></span>
                  Agregando...
                </span>
              ) : (
                `Agregar a la cola (posición #${queue.length + 1})`
              )}
            </button>
          </form>
        </div>
      )}

      {/* Selected Customer Details */}
      {selectedCustomer ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6 backdrop-blur-xl">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Cliente Seleccionado</p>
          <p className="mt-1 text-lg font-bold text-white">{selectedCustomer.customer_name}</p>
          <p className="text-sm text-slate-400">{selectedCustomer.customer_phone}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-lg bg-white/10 px-2 py-0.5 text-xs font-medium text-white">
              #{selectedCustomer.position}
            </span>
            {selectedCustomer.customer_id.startsWith('walkin_') && (
              <span className="rounded-lg bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                Walk-in
              </span>
            )}
            {selectedCustomer.status === 'in_service' && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                En servicio
              </span>
            )}
          </div>

          {/* Complete service controls */}
          {selectedCustomer.status === 'in_service' && (
            <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
              <div>
                <label className="text-sm font-medium text-slate-300">
                  Duración (minutos)
                </label>
                <input
                  type="number"
                  value={serviceDuration}
                  onChange={(e) => setServiceDuration(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="120"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-slate-500 focus:border-amber-400/50 focus:outline-none"
                />
              </div>

              <button
                onClick={handleCompleteService}
                disabled={isLoading}
                className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/40 disabled:opacity-40"
              >
                ✓ Servicio Completado
              </button>
            </div>
          )}

          {/* Cancel button */}
          <button
            onClick={() => setShowCancelConfirm(true)}
            disabled={isLoading}
            className="mt-3 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 font-semibold text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-40"
          >
            ✕ Cancelar Cliente
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl">
          <p className="text-4xl mb-2">👆</p>
          <p className="text-sm text-slate-400">Selecciona un cliente de la lista para controlarlo</p>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {showCancelConfirm && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 max-w-sm rounded-2xl border border-white/10 bg-slate-800 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">
              Confirmar cancelación
            </h3>
            <p className="text-slate-300 mb-4">
              ¿Estás seguro de que quieres cancelar a{' '}
              <strong className="text-white">{selectedCustomer.customer_name}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={isLoading}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-semibold text-white transition-all hover:bg-white/10 disabled:opacity-40"
              >
                No, volver
              </button>
              <button
                onClick={handleCancelCustomer}
                disabled={isLoading}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 font-semibold text-white transition-all hover:bg-red-400 disabled:opacity-40"
              >
                {isLoading ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick guide */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Guía Rápida</p>
        <ol className="space-y-2 text-xs text-slate-400">
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">1</span>
            <span>Haz clic en &quot;Llamar Siguiente&quot;</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">2</span>
            <span>Atiende al cliente</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">3</span>
            <span>Selecciona al cliente en la lista</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">4</span>
            <span>Marca como completado</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-[10px] font-bold text-amber-400">+</span>
            <span className="text-amber-400/80">Usa &quot;Agregar Walk-in&quot; para clientes sin cita</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
