import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handleAddToast = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string; type: 'success' | 'error' | 'info' }>;
      const { message, type } = customEvent.detail;
      const id = Date.now() + Math.floor(Math.random() * 1000000);
      setToasts((prev) => [...prev, { id, message, type }]);
      
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    };

    window.addEventListener('show-toast', handleAddToast);
    return () => window.removeEventListener('show-toast', handleAddToast);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded shadow-xl border bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 overflow-hidden min-w-[280px] max-w-md`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500 shrink-0" />}
            
            <p className="text-sm font-bold tracking-tight text-slate-800 dark:text-zinc-200 flex-1 leading-tight">
              {toast.message}
            </p>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
