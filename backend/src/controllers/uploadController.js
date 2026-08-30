const crypto = require("crypto");
const path = require("path");
const multer = require("multer");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const r2 = require("../utils/r2");

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) =>
    allowed.has(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only JPG, PNG and WebP product images are allowed.")),
});

function key(file) {
  const ext =
    path.extname(file.originalname).toLowerCase() ||
    {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    }[file.mimetype];

  return `products/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${ext}`;
}

async function putObject(objectKey, file) {
  const workerBucket =
    globalThis.__KK_CLOUDFLARE_ENV &&
    globalThis.__KK_CLOUDFLARE_ENV.PRODUCT_IMAGES;

  if (workerBucket) {
    // Native R2 binding in Cloudflare Workers: no R2 access keys required.
    await workerBucket.put(objectKey, file.buffer, {
      httpMetadata: {
        contentType: file.mimetype,
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
    return;
  }

  // Local Node fallback keeps your current S3-compatible R2 workflow working.
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
}

exports.upload = upload;

exports.uploadProductImages = async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];

    if (!files.length) {
      return res
        .status(400)
        .json({ message: "Please select at least one product image." });
    }

    const publicBase = String(process.env.R2_PUBLIC_URL || "").replace(
      /\/+$/,
      ""
    );

    if (!publicBase) {
      return res.status(500).json({
        message: "R2_PUBLIC_URL is not configured.",
      });
    }

    const images = [];

    for (const file of files) {
      const objectKey = key(file);
      await putObject(objectKey, file);

      images.push({
        key: objectKey,
        url: `${publicBase}/${objectKey}`,
        originalName: file.originalname,
      });
    }

    return res.status(201).json({
      message: "Product images uploaded successfully.",
      images,
    });
  } catch (error) {
    console.error("Product image upload failed:", error);
    return res
      .status(500)
      .json({ message: error.message || "Product image upload failed." });
  }
};
