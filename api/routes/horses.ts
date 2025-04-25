// File: api/routes/horses.ts
// Version: v0.2.0 – Convert to TypeScript and add types to Prisma call

import express, { Request, Response } from "express";
import prisma from "../lib/prisma";

const router = express.Router();

// GET /api/horses → List all horses
router.get("/", async (_req: Request, res: Response) => {
  try {
    const horses = await prisma.horse.findMany({
      orderBy: { id: "asc" },
    });
    res.json(horses);
  } catch (error) {
    console.error("❌ Error fetching horses:", error);
    res.status(500).json({ error: "Failed to fetch horses" });
  }
});

export default router;
