import { useCallback, useState } from "react";
import ConfirmModal from "../components/ConfirmModal";

/**
 * Reemplazo de window.confirm con UI propia.
 *
 * const { confirm, ConfirmHost } = useConfirm();
 * const ok = await confirm({ title, message, danger: true });
 * return <>…<ConfirmHost /></>
 */
export function useConfirm() {
  const [state, setState] = useState(null);

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setState({
        ...opts,
        resolve,
      });
    });
  }, []);

  const close = useCallback((value) => {
    setState((prev) => {
      prev?.resolve?.(value);
      return null;
    });
  }, []);

  const ConfirmHost = useCallback(
    () => (
      <ConfirmModal
        open={!!state}
        title={state?.title || ""}
        message={state?.message || ""}
        confirmLabel={state?.confirmLabel}
        cancelLabel={state?.cancelLabel}
        danger={!!state?.danger}
        busy={!!state?.busy}
        onCancel={() => close(false)}
        onConfirm={() => close(true)}
      />
    ),
    [state, close]
  );

  return { confirm, ConfirmHost };
}
