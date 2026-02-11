'use client';

import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex min-h-[300px] items-center justify-center p-8">
                    <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                        <p className="text-4xl mb-3">⚠️</p>
                        <h2 className="text-lg font-bold text-red-800">Algo salió mal</h2>
                        <p className="mt-2 text-sm text-red-600">
                            Ha ocurrido un error inesperado. Intenta recargar la página.
                        </p>
                        <button
                            onClick={() => this.setState({ hasError: false, error: null })}
                            className="mt-4 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-400"
                        >
                            Reintentar
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Fallback component for admin panel errors (dark theme)
 */
export function AdminErrorFallback() {
    return (
        <div className="flex min-h-[300px] items-center justify-center p-8">
            <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center backdrop-blur-xl">
                <p className="text-4xl mb-3">⚠️</p>
                <h2 className="text-lg font-bold text-white">Error en el panel</h2>
                <p className="mt-2 text-sm text-red-300">
                    No se pudo cargar el contenido. Revisa tu conexión a Supabase.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-400"
                >
                    Recargar página
                </button>
            </div>
        </div>
    );
}
