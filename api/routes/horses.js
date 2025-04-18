import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/horses → List all horses
router.get("/", async (_req, res) => {
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
