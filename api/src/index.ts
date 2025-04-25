// File: api/src/index.ts
// Version: v0.8.0 – Convert to TypeScript and fix admin route types

import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { adminRouter } from "./routes/admin";
import cors from "cors";

// 🌱 Load environment variables
dotenv.config();

// 🚀 Initialize app and HTTP server
const app = express();
const server = createServer(app);

// 📡 Setup Socket.IO server
const io = new Server(server, {
  cors: { origin: "*" },
  path: "/api/socket.io",
});

// 🧩 Middleware
app.use(cors());
app.use(express.json());

// 🔗 Routes
app.use("/api/admin", adminRouter(io));

// 🚀 Start listening
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🔥 KD API running at http://localhost:${PORT}`);
});
