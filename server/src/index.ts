import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import roomsRoutes from "./routes/rooms.js";
import dashboardRoutes from "./routes/dashboard.js";
import itemsRoutes from "./routes/items.js";
import categoriesRoutes from "./routes/categories.js";
import storesRoutes from "./routes/stores.js";
import uploadRoutes from "./routes/upload.js";
import optionsRoutes from "./routes/options.js";
import householdRoutes from "./routes/household.js";
import importRoutes from "./routes/import.js";
import { UPLOADS_ROOT } from "./storage.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// In dev, serve uploads from local disk; in prod images are served from Vercel Blob CDN
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  app.use("/uploads", express.static(UPLOADS_ROOT));
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/items", itemsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/stores", storesRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/household", householdRoutes);
app.use("/api/import", importRoutes);
app.use("/api", optionsRoutes);

// In serverless (Vercel) the function handler uses the exported app;
// listen() is only needed for local development.
if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

export default app;
