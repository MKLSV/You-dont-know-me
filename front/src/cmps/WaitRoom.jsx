import React, { useEffect, useState } from "react";
import { socket } from "../socket";

export default function WaitRoom({ user, setCloseRoom, setPlayers, setCount, count, players }) {
  const [countErr, setCountErr] = useState("");

  useEffect(() => {
    socket.on("room_update", (players) => {
      setPlayers(players);
    });

    // 🔥 слушаем событие "game_start" от сервера
    socket.on("game_start", ({ count }) => {
      setCount(count);       // у всех устанавливается одинаковый count
      setCloseRoom(true);    // переход в List.jsx
    });

    return () => {
      socket.off("room_update");
      socket.off("game_start");
    };
  }, [setPlayers, setCount, setCloseRoom]);

  function checkCount() {
    if (count < 1) {
      setCountErr("ты за кого меня принимаешь, умник😑");
      return;
    } else if (count > 8) {
      setCountErr("не - ну борщить тоже не надо");
      return;
    }
    setCountErr("");

    // 🔥 передаём серверу count, выбранный хостом
    socket.emit("start_game", { roomId: user.room, count });
  }

  const handleChange = (e) => {
    const val = e.target.value;
    if (val === "") return setCount("");
    const lastChar = val.slice(-1);
    const num = Number(lastChar) || 0;
    setCount(num);
  };

  return (
    <div className="wait-room">
      <div className="roomId">
        <span>Номер Комнаты: </span>
        <span>{user.room}</span>
      </div>
      <div className="list">
        <div className="players">
          {players && players.map((player, i) => <span key={i}>{player.name}</span>)}
        </div>
        <div className="footer">
          {user.role === "host" ? (
            <div className="host">
              <div className="store-count">
                <span>Кол-во историй:</span>
                <input type="number" value={count} onChange={handleChange} />
                <p>{countErr}</p>
              </div>
              <button onClick={checkCount}>Старт</button>
            </div>
          ) : (
            <div className="player">
              <span>Ждите чо</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
