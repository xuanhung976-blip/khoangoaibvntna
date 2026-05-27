import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

// We implement a simple event-based system for this example to avoid complex context wrapping in the limited file output
// Ideally this would be a Context
const listeners: ((toast: Toast) => void)[] = [];

export const showToast = (message: string, type: ToastType = 'info') => {
    const toast = { id: Date.now(), message, type };
    listeners.forEach(l => l(toast));
};

export const ToastContainer: React.FC = () => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        const handler = (toast: Toast) => {
            setToasts(prev => [...prev, toast]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== toast.id));
            }, 3000);
        };
        listeners.push(handler);
        return () => {
            const idx = listeners.indexOf(handler);
            if(idx > -1) listeners.splice(idx, 1);
        };
    }, []);

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map(t => (
                <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-fade-in-up ${
                    t.type === 'success' ? 'bg-green-600' : 
                    t.type === 'error' ? 'bg-red-600' : 
                    t.type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'
                }`}>
                    {t.message}
                </div>
            ))}
        </div>
    );
};