/**
 * useTimer.js
 * Countdown timer for mock exams and practice sessions.
 * Counts down from `initialSeconds` to 0, calls onExpire when done.
 *
 * Usage:
 *   const { timeLeft, formatted, percentLeft, isExpired, pause, resume, reset } = useTimer(5400, handleExpire);
 *
 * NOTE: Pass a stable callback (useRef pattern or useCallback) to avoid re-renders.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

function useTimer(initialSeconds, onExpire) {
  const [timeLeft,  setTimeLeft]  = useState(initialSeconds);
  const [running,   setRunning]   = useState(true);

  // Keep onExpire in a ref so the interval closure never goes stale
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const intervalRef = useRef(null);

  useEffect(() => {
    if (!running || timeLeft <= 0) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          // Use ref so we always call the latest callback
          onExpireRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [running]); // only re-run when running changes, NOT on onExpire change

  const pause  = useCallback(() => setRunning(false), []);
  const resume = useCallback(() => { if (timeLeft > 0) setRunning(true); }, [timeLeft]);
  const reset  = useCallback((secs = initialSeconds) => {
    setTimeLeft(secs);
    setRunning(true);
  }, [initialSeconds]);

  // Format: HH:MM:SS or MM:SS
  const hours   = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const pad = (n) => String(n).padStart(2, '0');

  const formatted = hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;

  const percentLeft = initialSeconds > 0
    ? Math.max(0, (timeLeft / initialSeconds) * 100)
    : 0;

  return {
    timeLeft,
    formatted,
    percentLeft,
    isExpired:  timeLeft === 0,
    isRunning:  running,
    pause,
    resume,
    reset,
  };
}

export default useTimer;
