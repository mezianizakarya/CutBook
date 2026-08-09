import { useCallback, useEffect, useRef, useState } from "react";

export type NoticeTone = "danger" | "success" | "role";

export type Notice = {
  message: string;
  tone: NoticeTone;
};

export function useNotice(duration = 3000) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, []);

  const showNotice = useCallback(
    (message: string, tone: NoticeTone = "success") => {
      setNotice({ message, tone });
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
      timeout.current = setTimeout(() => setNotice(null), duration);
    },
    [duration]
  );

  return { notice, showNotice };
}
