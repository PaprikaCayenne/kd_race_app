// File: api/routes/leaderboard.ts
// Version: v1.0.0 — Adds Lease Loons leaderboard API
// Date: 2025-05-30

import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const leaderboard = await prisma.user.findMany({
      orderBy: { leaseLoons: 'desc' },
      select: {
        id: true,
        nickname: true,
        leaseLoons: true
      }
    });

    res.json({ leaderboard });
  } catch (err) {
    console.error('Failed to load leaderboard:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
