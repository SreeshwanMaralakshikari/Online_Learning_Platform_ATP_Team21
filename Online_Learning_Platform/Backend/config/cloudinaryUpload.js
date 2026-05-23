import cloudinary from "./cloudinary.js";

/**
 * Upload a file buffer to Cloudinary.
 * Supports images, videos, PDFs, and raw documents.
 *
 * @param {Buffer} buffer      - File buffer from multer memoryStorage
 * @param {string} mimetype    - MIME type of the file
 * @param {string} originalname - Original filename (used for display name)
 * @returns {Promise<object>}  - Cloudinary upload result
 */
export const uploadToCloudinary = (buffer, mimetype, originalname = "file") => {
  return new Promise((resolve, reject) => {
    // Determine resource_type for Cloudinary
    let resourceType = "auto";
    if (mimetype.startsWith("image/")) {
      resourceType = "image";
    } else if (mimetype.startsWith("video/")) {
      resourceType = "video";
    } else {
      // PDFs, docs, pptx, txt → raw
      resourceType = "raw";
    }

    const uploadOptions = {
      folder: "olp_media",
      resource_type: resourceType,
      // Preserve original filename in public_id for readability
      public_id: `${Date.now()}-${originalname.replace(/[^a-z0-9.\-_]/gi, "_")}`,
      use_filename: false,
      unique_filename: false,
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });

    stream.end(buffer);
  });
};
