// File: api/routes/generateRace.ts
// Version: v0.2.0 – Convert to TypeScript and use dynamic path generator

import express, { Request, Response } from 'express';
import { generateHorsePathWithSpeed } from '../utils/generateHorsePathWithSpeed';
import { generateRoundedRectCenterline } from '../utils/generateRoundedRectCenterline';
import { Point } from '../types';

const router = express.Router();

/**
 * POST /api/admin/generate-race
 * Generate horse path data and return it for test/demo mode.
 * Protected by x-admin-pass header
 */
router.post('/generate-race', (req: Request, res: Response) => {
  const { horseCount = 4 } = req.body;

  const innerBounds = {
    x: 100,
    y: 100,
    width: 800,
    height: 400,
  };

  const cornerRadius = 120;
  const laneWidth = 30;
  const segments = 400;

  const centerline: Point[] = generateRoundedRectCenterline(innerBounds, cornerRadius, segments);

  const horsePaths = generateHorsePathWithSpeed(centerline, {
    laneCount: horseCount,
    laneSpacing: laneWidth,
    debug: false
  });

  res.json({
    raceId: Date.now(),
    horses: Object.keys(horsePaths).map(id => ({ id })),
    horsePaths
  });
});

export default router;
