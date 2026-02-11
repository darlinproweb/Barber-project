/**
 * 🔔 Sistema de notificaciones del navegador + sonido
 *
 * Funcionalidad:
 * - Web Push Notifications (requiere permiso del usuario)
 * - Sound alerts (usando Web Audio API)
 * - Vibración (en dispositivos móviles)
 */

// ─── Permission Management ───

export type NotificationPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function getNotificationPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'unsupported';
    }
    return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'unsupported';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission === 'denied') {
        return 'denied';
    }

    const result = await Notification.requestPermission();
    return result;
}

// ─── Push Notifications ───

interface SendNotificationOptions {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
    vibrate?: number[];
}

export function sendNotification(options: SendNotificationOptions): Notification | null {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return null;
    }

    if (Notification.permission !== 'granted') {
        return null;
    }

    try {
        const notification = new Notification(options.title, {
            body: options.body,
            icon: options.icon || '/icons/scissors.png',
            tag: options.tag || 'barbershop-queue',
            requireInteraction: options.requireInteraction || false,
            silent: false,
        });

        // Vibrate on mobile
        if (options.vibrate && 'vibrate' in navigator) {
            navigator.vibrate(options.vibrate);
        }

        // Auto-close after 8 seconds
        setTimeout(() => notification.close(), 8000);

        // Focus window on click
        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        return notification;
    } catch (error) {
        console.error('Error sending notification:', error);
        return null;
    }
}

// ─── Predefined Notifications ───

export function notifyTurnApproaching(peopleAhead: number) {
    sendNotification({
        title: '⏳ ¡Tu turno se acerca!',
        body: `Solo ${peopleAhead} ${peopleAhead === 1 ? 'persona' : 'personas'} delante de ti. Prepárate.`,
        tag: 'turn-approaching',
        vibrate: [200, 100, 200],
    });
}

export function notifyTurnNow() {
    sendNotification({
        title: '🚨 ¡ES TU TURNO!',
        body: 'Dirígete a la barbería ahora. ¡Te están esperando!',
        tag: 'turn-now',
        requireInteraction: true,
        vibrate: [500, 200, 500, 200, 500],
    });
}

export function notifyNextInLine() {
    sendNotification({
        title: '🔜 ¡Eres el siguiente!',
        body: 'No hay nadie delante de ti. Tu turno es el próximo.',
        tag: 'next-in-line',
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300],
    });
}

export function notifyNewCustomer(customerName: string, position: number) {
    sendNotification({
        title: '👤 Nuevo cliente en la cola',
        body: `${customerName} se unió en la posición #${position}`,
        tag: 'new-customer',
        vibrate: [100],
    });
}

export function notifyServiceCancelled() {
    sendNotification({
        title: '❌ Cita cancelada',
        body: 'Tu cita ha sido cancelada.',
        tag: 'service-cancelled',
    });
}

// ─── Sound System ───

type SoundType = 'approaching' | 'your_turn' | 'new_customer' | 'success' | 'error';

const SOUND_FREQUENCIES: Record<SoundType, { freq: number[]; duration: number[]; type: OscillatorType }> = {
    approaching: {
        freq: [523, 659, 784],       // C5, E5, G5 — ascending arpeggio
        duration: [150, 150, 300],
        type: 'sine',
    },
    your_turn: {
        freq: [784, 988, 1175, 1319], // G5, B5, D6, E6 — fanfare
        duration: [200, 200, 200, 400],
        type: 'triangle',
    },
    new_customer: {
        freq: [440, 554],             // A4, C#5 — gentle ding
        duration: [100, 200],
        type: 'sine',
    },
    success: {
        freq: [523, 784],             // C5, G5 — confirmation
        duration: [150, 250],
        type: 'sine',
    },
    error: {
        freq: [330, 262],             // E4, C4 — descending
        duration: [200, 300],
        type: 'sawtooth',
    },
};

export function playSound(type: SoundType, volume = 0.3): void {
    if (typeof window === 'undefined') return;

    try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;

        const ctx = new AudioCtx();
        const config = SOUND_FREQUENCIES[type];
        let startTime = ctx.currentTime;

        config.freq.forEach((freq, i) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.type = config.type;
            oscillator.frequency.value = freq;

            gainNode.gain.setValueAtTime(volume, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + config.duration[i] / 1000);

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.start(startTime);
            oscillator.stop(startTime + config.duration[i] / 1000);

            startTime += config.duration[i] / 1000;
        });
    } catch (error) {
        // Silently fail — audio is optional
    }
}
