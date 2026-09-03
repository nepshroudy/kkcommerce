import {
  requireProductOrderStaff,
} from "../utils/auth.mjs";
import { json } from "../utils/http.mjs";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function extensionFor(file) {
  const byType = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };

  const name = String(file.name || "");
  const match = name.match(/\.(jpe?g|png|webp)$/i);

  if (match) {
    const ext = match[1].toLowerCase();
    return ext === "jpeg" ? ".jpg" : `.${ext}`;
  }

  return byType[file.type] || "";
}

function makeObjectKey(file) {
  const date = new Date().toISOString().slice(0, 10);
  const ext = extensionFor(file);
  return `products/${date}/${crypto.randomUUID()}${ext}`;
}

export async function uploadProductImagesRoute(request, context) {
  try {
    await requireProductOrderStaff(
  request,
  context.env
);

    if (!context.env.PRODUCT_IMAGES) {
      return json(
        { message: "PRODUCT_IMAGES R2 binding is not configured." },
        500
      );
    }

    const publicBase = String(
      context.env.R2_PUBLIC_URL || ""
    ).replace(/\/+$/, "");

    if (!publicBase) {
      return json(
        { message: "R2_PUBLIC_URL is not configured." },
        500
      );
    }

    const contentType = request.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return json(
        { message: "Content-Type must be multipart/form-data." },
        415
      );
    }

    let formData;

    try {
      formData = await request.formData();
    } catch (error) {
      console.error("Could not parse multipart upload:", error);
      return json(
        { message: "Could not read uploaded images." },
        400
      );
    }

    const entries = formData.getAll("images");
    const files = entries.filter(
      (value) =>
        typeof File !== "undefined" &&
        value instanceof File
    );

    if (!files.length) {
      return json(
        { message: "Please select at least one product image." },
        400
      );
    }

    if (files.length > MAX_FILES) {
      return json(
        { message: `Maximum ${MAX_FILES} images are allowed.` },
        400
      );
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return json(
          {
            message:
              "Only JPG, PNG and WebP product images are allowed.",
          },
          400
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return json(
          { message: "Each image must be 10 MB or smaller." },
          400
        );
      }
    }

    const images = [];

    for (const file of files) {
      const objectKey = makeObjectKey(file);

      await context.env.PRODUCT_IMAGES.put(
        objectKey,
        file.stream(),
        {
          httpMetadata: {
            contentType: file.type,
            cacheControl:
              "public, max-age=31536000, immutable",
          },
          customMetadata: {
            originalName: String(file.name || ""),
          },
        }
      );

      images.push({
        key: objectKey,
        url: `${publicBase}/${objectKey}`,
        originalName: file.name,
      });
    }

    return json(
      {
        message: "Product images uploaded successfully.",
        images,
      },
      201
    );
  } catch (error) {
    console.error("Product image upload failed:", error);

    return json(
      {
        message:
          error?.message || "Product image upload failed.",
      },
      error?.status || 500
    );
  }
}
