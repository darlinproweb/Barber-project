'use client';

import { useState } from 'react';
import { loginBarber } from '@/app/lib/authActions';
import toast from 'react-hot-toast';

interface BarberLoginProps {
  onSuccess: (barberId: string, barberName: string) => void;
}

export function BarberLogin({ onSuccess }: BarberLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      // Auth happens server-side — credentials NEVER touch the browser
      const result = await loginBarber(formData.email, formData.password);

      if (result.success && result.data) {
        toast.success(`¡Bienvenido ${result.data.barberName}!`);
        onSuccess(result.data.barberId, result.data.barberName);
      } else {
        toast.error(result.error || 'Email o contraseña incorrectos');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Decorative blurs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-amber-500/10 blur-[100px]"></div>
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-500/10 blur-[100px]"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-3xl shadow-lg shadow-amber-500/20">
            ✂️
          </div>
          <h1 className="mt-4 text-3xl font-bold text-white">Panel Admin</h1>
          <p className="mt-1 text-slate-400">Acceso exclusivo para barberos</p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-amber-400/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-amber-400/30"
                placeholder="tu@email.com"
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-amber-400/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-amber-400/30"
                placeholder="••••••"
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-3.5 font-bold text-slate-900 shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/40 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 disabled:shadow-none"
            >
              {isLoading ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        {/* Demo info — kept for development only */}
        <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Cuentas Demo</p>
          <div className="space-y-1.5 text-xs text-slate-500">
            <p>• <span className="text-slate-400">Carlos</span> — carlos@barbershop.com</p>
            <p>• <span className="text-slate-400">Miguel</span> — miguel@barbershop.com</p>
            <p>• <span className="text-slate-400">Juan</span> — juan@barbershop.com</p>
            <p className="mt-2 text-slate-600">Contraseña: demo123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
