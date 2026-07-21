/**
 * Toast helpers — react-hot-toast
 * @see https://react-hot-toast.com/docs
 *
 * Uso:
 *   import { notify, notifyPromise } from "../lib/toast";
 *   notify.success("Guardado");
 *   await notifyPromise(api.doThing(), { loading: "…", success: "OK", error: (e) => e.message });
 */
import toast from "react-hot-toast";

const base = {
  style: {
    background: "#12121c",
    color: "#f4f4f8",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "14px",
    fontSize: "13px",
    fontWeight: 500,
    padding: "10px 14px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
  },
  className: "font-sans",
};

export const notify = {
  success(message, opts = {}) {
    return toast.success(message, { ...base, duration: 3200, ...opts });
  },
  error(message, opts = {}) {
    return toast.error(message, { ...base, duration: 4500, ...opts });
  },
  info(message, opts = {}) {
    return toast(message, { ...base, duration: 3200, ...opts });
  },
  loading(message, opts = {}) {
    return toast.loading(message, { ...base, ...opts });
  },
  dismiss(id) {
    toast.dismiss(id);
  },
};

/**
 * Promise toast: loading → success | error.
 * @template T
 * @param {Promise<T>} promise
 * @param {{ loading: string, success: string|((data:T)=>string), error?: string|((err:any)=>string) }} messages
 * @returns {Promise<T>}
 */
export function notifyPromise(promise, messages) {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error:
        messages.error ||
        ((err) => err?.message || String(err) || "Error"),
    },
    base
  );
}

export { toast };
export default notify;
