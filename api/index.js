import express from "express";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import horsesRoute from "./routes/horses.js";
import registerRoute from "./routes/register.js";
import { createAdminRoute } from "./routes/admin.js";
import resultsRoute from "./routes/results.js";
import { setupRaceNamespace } from "./sockets/race.js";
import pkg from "@prisma/client"; // ✅ Fix CommonJS import
const { PrismaClient } = pkg;

dotenv.config();

const app = express();
app.use(express.json());

export const prisma = new PrismaClient();

app.get("/api/health", (_req, res) => res.send("OK\n"));

app.get("/api/users", async (_req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

setupRaceNamespace(io);

app.use("/api/horses", horsesRoute);
app.use("/api/register", registerRoute);
app.use("/api/admin", createAdminRoute(io));
app.use("/api/race", resultsRoute);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`API + WebSocket running on port ${PORT}`);
});
