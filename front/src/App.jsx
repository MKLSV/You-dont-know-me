import { useEffect, useState } from "react";
import { socket } from "./socket";
import Login from "./cmps/Login";
import WaitRoom from "./cmps/WaitRoom";
import List from "./cmps/List";
import Game from "./cmps/Game";
import Loader from "./cmps/Loader";

function App() {
  const [user, setUser] = useState(null);
  const [closeRoom, setCloseRoom] = useState(false);
  const [playersReady, setPlayersReady] = useState(false);
  const [count, setCount] = useState(4);
  const [players, setPlayers] = useState([]);
  const [currentStory, setCurrentStory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    socket.on("connect", () => {
      setLoading(false)
      console.log("connected", socket.id)
    });

    socket.on("room_joined", ({ roomId, players }) => {
      setPlayers(players);
      // if joined as host, server will have issued roomId: keep user updated if needed
      setUser(prev => prev ? { ...prev, room: roomId } : null);
    });

    socket.on("room_update", (players) => {
      setPlayers(players);
    });

    socket.on("request_histories", () => {
      // server requests histories (List shown will handle)
      console.log("server requests histories");
    });

    socket.on("all_histories_submitted", (data) => {
      // could show waiting and total stories
      console.log("all histories submitted", data);
    });

    socket.on("new_story", (story) => {
      setCurrentStory(story);
      // navigate to Game view
      setCloseRoom(true); // ensure we are in game phase
      setPlayersReady(false);
    });

    socket.on("round_result", ({ storyId, ownerId, answers }) => {
      // Game component listens to this too, but we store currentStory result
      console.log("round_result", ownerId, answers);
    });

    socket.on("game_over", ({ leaderboard }) => {
      console.log("game over", leaderboard);
    });

    socket.on("room_error", ({ message }) => {
      alert(message);
    });

    return () => {
      socket.off("connect");
      socket.off("room_joined");
      socket.off("room_update");
      socket.off("request_histories");
      socket.off("all_histories_submitted");
      socket.off("new_story");
      socket.off("round_result");
      socket.off("game_over");
      socket.off("room_error");
    };
  }, []);

  // Простая навигация: Login -> WaitRoom -> List (submit) -> Game
  return (
    <div className="app">
      <div className="header"><span>You Dont Know Me</span></div>
      {loading ? <div className="loading">
        <Loader />
      </div>
        :
        <div className="app-container">
          {!user ? (
            <Login setUser={setUser} />
          ) : !closeRoom ? (
            <WaitRoom
              user={user}
              setCloseRoom={setCloseRoom}
              setPlayers={setPlayers}
              setCount={setCount}
              count={count}
              players={players}
            />
          ) : currentStory == null && playersReady == false ? (
            <List
              count={count}
              user={user}
              setUser={setUser}
              players={players}
              setPlayersReady={setPlayersReady}
            />
          ) : (
            <Game user={user} players={players} currentStory={currentStory} setCurrentStory={setCurrentStory} />
          )}
        </div>
      }
    </div>
  );
}

export default App;
