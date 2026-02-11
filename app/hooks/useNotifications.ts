'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    getNotificationPermission,
    requestNotificationPermission,
    notifyTurnApproaching,
    notifyNextInLine,
    playSound,
    type NotificationPermission,
} from '@/app/lib/notifications';

interface UseQueueNotificationsOptions {
    enabled?: boolean;
}

interface UseQueueNotificationsReturn {
    permission: NotificationPermission;
    requestPermission: () => Promise<void>;
    notifyPositionChange: (position: number, previousPosition: number | null) => void;
    isSupported: boolean;
}

/**
 * Hook for managing queue notifications for customers.
 * Tracks position changes and sends appropriate notifications.
 */
export function useQueueNotifications(
    options: UseQueueNotificationsOptions = {}
): UseQueueNotificationsReturn {
    const { enabled = true } = options;
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const lastNotifiedPosition = useRef<number | null>(null);
    const hasNotifiedTurn = useRef(false);

    useEffect(() => {
        setPermission(getNotificationPermission());
    }, []);

    const requestPermission = useCallback(async () => {
        const result = await requestNotificationPermission();
        setPermission(result);
    }, []);

    const notifyPositionChange = useCallback(
        (position: number, previousPosition: number | null) => {
            if (!enabled) return;

            const peopleAhead = Math.max(0, position - 1);

            // Avoid duplicate notifications for the same position
            if (lastNotifiedPosition.current === position) return;
            lastNotifiedPosition.current = position;

            // It's your turn! (position 1 and status changing to in_service is handled separately)
            if (peopleAhead === 0 && !hasNotifiedTurn.current) {
                hasNotifiedTurn.current = true;
                notifyNextInLine();
                playSound('your_turn', 0.4);
                return;
            }

            // 1 person ahead
            if (peopleAhead === 1) {
                notifyTurnApproaching(1);
                playSound('approaching', 0.3);
                return;
            }

            // 2 people ahead — first alert
            if (peopleAhead === 2) {
                notifyTurnApproaching(2);
                playSound('approaching', 0.2);
                return;
            }

            // Position improved (moved up in queue) — subtle sound
            if (previousPosition !== null && position < previousPosition) {
                playSound('success', 0.15);
            }
        },
        [enabled]
    );

    return {
        permission,
        requestPermission,
        notifyPositionChange,
        isSupported: permission !== 'unsupported',
    };
}

/**
 * Hook for admin notifications (new customers joining).
 */
export function useAdminNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        setPermission(getNotificationPermission());
    }, []);

    const requestPermission = useCallback(async () => {
        const result = await requestNotificationPermission();
        setPermission(result);
    }, []);

    return {
        permission,
        requestPermission,
        isSupported: permission !== 'unsupported',
    };
}
