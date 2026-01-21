import React, { useState } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useNotificationStore } from '../store/useNotificationStore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const NotificationBell: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();

    const unreadCount = notifications.filter(n => !n.read).length;

    const getMessage = (notification: any) => {
        const { type, data } = notification;
        if (type === 'LEAVE_REQUESTED') {
            return (
                <p className="text-sm">
                    <span className="font-semibold text-blue-400">{data.agentName}</span> a demandé un congé ({data.type}).
                </p>
            );
        }
        if (type === 'LEAVE_PROCESSED') {
            return (
                <p className="text-sm">
                    Votre demande de congé a été <span className={cn("font-semibold", data.status === 'APPROVED' ? "text-green-400" : "text-red-400")}>
                        {data.status === 'APPROVED' ? 'APPROUVÉE' : 'REFUSÉE'}
                    </span>.
                </p>
            );
        }
        return <p className="text-sm text-gray-400">Nouvelle notification</p>;
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-white transition-colors focus:outline-none"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 rounded-xl border border-white/10 bg-[#0f1115]/95 backdrop-blur-xl shadow-2xl z-20 overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="font-semibold text-white">Notifications</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => markAllAsRead()}
                                    title="Tout marquer comme lu"
                                    className="p-1 text-gray-400 hover:text-white transition-colors"
                                >
                                    <Check size={16} />
                                </button>
                                <button
                                    onClick={() => clearAll()}
                                    title="Tout effacer"
                                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="max-height-[400px] overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 italic text-sm">
                                    Aucune notification
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => markAsRead(notification.id)}
                                        className={cn(
                                            "p-4 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5",
                                            !notification.read && "bg-blue-500/5 border-l-2 border-l-blue-500"
                                        )}
                                    >
                                        {getMessage(notification)}
                                        <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
                                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true, locale: fr })}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationBell;
