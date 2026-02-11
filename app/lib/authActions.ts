'use server';

import { cookies } from 'next/headers';
import type { Barber, BarberSession, ActionResult } from '@/app/types';

// ─── Barber credentials (server-side ONLY, never shipped to client) ───

const BARBERS: (Barber & { password: string })[] = [
    {
        id: 'barber_1',
        name: 'Carlos',
        email: 'carlos@barbershop.com',
        password: 'demo123',
    },
    {
        id: 'barber_2',
        name: 'Miguel',
        email: 'miguel@barbershop.com',
        password: 'demo123',
    },
    {
        id: 'barber_3',
        name: 'Juan',
        email: 'juan@barbershop.com',
        password: 'demo123',
    },
];

// ─── Session cookie config ───

const SESSION_COOKIE = 'barber_session';
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

/**
 * Login barbero — valida credenciales en el SERVIDOR.
 * Sets an httpOnly cookie (cannot be read by client JS).
 */
export async function loginBarber(
    email: string,
    password: string
): Promise<ActionResult<BarberSession>> {
    try {
        if (!email || !password) {
            return { success: false, error: 'Email y contraseña son requeridos' };
        }

        const barber = BARBERS.find(
            (b) => b.email === email && b.password === password
        );

        if (!barber) {
            return { success: false, error: 'Email o contraseña incorrectos' };
        }

        const session: BarberSession = {
            barberId: barber.id,
            barberName: barber.name,
            email: barber.email,
        };

        // Set httpOnly cookie — NOT accessible from JavaScript
        const cookieStore = await cookies();
        cookieStore.set(SESSION_COOKIE, JSON.stringify(session), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: SESSION_MAX_AGE,
        });

        return { success: true, data: session };
    } catch (error) {
        console.error('Error in loginBarber:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

/**
 * Logout barbero — elimina la cookie de sesión.
 */
export async function logoutBarber(): Promise<ActionResult> {
    try {
        const cookieStore = await cookies();
        cookieStore.delete(SESSION_COOKIE);
        return { success: true };
    } catch (error) {
        console.error('Error in logoutBarber:', error);
        return { success: false, error: 'Error al cerrar sesión' };
    }
}

/**
 * Get the currently authenticated barber from the httpOnly cookie.
 * Returns null if not authenticated.
 * This is called by admin server actions to verify auth.
 */
export async function getAuthenticatedBarber(): Promise<BarberSession | null> {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(SESSION_COOKIE);

        if (!sessionCookie?.value) {
            return null;
        }

        const session = JSON.parse(sessionCookie.value) as BarberSession;

        // Verify the barber ID is valid
        const barber = BARBERS.find((b) => b.id === session.barberId);
        if (!barber) {
            return null;
        }

        return session;
    } catch (error) {
        console.error('Error reading barber session:', error);
        return null;
    }
}

/**
 * Check if there's currently an active barber session.
 * Used by client components to check auth status.
 */
export async function getBarberSession(): Promise<ActionResult<BarberSession>> {
    const session = await getAuthenticatedBarber();

    if (!session) {
        return { success: false, error: 'No autenticado' };
    }

    return { success: true, data: session };
}
