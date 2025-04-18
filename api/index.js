import express from "express";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import horsesRoute from "./routes/horses.js";
import registerRoute from "./routes/register.js";
import adminRoute from "./routes/admin.js";
import resultsRoute from "./routes/results.js";
import { setupRaceNamespace } from "./sockets/race.js";

dotenv.config();

const app = express();
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => res.send("OK\n"));

// Modular routes
app.use("/api/horses", horsesRoute);
app.use("/api/register", registerRoute);
app.use("/api/admin", adminRoute);
app.use("/api/race", resultsRoute);

// Create HTTP + WebSocket server
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// WebSocket namespace setup
setupRaceNamespace(io);

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`API + WebSocket running on port ${PORT}`);
});
