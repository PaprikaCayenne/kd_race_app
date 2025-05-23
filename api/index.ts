// File: api/index.ts
// Version: v0.8.3 — Mounts user, register, and betting routes properly

import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import horsesRoute from "./routes/horses.js";
import registerRoute from "./routes/register.js";
import userRoute from "./routes/user.js";
import betRoute from "./routes/bet.js";
import { createAdminRoute } from "./routes/admin.js";
import replayRoute from "./routes/replay.js";
import trackRoute from "./routes/track.js";
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

app.use((req, res, next) => {
  if (req.url.startsWith("/api/socket.io")) return next();
  next();
});

// 🔗 Mount REST API routes
app.use("/api/horses", horsesRoute);
app.use("/api/register", registerRoute);
app.use("/api/user", userRoute);              // ✅ NEW: fetch user & balance
app.use("/api/admin", createAdminRoute(io));
app.use("/api", replayRoute);
app.use("/api/track", trackRoute);
app.use("/api/bet", betRoute);

setupRaceNamespace(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🔥 KD API running at http://localhost:${PORT}`);
});
