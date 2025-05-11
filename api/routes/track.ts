// File: api/routes/track.ts
// Version: v0.1.8 — Final aligned track route using stable centerline and geometry

import express, { Request, Response } from 'express';
import { generateGreyOvalTrack } from '../utils/generateGreyOvalTrack';
import { computeTrackGeometry } from '../utils/computeTrackGeometry';
import { Point } from '../types';

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

  const {
    rotatedInner,
    rotatedOuter,
    rotatedCenterline
  } = computeTrackGeometry(
    track.innerBounds.pointsArray,
    track.outerBounds.pointsArray,
    track.centerline,
    track.startAt
  );

  const distance: number[] = [];
  const curvature: number[] = [];

  for (let i = 0; i < rotatedCenterline.length; i++) {
    if (i > 0) {
      const dx = rotatedCenterline[i].x - rotatedCenterline[i - 1].x;
      const dy = rotatedCenterline[i].y - rotatedCenterline[i - 1].y;
      distance[i] = distance[i - 1] + Math.sqrt(dx * dx + dy * dy);
    } else {
      distance[i] = 0;
    }

    if (i > 0 && i < rotatedCenterline.length - 1) {
      const p0 = rotatedCenterline[i - 1];
      const p1 = rotatedCenterline[i];
      const p2 = rotatedCenterline[i + 1];

      const v1 = { x: p1.x - p0.x, y: p1.y - p0.y };
      const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };

      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
      const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);

      const cos = dot / (mag1 * mag2);
      curvature[i] = Math.acos(Math.max(-1, Math.min(1, cos)));
    } else {
      curvature[i] = 0;
    }
  }

  res.json({
    innerBoundary: track.innerBounds.pointsArray,
    outerBoundary: track.outerBounds.pointsArray,
    centerline: track.centerline,           // parametric unrotated centerline
    rotatedCenterline,                      // used in frontend & race logic
    startAt: track.startAt,
    startLineAt: track.startLineAt,
    distance,
    curvature
  });
});

export default router;
