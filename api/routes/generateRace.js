// File: api/routes/generateRace.js
// Version: v0.1.0 – Generate horse paths server-side for new race

import express from 'express';
import { generateHorsePaths } from '../utils/generateHorsePaths.js';

const router = express.Router();

/**
 * POST /api/admin/generate-race
 * Generate horse path data and return it for test/demo mode.
 * Protected by x-admin-pass header
 */
router.post('/generate-race', (req, res) => {
  const { horseCount = 4 } = req.body;

  const innerBounds = {
    x: 100,
    y: 100,
    width: 800,
    height: 400,
  };

  const cornerRadius = 120;
  const laneWidth = 30;
  const { horsePaths, trackMeta } = generateHorsePaths(innerBounds, cornerRadius, horseCount, laneWidth);

  res.json({
    raceId: Date.now(),
    horses: Object.keys(horsePaths).map(id => ({ id })),
    horsePaths,
    trackMeta,
  });
});

export default router;
