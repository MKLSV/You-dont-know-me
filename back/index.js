// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

const PORT = 5000;

// Простая in-memory структура комнат
const rooms = {};
// rooms[roomId] = {
//   players: [{ id, name, role, ready:false, histories: [] }],
//   stories: [{ id, text, ownerId }],
//   storyIndex: 0,
//   started: false,
//   choices: { storyId: { chooserId: chosenPlayerId, ... } }
// }

function makeRoomId() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    // join_room: { name, role, roomId? }
    socket.on('join_room', ({ name, role, roomId }) => {
        if (role === 'host') {
            // создаём комнату
            const newRoomId = makeRoomId();
            rooms[newRoomId] = {
                players: [{ id: socket.id, name, role, ready: false, histories: [], score: 0 }],
                stories: [],
                storyIndex: 0,
                started: false,
                choices: {}
            };
            socket.join(newRoomId);
            socket.emit('room_joined', { roomId: newRoomId, players: rooms[newRoomId].players });
            io.to(newRoomId).emit('room_update', rooms[newRoomId].players);
            console.log(`Host ${name} created room ${newRoomId}`);
            return;
        }

        // player joins existing room
        const room = rooms[roomId];
        if (!room) {
            socket.emit('room_error', { message: 'Комната не найдена' });
            return;
        }

        room.players.push({ id: socket.id, name, role: 'player', ready: false, histories: [], score: 0 });
        socket.join(roomId);
        io.to(roomId).emit('room_joined', { roomId, players: room.players });
        io.to(roomId).emit('room_update', room.players);
        console.log(`${name} joined room ${roomId}`);
    });

    // start_game: { roomId }
    socket.on('start_game', ({ roomId, count }) => {
        const room = rooms[roomId];
        if (!room) return;
        room.started = true;
        room.count = count; // сохраняем выбранное количество историй

        // попросить всех игроков отправить истории
        io.to(roomId).emit('game_start', { count });
        console.log(`Game started in ${roomId} with ${count} stories`);
        console.log(`Game started in ${roomId}`);
    });

    // submit_histories: { roomId, histories }
    socket.on('submit_histories', ({ roomId, histories }) => {
        const room = rooms[roomId];
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;
        player.histories = histories; // массив строк
        player.ready = true;

        io.to(roomId).emit('room_update', room.players);

        // если все players.ready === true => агрегируем истории и запускаем раунды
        const allReady = room.players.every(p => p.ready === true);
        if (allReady) {
            // соберём stories
            room.stories = [];
            room.players.forEach(p => {
                (p.histories || []).forEach((text, idx) => {
                    room.stories.push({
                        id: `${p.id}_${idx}`,
                        text,
                        ownerId: p.id
                    });
                });
            });
            // перемешаем (shuffle)
            for (let i = room.stories.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [room.stories[i], room.stories[j]] = [room.stories[j], room.stories[i]];
            }
            room.storyIndex = 0;
            room.choices = {}; // очистить
            io.to(roomId).emit('all_histories_submitted', { totalStories: room.stories.length });
            // отправим первую историю
            if (room.stories.length > 0) {
                const story = room.stories[room.storyIndex];
                io.to(roomId).emit('new_story', story);
            } else {
                io.to(roomId).emit('game_over', { leaderboard: [] });
            }
        }
    });

    socket.on('player_ready', ({ roomId }) => {
        const room = rooms[roomId];
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (player) player.ready = true;
        const notReady = room.players.filter(p => p.ready === false);
        io.to(roomId).emit('room_update', notReady);
        // Если все готовы — начинаем игру
        if (room.players.every(p => p.ready)) {
            io.to(roomId).emit('all_ready');
        }
    });
    // choose_player: { roomId, storyId, chosenPlayerId }
    socket.on('choose_player', ({ roomId, storyId, chosenPlayerId }) => {
  const room = rooms[roomId];
  if (!room) return console.log("❌ Room not found:", roomId);

  const player = room.players.find(p => p.id === socket.id);
  if (!player) return;

  // сохранить выбор
  room.choices[storyId] = room.choices[storyId] || {};
  room.choices[storyId][socket.id] = chosenPlayerId;

  // проверяем — все ли выбрали
  const choosersCount = Object.keys(room.choices[storyId]).length;
  if (choosersCount < room.players.length) {
    io.to(roomId).emit('choice_progress', { storyId, done: choosersCount, total: room.players.length });
    return;
  }

  // все выбрали — считаем результат
  const story = room.stories.find(s => s.id === storyId);
  if (!story) return console.log("❌ Story not found:", storyId);

  const ownerId = story.ownerId;
  const owner = room.players.find(p => p.id === ownerId);
  const answers = [];

  // считаем очки
  let wrongGuesses = 0;
  for (const [chooserId, chosenId] of Object.entries(room.choices[storyId])) {
    const chooser = room.players.find(p => p.id === chooserId);
    const correct = chosenId === ownerId;

    if (chooserId !== ownerId) { // автор не получает очки за свой выбор
      if (correct) {
        chooser.score = (chooser.score || 0) + 1; // +1 за правильный ответ
      } else {
        wrongGuesses++;
      }
    }

    answers.push({
      chooserId,
      chosenId,
      correct,
      gained: correct ? 1 : 0
    });
  }

  // автор получает очки за тех, кто ошибся
  owner.score = (owner.score || 0) + wrongGuesses;

  // отправляем результат
  io.to(roomId).emit('round_result', {
    storyId,
    ownerId,
    answers,
    scores: room.players.map(p => ({ id: p.id, name: p.name, score: p.score || 0 }))
  });

  // сбрасываем ready, ждём подтверждение "продолжаем"
  room.players.forEach(p => (p.ready = false));
});


// Когда игрок нажимает "Продолжаем"
socket.on('ready_for_next', ({ roomId }) => {
  const room = rooms[roomId];
  if (!room) return;

  const player = room.players.find(p => p.id === socket.id);
  if (!player) return;
  player.ready = true;

  const allReady = room.players.every(p => p.ready);
  if (!allReady) return io.to(roomId).emit('room_update', room.players);

  // все готовы → новая история или конец игры
  room.storyIndex++;
  if (room.storyIndex < room.stories.length) {
    const nextStory = room.stories[room.storyIndex];
    io.to(roomId).emit('new_story', nextStory);
  } else {
    const leaderboard = [...room.players].sort((a, b) => (b.score || 0) - (a.score || 0));
    io.to(roomId).emit('game_over', { leaderboard });
  }
});

    socket.on('disconnect', () => {
        console.log('disconnect', socket.id);
        // убрать игрока из любой комнаты
        for (const [roomId, room] of Object.entries(rooms)) {
            const idx = room.players.findIndex(p => p.id === socket.id);
            if (idx !== -1) {
                room.players.splice(idx, 1);
                io.to(roomId).emit('room_update', room.players);
                // если комната опустела — удалим её
                if (room.players.length === 0) {
                    delete rooms[roomId];
                    console.log('deleted empty room', roomId);
                }
            }
        }
    });
});

server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
