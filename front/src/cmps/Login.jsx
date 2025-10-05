import { useState, useEffect } from "react";
import { socket } from "../socket";

export default function Login({ setUser }) {
  const [role, setRole] = useState(null);
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [roomErr, setRoomErr] = useState("");
  const [nameErr, setNameErr] = useState("");

  useEffect(() => {
    // если сервер прислал room_joined — handled в App, но можно слушать тут если хочешь
    return () => {};
  }, []);

  function makeId(length = 6) {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  async function onHost() {
    setRole("host");
    // мы не ждём здесь номер комнаты — сервер пришлёт room_joined
  }

  function onBack() {
    setRoom("");
    setRole(null);
    setNameErr("");
    setRoomErr("");
  }

  function onCheck() {
    if (name.length < 3) {
      setNameErr("Че за имя такое? длиннее должно быть...");
      return;
    }
    if (!role) return;
    if (role === "player" && room === "") {
      setRoomErr("Введите номер комнаты");
      return;
    }
    const payload = { name, role, roomId: role === "host" ? undefined : room };
    socket.emit("join_room", payload);
    // после успешного join сервер пришлёт room_joined и App установит user в state
    // но установим локально:
    // wait for server -> App sets players in response and updates user room via room_joined
    setUser({ name, role, room, id: socket.id });
  }

  return (
    <div className="login-container">
      {role === "player" ? (
        <div className="connect">
          <span className="back" onClick={onBack}>◀</span>
          <div className="input">
            <span>ID Комнаты</span>
            <input value={room} onChange={e => setRoom(e.target.value)} type="text" placeholder="Номер комнаты" />
            <p>{roomErr}</p>
          </div>
          <div className="input">
            <span>Имя</span>
            <input value={name} onChange={e => setName(e.target.value)} type="text" placeholder="Ваше имя" />
            <p>{nameErr}</p>
          </div>
          <button onClick={onCheck}>Войти</button>
        </div>
      ) : role === "host" ? (
        <div className="connect">
          <span className="back" onClick={onBack}>◀</span>
          <div className="input">
            <span>ID Комнаты</span>
            <p>Номер выдаст сервер после создания комнаты</p>
          </div>
          <div className="input">
            <span>Имя</span>
            <input value={name} onChange={e => setName(e.target.value)} type="text" placeholder="Ваше имя" />
            <p>{nameErr}</p>
          </div>
          <button onClick={onCheck}>Создать</button>
        </div>
      ) : (
        <div className="login">
          <span>Не промахнись</span>
          <div className="btns">
            <button onClick={onHost}>Хост</button>
            <button onClick={() => setRole("player")}>Присоединится</button>
          </div>
        </div>
      )}
    </div>
  );
}
