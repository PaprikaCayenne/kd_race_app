// File: api/index.js

import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { setupRaceNamespace } from "./sockets/race.js";
import horsesRoute from "./routes/horses.js";
import registerRoute from "./routes/register.js";
import { createAdminRoute } from "./routes/admin.js";
import { execSync } from "child_process";

// 🌱 Load environment variables
dotenv.config();

// 🧬 Ensure prisma client is generated in dev mode
if (process.env.NODE_ENV !== "production") {
  try {
    console.log("🛠️ Running prisma generate...");
    execSync("npx prisma generate", { stdio: "inherit" });
  } catch (err) {
    console.error("❌ Failed to generate Prisma client:", err);
  }
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  path: "/socket.io", // 👈 Final WebSocket path
});

// 🛡️ Prevent Express from handling upgrade requests
app.use((req, res, next) => {
  if (req.url.startsWith("/socket.io")) return next();
  next();
});

// 🌐 Middlewares
app.use(express.json());

// 🧩 API Routes
app.use("/api/horses", horsesRoute);
app.use("/api/register", registerRoute);
app.use("/api/admin", createAdminRoute(io));

// 🏇 WebSocket setup
setupRaceNamespace(io);

// 🚀 Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🔥 KD API running on http://localhost:${PORT}`);
});
