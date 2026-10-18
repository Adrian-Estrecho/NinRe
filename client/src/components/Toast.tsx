import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<{ text: string; key: number } | null>(null);
  const timer = useRef<number>(0);

  const show = useCallback((text: string) => {
    window.clearTimeout(timer.current);
    setMessage({ text, key: Date.now() });
    timer.current = window.setTimeout(() => setMessage(null), 3800);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast" role="status" aria-live="polite" hidden={!message} key={message?.key}>
        {message?.text}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
