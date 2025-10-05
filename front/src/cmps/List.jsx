import React, { useEffect, useState } from "react";
import { socket } from "../socket";

export default function List({ count = 4, user, setUser, players, setPlayersReady }) {
  const [values, setValues] = useState(Array(count).fill(""));
  const [waiting, setWaiting] = useState(false);
  const [roomPlayers, setRoomPlayers] = useState(players || []);

  useEffect(() => {
    // если count меняется, расширяем/сужаем массив, сохраняя существующие значения
    setValues(prev => {
      const newArr = Array(count).fill("");
      for (let i = 0; i < Math.min(prev.length, newArr.length); i++) newArr[i] = prev[i];
      return newArr;
    });
  }, [count]);

  useEffect(() => {
    socket.on("all_histories_submitted", () => {
      setWaiting(true);
    });

    return () => {
      socket.off("all_histories_submitted");
    };
  }, []);

  useEffect(() => {
    // обновление списка игроков
    socket.on("room_update", (updatedPlayers) => {
      
      setRoomPlayers(updatedPlayers);
    });

    // когда все готовы
    socket.on("all_ready", () => {
      console.log("📩 Получено all_ready");
      setPlayersReady(true);
    });

    return () => {
      socket.off("room_update");
      socket.off("all_ready");
    };
  }, [setPlayersReady]);

  const handleChange = (index, newValue) => {
    const updated = [...values];
    updated[index] = newValue;
    setValues(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // отправляем массив историй серверу
    const updatedUser = { ...user, histories: values };
    setUser(updatedUser);
    socket.emit("submit_histories", { roomId: user.room, histories: values });
    socket.emit("player_ready", { roomId: user.room });
    setWaiting(true);
  };

  return (
    <div className="list-container">
      {!waiting ? (
        <form onSubmit={handleSubmit} className="list">
          <span>Ну... рассказывай...</span>
          {values.map((val, i) => (
            <textarea
              key={i}
              placeholder={`Input ${i + 1}`}
              value={val}
              onChange={(e) => handleChange(i, e.target.value)}
              rows={1}
              style={{ width: "90%", resize: "none", overflow: "hidden" }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
            />
          ))}
          <button type="submit">Готово</button>
        </form>
      ) : (
        <div className="waiting">
          <span>Ждем остальных игроков</span>
          <div>
            {roomPlayers && roomPlayers.map(p => <div key={p.id}>{p.name}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}
