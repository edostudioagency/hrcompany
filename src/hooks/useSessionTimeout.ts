import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 5 * 60 * 1000; // Warning 5 minutes before timeout
const WARNING_AT_MS = IDLE_TIMEOUT_MS - WARNING_BEFORE_MS;
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningToastRef = useRef<string | number | null>(null);

  const dismissWarning = useCallback(() => {
    if (warningToastRef.current !== null) {
      toast.dismiss(warningToastRef.current);
      warningToastRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    dismissWarning();
  }, [dismissWarning]);

  const resetTimer = useCallback(() => {
    clearTimers();

    if (!user) return;

    // Show warning 5 minutes before timeout
    warningRef.current = setTimeout(() => {
      warningToastRef.current = toast.warning(
        'Votre session expire dans 5 minutes. Interagissez avec la page pour rester connecté.',
        { duration: WARNING_BEFORE_MS, id: 'session-warning' }
      );
    }, WARNING_AT_MS);

    // Set timeout for auto-logout
    timeoutRef.current = setTimeout(() => {
      logger.warn('Session expired due to inactivity');
      toast.error('Session expirée pour inactivité', { id: 'session-expired' });
      signOut();
    }, IDLE_TIMEOUT_MS);
  }, [user, signOut, clearTimers]);

  useEffect(() => {
    if (!user) {
      clearTimers();
      return;
    }

    // Start the timer
    resetTimer();

    // Reset timer on user activity
    const handleActivity = () => resetTimer();

    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [user, resetTimer, clearTimers]);
}
