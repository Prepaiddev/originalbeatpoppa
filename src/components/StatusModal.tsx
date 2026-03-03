"use client";

import { CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'loading' | 'auth';
  title: string;
  message: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export default function StatusModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  autoClose = false,
  autoCloseDelay = 3000,
  actionLabel,
  onAction
}: StatusModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      if (autoClose && type !== 'loading') {
        const timer = setTimeout(() => {
          onClose();
        }, autoCloseDelay);
        return () => clearTimeout(timer);
      }
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose, type]);

  if (!isVisible && !isOpen) return null;

  const icons = {
    success: <CheckCircle2 className="text-green-500 w-12 h-12" />,
    error: <AlertCircle className="text-red-500 w-12 h-12" />,
    loading: <Loader2 className="text-primary w-12 h-12 animate-spin" />,
    auth: <AlertCircle className="text-blue-500 w-12 h-12" />
  };

  const colors = {
    success: 'border-green-500/20 bg-green-500/5',
    error: 'border-red-500/20 bg-red-500/5',
    loading: 'border-primary/20 bg-primary/5',
    auth: 'border-blue-500/20 bg-blue-500/5'
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={type !== 'loading' ? onClose : undefined} />
      
      <div className={`relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl transform transition-all duration-500 ${isOpen ? 'scale-100 translate-y-0 rotate-0' : 'scale-90 translate-y-12 rotate-2'}`}>
        {type !== 'loading' && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-full"
          >
            <X size={20} />
          </button>
        )}

        <div className="flex flex-col items-center text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${colors[type]} animate-in zoom-in duration-500`}>
            {icons[type]}
          </div>
          
          <h3 className="text-2xl font-black text-white mb-2 tracking-tight">{title}</h3>
          <p className="text-zinc-400 font-medium leading-relaxed">{message}</p>
          
          {type !== 'loading' && (
            <button 
              onClick={onAction || onClose}
              className={`mt-8 w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                type === 'success' ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20' : 
                type === 'auth' ? 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20' :
                'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
              }`}
            >
              {actionLabel || (type === 'success' ? 'Great' : type === 'auth' ? 'Login Now' : 'Try Again')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
