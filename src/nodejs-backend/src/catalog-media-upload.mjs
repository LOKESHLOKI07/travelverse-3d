import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import multer from "multer";
import express from "express";
import { debugCatalogMedia } from "./tourist-debug.mjs";

/** Browser-visible prefix when the app is served via Vite proxy (dev). */
const DEFAULT_URL_PREFIX = "/api-node/catalog-media";

function extFromFile(file) {
  const n = file.originalname || "";
  const m = /\.(jpe?g|png|webp|gif)$/i.exec(n);
  if (m) return m[0].toLowerCase();
  const t = (file.mimetype || "").toLowerCase();
  if (t === "image/jpeg") return ".jpg";
  if (t === "image/png") return ".png";
  if (t === "image/webp") return ".webp";
  if (t === "image/gif") return ".gif";
  return ".jpg";
}

/**
 * @param {import('express').Application} app
 * @param {{ uploadDir: string, isAdminRequest: (req: import('express').Request) => Promise<boolean>, urlPrefix?: string }} options
 */
export function attachCatalogMediaRoutes(app, options) {
  const { uploadDir, isAdminRequest } = options;
  const urlPrefix = (options.urlPrefix ?? DEFAULT_URL_PREFIX).replace(/\/$/, "");

  const storage = multer.diskStorage({
    destination(_req, _file, cb) {
      try {
        if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (e) {
        cb(e);
      }
    },
    filename(_req, file, cb) {
      cb(null, `${randomUUID()}${extFromFile(file)}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter(_req, file, cb) {
      if (/^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only JPEG, PNG, WebP, or GIF images are allowed"));
      }
    },
  });

  app.post(
    "/catalog-media/upload",
    (req, res, next) => {
      upload.single("image")(req, res, (err) => {
        if (err) return next(err);
        next();
      });
    },
    async (req, res) => {
      if (!(await isAdminRequest(req))) {
        if (debugCatalogMedia()) {
          console.warn("[tourist-debug][catalog-media] upload rejected (not admin)");
        }
        res.status(403).json({ error: "Admin only" });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: "Missing image file (field name: image)" });
        return;
      }
      const publicUrl = `${urlPrefix}/${req.file.filename}`;
      if (debugCatalogMedia()) {
        console.log("[tourist-debug][catalog-media] upload OK", {
          diskPath: req.file.path,
          uploadDir,
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
          publicUrl,
        });
      }
      res.json({ url: publicUrl });
    },
  );

  if (debugCatalogMedia()) {
    app.use("/catalog-media", (req, res, next) => {
      if (req.method === "GET" && req.path !== "/upload") {
        console.log("[tourist-debug][catalog-media] static GET", {
          originalUrl: req.originalUrl,
          path: req.path,
        });
      }
      next();
    });
  }

  app.use(
    "/catalog-media",
    express.static(uploadDir, {
      maxAge: "7d",
      fallthrough: false,
    }),
  );
}
