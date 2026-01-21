import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../store/useAuth';
import { useNotificationStore } from '../store/useNotificationStore';

export const useNotifications = () => {
    const { token, user } = useAuth();
    const addNotification = useNotificationStore((state) => state.addNotification);
    const socketRef = useRef<Socket | null>(null);

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
            path: '/socket.io', // Ensure path matches default or backend config if customized
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to notifications server');
        });

        socket.on('notification', (payload) => {
            console.log('New notification received:', payload);

            // Add to zustand store
            addNotification({
                type: payload.type,
                data: payload.data,
                timestamp: payload.timestamp || new Date().toISOString(),
            });

            // Browser notification
            if (Notification.permission === 'granted') {
                const title = 'Mediplan Notification';
                const options = {
                    body: payload.type === 'LEAVE_REQUESTED'
                        ? `Nouvelle demande de congé de ${payload.data.agentName}`
                        : `Votre demande de congé a été ${payload.data.status === 'APPROVED' ? 'acceptée' : 'refusée'}`,
                };
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
        // Request notification permission on mount
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    return null;
};
