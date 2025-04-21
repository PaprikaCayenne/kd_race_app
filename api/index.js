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

// 🧬 Run prisma generate in dev mode
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
  path: "/api/socket.io", // ✅ Must match frontend and Nginx
});

// 🔌 Avoid Express interfering with upgrade requests
app.use((req, res, next) => {
  if (req.url.startsWith("/api/socket.io")) return next();
  next();
});

// 🌐 JSON parsing
app.use(express.json());

// 🧩 REST API endpoints
app.use("/api/horses", horsesRoute);
app.use("/api/register", registerRoute);
app.use("/api/admin", createAdminRoute(io));

// 🏇 WebSocket events
setupRaceNamespace(io);

// 🚀 Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🔥 KD API running at http://localhost:${PORT}`);
});
