import { useEffect, useState } from "react";
import { io } from "socket.io-client";

// hooks/useSocket.js
export const useSocket = (serverUrl = 'http://localhost:5000') => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [hostRoomId, setHostRoomId] = useState(null); // ← добавляем состояние для ID комнаты хоста

    useEffect(() => {
        const newSocket = io(serverUrl);
        setSocket(newSocket);

        // Обработчики событий
        newSocket.on('hostid', (data) => {
            console.log('Получен ID комнаты хоста:', data.id);
            setHostRoomId(data.id); // Сохраняем ID комнаты

            // Можно также показать уведомление пользователю
            //   setMessages(prev => [...prev, {
            //     type: 'system',
            //     username: 'Система',
            //     message: `Комната создана! ID: ${data.id}`,
            //     timestamp: new Date()
            //   }]);
        });

        // ... остальные обработчики

        return () => {
            newSocket.disconnect();
        };
    }, [serverUrl]);

    // Функция для создания комнаты (хоста)
    const createRoom = (role, name, room) => {
        console.log(role, name, room)
        if (socket && name && room) {
            socket.emit('join_room', {
                roomId: room,
                username: name,
                type: role  
            });
        }
    };

    // Функция для присоединения к комнате (участника)
    const joinRoom = (roomId, username) => {
        if (socket && roomId && username) {
            socket.emit('join_room', {
                roomId: roomId,
                username: username,
                type: 'participant'
            });
        }
    };
    const checkRoom = (roomId) => {
        if (socket && roomId) {
            socket.emit('check_room', {
                roomId
            });
        }
    };

    return {
        socket,
        isConnected,
        currentRoom,
        hostRoomId, // ← возвращаем ID комнаты
        createRoom,
        joinRoom,
        checkRoom,
        // ... остальные функции
    };
};