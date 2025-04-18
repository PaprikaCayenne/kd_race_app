import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.get("/:raceId/results", async (req, res) => {
  const raceId = parseInt(req.params.raceId, 10);
  if (isNaN(raceId)) {
    return res.status(400).json({ error: "Invalid race ID" });
  }

  try {
    const result = await pool.query(
      `SELECT r.position, r.time_ms, h.id AS horse_id, h.name, h.color
       FROM results r
       JOIN horses h ON r.horse_id = h.id
       WHERE r.race_id = $1
       ORDER BY r.position`,
      [raceId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching race results:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
