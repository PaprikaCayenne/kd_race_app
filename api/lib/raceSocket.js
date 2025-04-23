// api/lib/raceSocket.js
export function setupRaceSocket(io) {
    io.of("/race").on("connection", (socket) => {
      console.log("[WS] Horse client connected:", socket.id);
  
      socket.on("startRace", ({ raceId, horses }) => {
        console.log(`[WS] 🏁 Starting race ${raceId} with horses:`, horses.map(h => h.name));
  
        const progress = horses.map(() => 0);
        const interval = setInterval(() => {
          let allFinished = true;
  
          horses.forEach((horse, i) => {
            if (progress[i] < 1000) {
              const increment = Math.floor(Math.random() * 5) + 8;
              progress[i] += increment;
              if (progress[i] > 1000) progress[i] = 1000;
  
              io.of("/race").emit("race:tick", {
                raceId,
                horseId: horse.id,
                pct: progress[i],
              });
  
              allFinished = false;
            }
          });
  
          if (allFinished) {
            clearInterval(interval);
            console.log(`[WS] 🏆 Race ${raceId} complete`);
          }
        }, 33); // ~30 ticks/sec
      });
    });
  }
  