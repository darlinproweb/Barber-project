'use client';

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center backdrop-blur-xl">
                <p className="text-5xl mb-4">⚠️</p>
                <h2 className="text-xl font-bold text-white">Error en el panel</h2>
                <p className="mt-2 text-sm text-red-300">
                    No se pudo cargar el panel de administración. Revisa tu conexión.
                </p>
                {error.message && (
                    <p className="mt-3 rounded-xl bg-black/30 px-3 py-2 text-xs text-red-400 font-mono">
                        {error.message}
                    </p>
                )}
                <button
                    onClick={reset}
                    className="mt-6 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-2.5 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/40"
                >
                    Reintentar
                </button>
            </div>
        </div>
    );
}
