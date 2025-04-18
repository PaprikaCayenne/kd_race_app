import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { name, horseId, deviceId } = req.body;
  if (!name || !horseId || !deviceId) {
    return res.status(400).json({ error: "Name, horseId, and deviceId are required" });
  }

  try {
    const client = await pool.connect();

    let result = await client.query("SELECT id FROM users WHERE device_id = $1", [deviceId]);
    let userId;

    if (result.rows.length > 0) {
      userId = result.rows[0].id;
    } else {
      result = await client.query(
        "INSERT INTO users (name, device_id) VALUES ($1, $2) RETURNING id",
        [name, deviceId]
      );
      userId = result.rows[0].id;

      await client.query(
        "INSERT INTO registrations (user_id, horse_id) VALUES ($1, $2)",
        [userId, horseId]
      );
    }

    client.release();
    res.json({ userId });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
