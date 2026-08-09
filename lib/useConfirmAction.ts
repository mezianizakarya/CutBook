import { useCallback, useState } from "react";

import { useConfirmCountdown } from "@/lib/useConfirmCountdown";

type UseConfirmActionOptions = {
  seconds?: number;
};

/**
 * Double-press confirm: the first press arms a countdown and the label swaps to
 * "Confirm (5)"; the second press within the window runs `onConfirm`. Reverts
 * automatically at 0 and on `reset`.
 */
export function useConfirmAction(
  onConfirm: () => void,
  { seconds }: UseConfirmActionOptions = {}
) {
  const [confirming, setConfirming] = useState(false);
  const { count, start, cancel } = useConfirmCountdown({
    seconds,
    onExpire: () => setConfirming(false),
  });

  const press = useCallback(() => {
    if (confirming) {
      setConfirming(false);
      cancel();
      onConfirm();
    } else {
      setConfirming(true);
      start();
    }
  }, [confirming, onConfirm, start, cancel]);

  const reset = useCallback(() => {
    setConfirming(false);
    cancel();
  }, [cancel]);

  return { confirming, count, press, reset };
}
