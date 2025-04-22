// api/src/routes/admin.ts
import express from 'express';
import { db } from '../db';
import { Server } from 'socket.io';

export const adminRouter = (io: Server) => {
  const router = express.Router();

  router.post('/start', async (req, res) => {
    const adminPass = req.header('x-admin-pass');
    if (adminPass !== process.env.API_ADMIN_PASS) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Step 1: Get horses that haven't raced yet
    const usedHorseIds = await db.result.findMany({
      select: { horse_id: true },
      distinct: ['horse_id']
    });

    const usedIds = usedHorseIds.map(h => h.horse_id);

    const availableHorses = await db.horse.findMany({
      where: { id: { notIn: usedIds } }
    });

    if (availableHorses.length < 3) {
      return res.status(400).json({ error: 'Not enough horses left to run a race' });
    }

    // Step 2: Pick N horses (e.g., 4)
    const shuffled = availableHorses.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 4);

    // Step 3: Create race
    const race = await db.race.create({
      data: { started_at: new Date() }
    });

    // Step 4: Emit WebSocket init
    io.emit('race:init', {
      raceId: race.id,
      horses: selected.map(h => ({ id: h.id, name: h.name, color: h.color }))
    });

    res.json({
      raceId: race.id,
      horses: selected
    });
  });

  return router;
};
