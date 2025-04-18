import express from "express";
const app = express();

app.get("/api/health", (_req, res) => {
  res.type("text/plain").send("OK\n");
});

const PORT = 4000;
app.listen(PORT, () => console.log(`✅ API up on port ${PORT}`));
