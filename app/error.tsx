'use client';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
            <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg">
                <p className="text-5xl mb-4">😵</p>
                <h2 className="text-xl font-bold text-slate-800">Algo salió mal</h2>
                <p className="mt-2 text-sm text-slate-500">
                    Ha ocurrido un error inesperado. Intenta de nuevo.
                </p>
                {error.message && (
                    <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 font-mono">
                        {error.message}
                    </p>
                )}
                <button
                    onClick={reset}
                    className="mt-6 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/40"
                >
                    Reintentar
                </button>
            </div>
        </div>
    );
}
