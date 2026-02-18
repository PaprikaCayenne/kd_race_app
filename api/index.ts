// File: api/index.ts
// Version: v0.8.6 — Adds leaderboard route to /api/leaderboard
// Date: 2025-05-30

import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import horsesRoute from "./routes/horses.js";
import registerRoute from "./routes/register.js";
import userRoute from "./routes/user.js";
import betRoute from "./routes/bet.js";
import adminRoute from "./routes/admin.js";
import replayRoute from "./routes/replay.js";
import racesRoute from "./routes/races.js";
import leaderboardRoute from "./routes/leaderboard.js"; // ✅ NEW
import { setupRaceNamespace } from "./sockets/race.js";
import { execSync } from "child_process";

dotenv.config();

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

const io = new Server(server, {
  cors: { origin: "*" },
  path: "/api/socket.io"
});

app.use(cors());
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.url.startsWith("/api/socket.io")) return next();
  next();
});

// 🔗 Mount REST API routes
app.use("/api/horses", horsesRoute);
app.use("/api/register", registerRoute);
app.use("/api/user", userRoute);
app.use("/api/admin", adminRoute);
app.use("/api", replayRoute);
app.use("/api/bet", betRoute);
app.use("/api/race", racesRoute);
app.use("/api/leaderboard", leaderboardRoute); // ✅ ADDED

setupRaceNamespace(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🔥 KD API running at http://localhost:${PORT}`);
});
