// File: api/routes/track.ts
// Version: v0.1.4 — Adds distance[] and curvature[] to track geometry response

import express, { Request, Response } from 'express';
import { generateGreyOvalTrack } from '../utils/generateGreyOvalTrack';
import { computeTrackGeometry } from '../utils/computeTrackGeometry';

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
  const rawPercent = req.query.startAtPercent;
  const rawWidth = req.query.width;
  const rawHeight = req.query.height;

  if (rawPercent === undefined || isNaN(Number(rawPercent))) {
    return res.status(400).json({ error: 'Missing or invalid startAtPercent' });
  }
  if (rawWidth === undefined || isNaN(Number(rawWidth))) {
    return res.status(400).json({ error: 'Missing or invalid width' });
  }
  if (rawHeight === undefined || isNaN(Number(rawHeight))) {
    return res.status(400).json({ error: 'Missing or invalid height' });
  }

  const startAtPercent = Math.min(Math.max(Number(rawPercent), 0), 1);
  const width = Math.max(Number(rawWidth), 800);
  const height = Math.max(Number(rawHeight), 400);

  const track = generateGreyOvalTrack({ width, height }, startAtPercent);

  const { distance, curvature } = computeTrackGeometry(track.centerline);

  res.json({
    innerBoundary: track.innerBounds.pointsArray,
    outerBoundary: track.outerBounds.pointsArray,
    centerline: track.centerline,
    startAt: track.startAt,
    startLineAt: track.startLineAt,
    distance,
    curvature
  });
});

export default router;
