import React, { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";

const App = () => {
  const pixiContainer = useRef(null);

  useEffect(() => {
    const app = new PIXI.Application({
      width: 800,
      height: 600,
      backgroundColor: 0x228b22,
    });

    pixiContainer.current.appendChild(app.view);

    const track = new PIXI.Graphics();
    track.lineStyle(10, 0xffffff);
    track.beginFill(0x8b4513);
    track.drawEllipse(400, 300, 300, 200);
    track.endFill();
    app.stage.addChild(track);

    const titleStyle = new PIXI.TextStyle({
      fill: "#ffffff",
      fontSize: 36,
      fontWeight: "bold",
    });
    const title = new PIXI.Text("🏇 KD Race Track", titleStyle);
    title.anchor.set(0.5);
    title.x = 400;
    title.y = 50;
    app.stage.addChild(title);

    return () => {
      app.destroy(true, true);
    };
  }, []);

  return <div ref={pixiContainer} />;
};

export default App;
