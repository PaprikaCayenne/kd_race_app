import React, { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { io } from "socket.io-client";

const RaceTrack = () => {
  const containerRef = useRef(null);
  const horses = {};

  useEffect(() => {
    const app = new PIXI.Application({
      width: 800,
      height: 600,
      backgroundColor: 0x228B22, // green field
    });
    containerRef.current.appendChild(app.view);

    // Oval Track
    const track = new PIXI.Graphics();
    track.lineStyle(8, 0x8B4513); // brown track
    track.drawEllipse(400, 300, 300, 200);
    app.stage.addChild(track);

    // Connect to WebSocket
    const socket = io("/race");

    socket.on("race:init", ({ horses: raceHorses }) => {
      app.stage.removeChildren(1); // Keep track, remove horses
      for (let i = 0; i < raceHorses.length; i++) {
        const horse = raceHorses[i];
        const sprite = new PIXI.Graphics();
        sprite.beginFill(PIXI.utils.string2hex(horse.color));
        sprite.drawCircle(0, 0, 12);
        sprite.endFill();
        sprite.x = 400 + Math.cos(Math.PI * 2 * (i / raceHorses.length)) * 300;
        sprite.y = 300 + Math.sin(Math.PI * 2 * (i / raceHorses.length)) * 200;
        sprite.rotationOffset = (Math.PI * 2 * (i / raceHorses.length));
        horses[horse.id] = sprite;
        app.stage.addChild(sprite);
      }
    });

    socket.on("race:tick", ({ horseId, pct }) => {
      const sprite = horses[horseId];
      if (sprite) {
        const radians = ((pct / 100) * 2 * Math.PI + sprite.rotationOffset) % (2 * Math.PI);
        sprite.x = 400 + Math.cos(radians) * 300;
        sprite.y = 300 + Math.sin(radians) * 200;
      }
    });

    return () => {
      socket.disconnect();
      app.destroy(true, { children: true });
    };
  }, []);

  return <div ref={containerRef} />;
};

export default RaceTrack;
