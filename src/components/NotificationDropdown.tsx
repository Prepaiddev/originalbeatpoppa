"use client";

import { useEffect, useRef, useState } from 'react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Bell, Check, ExternalLink, Info, DollarSign, UserPlus, Music, Trash2, Heart } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationDropdown({ isAdmin = false }: { isAdmin?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, profile } = useAuthStore();
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, subscribeToNotifications } = useNotificationStore();

  useEffect(() => {
    if (user) {
      fetchNotifications(user.id, isAdmin);
      
      const unsubscribe = subscribeToNotifications(user.id, isAdmin);
      return () => unsubscribe();
    }
  }, [user, isAdmin]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'sale': return <DollarSign className="text-green-500" size={16} />;
      case 'user_signup': return <UserPlus className="text-blue-500" size={16} />;
      case 'withdrawal_request': return <DollarSign className="text-yellow-500" size={16} />;
      case 'verification_request': return <Check className="text-purple-500" size={16} />;
      case 'beat_submission': return <Music className="text-primary" size={16} />;
      case 'follow': return <UserPlus className="text-blue-500" size={16} />;
      case 'favorite': return <Heart className="text-red-500" size={16} />;
      default: return <Info className="text-zinc-500" size={16} />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-all active:scale-95 relative"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="font-black uppercase text-xs tracking-widest text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => user && markAllAsRead(user.id, isAdmin)}
                className="text-[10px] font-bold text-primary hover:underline uppercase"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-zinc-800/50">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-4 hover:bg-zinc-800/30 transition-colors relative group ${!notification.is_read ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className="mt-1 w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700/50">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className={`text-sm font-black truncate ${!notification.is_read ? 'text-white' : 'text-zinc-400'}`}>
                            {notification.title}
                          </p>
                          <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3">
                          {notification.link && (
                            <Link 
                              href={notification.link}
                              onClick={() => setIsOpen(false)}
                              className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest"
                            >
                              View <ExternalLink size={10} />
                            </Link>
                          )}
                          {!notification.is_read && (
                            <button 
                              onClick={() => markAsRead(notification.id, isAdmin)}
                              className="text-[10px] font-bold text-zinc-400 hover:text-white uppercase tracking-widest"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-600 mx-auto mb-4">
                  <Bell size={24} />
                </div>
                <p className="text-zinc-500 text-sm font-medium">No notifications yet.</p>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-zinc-950/50 border-t border-zinc-800 text-center">
            <button className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-primary transition-colors">
              View All History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
