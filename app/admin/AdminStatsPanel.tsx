'use client';

import { useState, useEffect } from 'react';
import { getAdminStats } from '@/app/lib/adminActions';
import type { QueueItem, AdminStats } from '@/app/types';

interface AdminStatsPanelProps {
  queue: QueueItem[];
}

export function AdminStatsPanel({ queue }: AdminStatsPanelProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await getAdminStats();
        if (result.success && result.stats) {
          setStats(result.stats);
        } else {
          console.error('Error fetching stats:', result.error);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [queue]);

  if (!stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5"></div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: 'En Cola',
      value: stats.total_in_queue,
      icon: '👥',
      color: 'from-blue-500/20 to-blue-600/10 text-blue-400',
      border: 'border-blue-500/20',
    },
    {
      label: 'Atendidos Hoy',
      value: stats.total_served_today,
      icon: '✅',
      color: 'from-emerald-500/20 to-emerald-600/10 text-emerald-400',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Tiempo Promedio',
      value: `${stats.avg_service_time} min`,
      icon: '⏱️',
      color: 'from-amber-500/20 to-amber-600/10 text-amber-400',
      border: 'border-amber-500/20',
    },
    {
      label: 'Espera Estimada',
      value: `${stats.estimated_wait_time} min`,
      icon: '⏳',
      color: 'from-purple-500/20 to-purple-600/10 text-purple-400',
      border: 'border-purple-500/20',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card) => (
        <div
          key={card.label}
          className={`rounded-2xl border ${card.border} bg-gradient-to-br ${card.color} p-4 backdrop-blur-xl`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">{card.label}</p>
            <span className="text-lg">{card.icon}</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
