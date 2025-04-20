import express from "express";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import horsesRoute from "./routes/horses.js";
import registerRoute from "./routes/register.js";
import { createAdminRoute } from "./routes/admin.js";
import resultsRoute from "./routes/results.js";
import { setupRaceNamespace } from "./sockets/race.js";
import { PrismaClient } from "@prisma/client";

// Load environment variables from .env
dotenv.config();

const app = express();
app.use(express.json()); // Allow JSON bodies in POST requests

// 🔗 Initialize Prisma ORM
export const prisma = new PrismaClient();

// ✅ Health check route (used for Docker healthcheck or monitoring)
app.get("/api/health", (_req, res) => res.send("OK\n"));

// 🔍 Debug route to show all registered users
app.get("/api/users", async (_req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

// 🔌 Create HTTP server and wrap it with WebSocket support
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }, // Allow all origins (fine for dev)
});

// 🎧 Setup WebSocket namespace /race
setupRaceNamespace(io); // <-- We will verify this in the next step

// 📦 Mount all REST API routes under /api
app.use("/api/horses", horsesRoute);
app.use("/api/register", registerRoute);
app.use("/api/admin", createAdminRoute(io)); // Pass Socket.IO instance to admin routes
app.use("/api/race", resultsRoute);

// 🚀 Start API + WebSocket server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`API + WebSocket running on port ${PORT}`);
});
