import { useCallback, useEffect, useRef, useState } from "react";

type UseConfirmCountdownOptions = {
  onExpire?: () => void;
  seconds?: number;
};

export function useConfirmCountdown({
  onExpire,
  seconds = 5,
}: UseConfirmCountdownOptions = {}) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(() => {
    let remaining = seconds;
    setCount(seconds);
    cancel();
    timer.current = setInterval(() => {
      remaining -= 1;
      setCount(remaining);
      if (remaining <= 0) {
        cancel();
        setCount(seconds);
        onExpire?.();
      }
    }, 1000);
  }, [seconds, cancel, onExpire]);

  return { count, start, cancel };
}
