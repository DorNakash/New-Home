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

  try {
    const relativePath = await saveImage(req.file, req.user!.householdId, itemId);
    res.status(201).json({ path: relativePath, url: imageUrl(relativePath) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("BLOB_READ_WRITE_TOKEN")) {
      return res.status(503).json({ error: "העלאת קבצים אינה זמינה — נא להשתמש בקישור לתמונה" });
    }
    res.status(500).json({ error: "העלאת התמונה נכשלה" });
  }
});

export default router;
