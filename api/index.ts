// File: api/index.ts
// Version: v0.8.0 – Convert to TypeScript, maintain all features

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

// 🌱 Load environment variables
dotenv.config();

// 🧬 Generate Prisma client if not in production
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
  path: "/api/socket.io"
});

// 🧩 Parse JSON bodies
app.use(express.json());

// 🧬 Preserve WebSocket upgrade behavior
app.use((req, res, next) => {
  if (req.url.startsWith("/api/socket.io")) return next();
  next();
});

// 🔗 Mount REST API routes
app.use("/api/horses", horsesRoute);
app.use("/api/register", registerRoute);
app.use("/api/admin", createAdminRoute(io));
app.use("/api", replayRoute);

// 🏇 Setup race WebSocket namespace
setupRaceNamespace(io);

// 🚀 Start the HTTP server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🔥 KD API running at http://localhost:${PORT}`);
});
