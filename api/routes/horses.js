// routes/horses.js

import express from "express";
import { getPrisma } from "../lib/prisma.js";

const router = express.Router();

// GET /api/horses → List all horses
router.get("/", async (_req, res) => {
  const prisma = getPrisma();
  try {
    const horses = await prisma.horse.findMany({
      orderBy: { id: "asc" }, // Optional: keep it consistent
    });
    res.json(horses);
  } catch (error) {
    console.error("Error fetching horses:", error);
    res.status(500).json({ error: "Failed to fetch horses" });
  }
});

export default router;
