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
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.9, x: 50 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: 50, transition: { duration: 0.22 } }}
            transition={{
              type: 'spring',
              stiffness: 320,
              damping: 24,
              layout: { type: 'spring', stiffness: 350, damping: 28 }
            }}
            className={`pointer-events-auto relative flex items-center gap-3 px-4 py-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-slate-200 dark:border-zinc-800 overflow-hidden min-w-[290px] max-w-md select-none`}
          >
            {/* Ambient left colored accent bar */}
            <div 
              className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                toast.type === 'success' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                toast.type === 'error' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' :
                'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
              }`}
            />

            <div className="pl-1.5 flex items-center gap-2.5 flex-1 min-w-0">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500 shrink-0" />}
              
              <p className="text-xs font-bold tracking-tight text-slate-800 dark:text-zinc-100 flex-1 leading-normal break-words">
                {toast.message}
              </p>
            </div>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 shrink-0 cursor-pointer"
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
