import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

router.post("/", async (req, res) => {
  const { firstName, lastName, nickname, horseId, deviceId } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !horseId || !deviceId) {
    return res.status(400).json({ error: "firstName, lastName, horseId, and deviceId are required" });
  }

  try {
    let user = await prisma.user.findUnique({
      where: { device_id: deviceId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          first_name: firstName,
          last_name: lastName,
          nickname: nickname || null,
          device_id: deviceId,
        },
      });

      await prisma.registration.create({
        data: {
          user_id: user.id,
          horse_id: horseId,
        },
      });
    }

    res.json({ userId: user.id });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
