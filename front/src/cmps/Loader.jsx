import React from "react";
// import "./Spinner.css";

export default function Loader() {
const text = "YOU DONT KNOW ME ";
  const letters = text.split("");

  return (
    <div className="loader-container">
      <div className="circle">
        {letters.map((letter, i) => (
          <span
            key={i}
            style={{
              transform: `rotate(${(360 / letters.length) * i}deg) translate(70px) rotate(-${(360 / letters.length) * i}deg)`
            }}
          >
            {letter}
          </span>
        ))}
      </div>
      <div className="center-dot"></div>
    </div>
  );

}
