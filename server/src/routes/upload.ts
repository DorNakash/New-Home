import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../auth/middleware.js";
import { saveImage, imageUrl } from "../storage.js";

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.post("/", upload.single("file"), async (req, res) => {
  const itemId = req.body?.itemId;
  if (!req.file || !itemId) {
    return res.status(400).json({ error: "יש לצרף קובץ ומזהה פריט" });
  }

  const relativePath = await saveImage(req.file, req.user!.householdId, itemId);
  res.status(201).json({ path: relativePath, url: imageUrl(relativePath) });
});

export default router;
