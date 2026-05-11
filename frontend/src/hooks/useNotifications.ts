import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useAuth } from '../store/useAuth';
import { useNotificationStore } from '../store/useNotificationStore';

export const useNotifications = () => {
    const { token, user } = useAuth();
    const addNotification = useNotificationStore((state) => state.addNotification);
    const [socket, setSocket] = useState<any>(null);
    const socketRef = useRef<any>(null);

    useEffect(() => {
        if (!token || !user) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            return;
        }

        // Initialize socket connection
        const socket = io('/notifications', {
            auth: { token },
            transports: ['websocket'],
            path: '/socket.io',
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to notifications server');
        });

        socket.on('notification', (payload: any) => {
            console.log('New notification received');

            addNotification({
                type: payload.type,
                data: payload.data,
                timestamp: payload.timestamp || new Date().toISOString(),
            });

            if (Notification.permission === 'granted') {
                const title = payload.type === 'MARKETPLACE_OPPORTUNITY'
                  ? 'Urgence: Garde Disponible'
                  : 'Mediplan Notification';

                const body = payload.type === 'MARKETPLACE_OPPORTUNITY'
                  ? `Une garde en ${payload.data.facilityName} est disponible le ${payload.data.date}. Majoration: ${payload.data.bonus || 'Standard'}`
                  : payload.type === 'LEAVE_REQUESTED'
                  ? `Nouvelle demande de congé de ${payload.data.agentName}`
                  : `Votre demande de congé a été ${payload.data.status === 'APPROVED' ? 'acceptée' : 'refusée'}`;

                const options = { body, icon: '/icon-192x192.png' };

                // On utilise l'API Notification native (si app ouverte)
                new Notification(title, options);
            }
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from notifications server');
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [token, user]);

    useEffect(() => {
        // Enregistrement du Service Worker pour les notifications Push (en arrière-plan)
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.register('/sw.js').then(function(swReg) {
                console.log('Service Worker for Push Notifications registered', swReg);
            }).catch(function(error) {
                console.error('Service Worker Error', error);
            });
        }

        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    return null;
};
