'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { joinQueue } from '@/app/lib/serverActions';
import type { JoinQueueResult } from '@/app/types';

interface QueueEntryFormProps {
  onSuccess: (data: JoinQueueResult) => void;
}

export function QueueEntryForm({ onSuccess }: QueueEntryFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Por favor, ingresa tu nombre');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('Por favor, ingresa tu teléfono');
      return;
    }

    setIsLoading(true);
    try {
      const result = await joinQueue(formData.name, formData.phone);

      if (result.success) {
        toast.success('¡Bienvenido a la cola!');
        setFormData({ name: '', phone: '' });
        onSuccess(result);
      } else {
        toast.error(result.error || 'Error al unirse a la cola');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg shadow-lg shadow-blue-500/20">
          ✂️
        </div>
        <h2 className="mt-3 text-2xl font-bold text-slate-800">Únete a la Cola</h2>
        <p className="text-sm text-slate-500 mt-1">Ingresa tus datos para reservar tu turno</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            Tu Nombre
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej: Juan"
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-800 placeholder-slate-400 transition-all focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
            Tu Teléfono
          </label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Ej: 123-456-7890"
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-800 placeholder-slate-400 transition-all focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            disabled={isLoading}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/40 hover:from-blue-400 hover:to-indigo-500 disabled:opacity-50 disabled:shadow-none"
      >
        {isLoading ? 'Uniéndote...' : 'Entrar a la Cola'}
      </button>
    </form>
  );
}
