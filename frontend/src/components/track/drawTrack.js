// File: frontend/src/components/track/drawTrack.js
// Version: v1.0.3 — Pond positioning fixed with buffered offset from inner boundary

import { Graphics } from 'pixi.js';
import { renderPond } from '@/utils/renderPond';

export function drawDerbyTrack(app, { innerBoundary, outerBoundary, rotatedCenterline, startLineAt }) {
  app.stage.removeChildren();
  app.stage.sortableChildren = true;

  const g = new Graphics();
  g.beginFill(0x996633);
  outerBoundary.forEach((p, i) => i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y));
  for (let i = innerBoundary.length - 1; i >= 0; i--) g.lineTo(innerBoundary[i].x, innerBoundary[i].y);
  g.endFill();

  g.lineStyle(2, 0x999999);
  outerBoundary.forEach((p, i) => i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y));
  g.lineTo(outerBoundary[0].x, outerBoundary[0].y);
  innerBoundary.forEach((p, i) => i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y));
  g.lineTo(innerBoundary[0].x, innerBoundary[0].y);
  app.stage.addChild(g);

  if (startLineAt && rotatedCenterline.length > 1) {
    const start = rotatedCenterline[0];
    const next = rotatedCenterline[1];
    const dx = next.x - start.x;
    const dy = next.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const normX = -dy / len;
    const normY = dx / len;

    const line = new Graphics();
    line.lineStyle(4, 0x00ff00);
    line.moveTo(startLineAt.x + normX * 60, startLineAt.y + normY * 60);
    line.lineTo(startLineAt.x - normX * 60, startLineAt.y - normY * 60);
    app.stage.addChild(line);
  }

  const bounds = innerBoundary.reduce(
    (acc, p) => ({
      minX: Math.min(acc.minX, p.x),
      maxX: Math.max(acc.maxX, p.x),
      minY: Math.min(acc.minY, p.y),
      maxY: Math.max(acc.maxY, p.y)
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  );

  const pondRadius = 60;
  const buffer = 10;
  const pondX = bounds.minX + pondRadius + buffer;
  const pondY = bounds.minY + pondRadius + buffer;

  renderPond(app, { x: pondX, y: pondY }, pondRadius);
}
