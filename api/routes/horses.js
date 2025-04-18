import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query("SELECT id, name, color FROM horses ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching horses:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
