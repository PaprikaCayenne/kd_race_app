import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.post("/start", async (req, res) => {
  const adminPass = req.header("x-admin-pass");
  if (adminPass !== process.env.API_ADMIN_PASS) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const client = await pool.connect();

    const racedHorseIdsRes = await client.query("SELECT DISTINCT horse_id FROM results");
    const racedHorseIds = racedHorseIdsRes.rows.map(row => row.horse_id);

    const availableHorsesRes = await client.query(
      "SELECT id, name, color FROM horses WHERE id != ALL($1::int[])",
      [racedHorseIds.length ? racedHorseIds : [0]]
    );

    const availableHorses = availableHorsesRes.rows;

    if (availableHorses.length < 4) {
      client.release();
      return res.status(400).json({ error: "Not enough unraced horses" });
    }

    const shuffled = availableHorses.sort(() => 0.5 - Math.random());
    const selectedHorses = shuffled.slice(0, 4);

    const raceRes = await client.query(
      "INSERT INTO races (started_at) VALUES (NOW()) RETURNING id"
    );
    const raceId = raceRes.rows[0].id;

    client.release();
    res.json({ raceId, horses: selectedHorses });
  } catch (err) {
    console.error("Error starting race:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
