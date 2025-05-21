// File: frontend/src/utils/playRace.js
// Version: v2.4.9 — Horses change color and slow after finish, but never stop

const DEBUG = true;
const TICK_INTERVAL = 1000 / 30;
const FINISH_EPSILON = 25;
const MAX_POST_FINISH_DISTANCE = 999999; // ← effectively prevents full stop

export function playRace({
  app,
  horseSprites,
  horsePaths,
  labelSprites,
  horses,
  onRaceEnd,
  speedMultiplier = 1
}) {
  const finished = new Set();
  const stopping = new Set();
  const results = [];

  const maxDistance = new Map();
  const currentDistance = new Map();
  const currentSpeed = new Map();
  const deceleration = new Map();
  const tickCounter = new Map();

  // 🐎 Initialize each horse with a random speed and set up tracking maps
  horses.forEach((horse) => {
    const { id } = horse;
    const path = horsePaths.get(id);
    const arcLen = path?.arcLength ?? 0;

    const speed = (Math.random() * 0.4 + 0.6) * 35;
    maxDistance.set(id, arcLen);
    currentDistance.set(id, 0);
    currentSpeed.set(id, speed);
    tickCounter.set(id, 0);

    if (DEBUG) {
      console.log(`[KD] 🧪 ${horse.name} → arcLength=${arcLen.toFixed(2)} | speed=${speed.toFixed(3)}`);
    }
  });

  const ticker = setInterval(() => {
    horses.forEach((horse) => {
      const { id, name } = horse;
      const path = horsePaths.get(id);
      const sprite = horseSprites.get(id);
      const label = labelSprites.get(id);
      const arcLen = maxDistance.get(id);

      if (!path?.arcPoints?.length || !sprite || !label) return;

      let speed = currentSpeed.get(id);
      let distance = currentDistance.get(id);
      let ticks = tickCounter.get(id);

      if (stopping.has(id)) {
        // 💤 Decelerating horse after finish — but no stop
        const decel = deceleration.get(id);
        speed = Math.max(0, speed + decel); // decel is negative
        distance += speed;
        currentSpeed.set(id, speed);
        currentDistance.set(id, distance);
        tickCounter.set(id, ticks + 1);

        if (DEBUG && ticks % 10 === 0) {
          console.log(`[KD] 🐴 ${name} continues slowing → distance=${distance.toFixed(1)} speed=${speed.toFixed(2)}`);
        }
      } else {
        // 🐎 Normal movement
        distance += speed;
        currentDistance.set(id, distance);
        tickCounter.set(id, ticks + 1);
      }

      const clampedDistance = Math.min(distance, arcLen + MAX_POST_FINISH_DISTANCE);
      const point = path.getPointAtDistance(clampedDistance);
      const nextPoint = path.getPointAtDistance(clampedDistance + 1);
      const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);

      // 🎯 Move horse to calculated position + rotation
      sprite.x = point.x;
      sprite.y = point.y;
      sprite.rotation = angle;

      label.x = point.x;
      label.y = point.y - 20;

      if (!finished.has(id) && ticks > 5 && distance >= arcLen + FINISH_EPSILON) {
        finished.add(id);
        results.push({ id, name, finalSpeed: speed });

        const decel = -speed / (Math.random() * 30 + 30); // gentle slowdown
        stopping.add(id);
        deceleration.set(id, decel);

        // 🎨 Tint horse and label to show they finished
        sprite.tint = 0x888888;
        label.style.fill = 0x888888;

        if (DEBUG) {
          console.log(`[KD] 🏁 ${name} finished ${results.length} at speed ${speed.toFixed(2)}`);
          console.log(`[KD] 💤 ${name} slowdown rate: ${decel.toFixed(4)} per tick`);
        }

        if (results.length === horses.length) {
          onRaceEnd(results);
        }
      }
    });
  }, TICK_INTERVAL);
}
