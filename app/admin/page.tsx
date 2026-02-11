'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { BarberLogin } from './BarberLogin';
import { getBarberSession, logoutBarber } from '@/app/lib/authActions';
import type { BarberSession } from '@/app/types';

const AdminDashboard = dynamic(
  () => import('./AdminDashboard').then(mod => ({ default: mod.AdminDashboard })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="animate-spin">
          <div className="h-8 w-8 border-4 border-slate-700 border-t-amber-400 rounded-full"></div>
        </div>
      </div>
    ),
  }
);

export default function AdminPage() {
  const [barberSession, setBarberSession] = useState<BarberSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session via server action (reads httpOnly cookie)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const result = await getBarberSession();
        if (result.success && result.data) {
          setBarberSession(result.data);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLogin = (barberId: string, barberName: string) => {
    setBarberSession({ barberId, barberName, email: '' });
  };

  const handleLogout = async () => {
    await logoutBarber();
    setBarberSession(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="animate-spin">
          <div className="h-8 w-8 border-4 border-slate-700 border-t-amber-400 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!barberSession) {
    return <BarberLogin onSuccess={handleLogin} />;
  }

  return <AdminDashboard barberName={barberSession.barberName} onLogout={handleLogout} />;
}
