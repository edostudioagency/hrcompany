import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearTimers();

    if (!user) return;

    // Set timeout for auto-logout
    timeoutRef.current = setTimeout(() => {
      console.warn('Session expired due to inactivity');
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
