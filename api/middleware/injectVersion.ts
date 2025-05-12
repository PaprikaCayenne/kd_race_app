// File: api/middleware/injectVersion.ts
// Version: v0.1.0 — Injects backend version from package.json into all responses

import { version } from '../../package.json';

export default function injectBackendVersion(req, res, next) {
  res.setHeader('X-KD-Backend-Version', `v${version}`);
  res.locals.__KD_BACKEND_VERSION__ = `v${version}`;
  next();
}
