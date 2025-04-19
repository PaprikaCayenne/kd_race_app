import express from "express";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import horsesRoute from "./routes/horses.js";
import registerRoute from "./routes/register.js";
import createAdminRoute from "./routes/admin.js"; // 🔄 renamed import
import resultsRoute from "./routes/results.js";
import { setupRaceNamespace } from "./sockets/race.js";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const app = express();
app.use(express.json());

// Initialize Prisma
export const prisma = new PrismaClient();

// Health check
app.get("/api/health", (_req, res) => res.send("OK\n"));

// Root route: Add this to handle requests to the root '/'
app.get('/', (req, res) => {
  res.send('Welcome to the KD Race API!');
});

// Debug: list all users
app.get("/api/users", async (_req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

// Create HTTP + WebSocket server
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// WebSocket namespace setup
setupRaceNamespace(io);

// Mount routes
app.use("/api/horses", horsesRoute);
app.use("/api/register", registerRoute);
app.use("/api/admin", createAdminRoute(io)); // ✅ pass in io
app.use("/api/race", resultsRoute);

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`API + WebSocket running on port ${PORT}`);
});
