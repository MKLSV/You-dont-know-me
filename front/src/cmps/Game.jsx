import React, { useEffect, useState } from "react";
import { socket } from "../socket";

export default function Game({ user, players, currentStory, setCurrentStory }) {
  const [choised, setChoised] = useState('');
  const [imReady, setImReady] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [showContinue, setShowContinue] = useState(false);
  const [err, setErr] = useState("");

  const isMyStory = currentStory.ownerId === user.id;
  console.log(currentStory)


  useEffect(() => {
    socket.on("round_result", (data) => {
      setRoundResult(data);
      setImReady(true);
      setShowContinue(true);
    });

    socket.on("new_story", (story) => {
      setRoundResult(null);
      setShowContinue(false);
      setChoised("");
      setImReady(false);
      setCurrentStory(story);
    });

    socket.on("game_over", ({ leaderboard }) => {
      alert(
        `🏁 Игра окончена!\nПобедитель: ${leaderboard[0].name} (${leaderboard[0].score} очков)`
      );
    });

    return () => {
      socket.off("round_result");
      socket.off("new_story");
      socket.off("game_over");
    };
  }, [setCurrentStory]);

  function handleChoise() {
    if (choised) {
      socket.emit("choose_player", {
        roomId: user.room,
        storyId: currentStory.id,
        chosenPlayerId: choised,
      });
      setImReady(true);
      setErr("");
    } else {
      setErr("ну ты выбери кого нибудь...");
    }
  }

  function handleContinue() {
    socket.emit("ready_for_next", { roomId: user.room });
    setShowContinue(false);
  }

  if (roundResult && showContinue) {
    // Найдём ответ текущего игрока
    const myAnswer = roundResult.answers.find(a => a.chooserId === user.id);
    const myScore = roundResult.scores.find(s => s.id === user.id)?.score || 0;
    const guessed = myAnswer ? myAnswer.correct : false;


    return (
      <div className="waiting">
        <h2>Результаты раунда</h2>
        <p>
          История принадлежала:{currentStory.ownerId}
          {players.find(p => p.id === roundResult.ownerId)?.name || "Неизвестно"}
        </p>
        <p>
          {guessed ? "✅ Ты угадал!" : "❌ Ты не угадал"} <br />
          Твои очки: {myScore}
        </p>

        <h3>Очки игроков:</h3>
        <ul>
          {roundResult.scores.map(s => (
            <li key={s.id}>
              {s.name}: {s.score}
            </li>
          ))}
        </ul>

        <button onClick={() => socket.emit("ready_for_next", { roomId: user.room })}>
          Продолжаем
        </button>
      </div>
    );
  }

  if (imReady) {
    return <div className="waiting"><span>Ждем остальных игроков...</span></div>;
  }

  return (
    <div className="game">
      <span className="history">{currentStory?.text}</span>
      <div className="choise">
        <div className="players">
          {players.map(pl => (
            <span
              key={pl.id}
              className={pl.id === choised ? "pl choised" : "pl"}
              onClick={() => setChoised(pl.id)}
            >
              {pl.name}
            </span>
          ))}
        </div>
      </div>
      <p>{err}</p>
      <button onClick={handleChoise}>Выбрать</button>
    </div>
  );
}
