// File: api/index.js
// Version: v0.7.76 – Add replay route for race tick playback

import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import horsesRoute from "./routes/horses.js";
import registerRoute from "./routes/register.js";
import { createAdminRoute } from "./routes/admin.js";
import replayRoute from "./routes/replay.js";
import { setupRaceNamespace } from "./sockets/race.js";
import { execSync } from "child_process";

// 🌱 Load .env vars
dotenv.config();

// 🧬 Auto-generate Prisma client in non-prod
if (process.env.NODE_ENV !== "production") {
  try {
    console.log("🛠️ Running prisma generate...");
    execSync("npx prisma generate", { stdio: "inherit" });
  } catch (err) {
    console.error("❌ Prisma generate failed:", err);
  }
}

const app = express();
const server = createServer(app);

// 📡 Setup Socket.IO
const io = new Server(server, {
  cors: { origin: "*" },
  path: "/api/socket.io", // match frontend + nginx
});

// 🧩 API middleware
app.use(express.json());

// 🧬 Prevent Express from interfering with Socket upgrade
app.use((req, res, next) => {
  if (req.url.startsWith("/api/socket.io")) return next();
  next();
});

// 🔗 Routes
app.use("/api/horses", horsesRoute);
app.use("/api/register", registerRoute);
app.use("/api/admin", createAdminRoute(io));
app.use("/api", replayRoute); // 🎬 Add replay endpoint for frontend

// 🏇 WebSocket: race namespace logic
setupRaceNamespace(io);

// 🚀 Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🔥 KD API running at http://localhost:${PORT}`);
});
