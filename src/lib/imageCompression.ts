export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxBytes?: number;
  quality?: number;
}

const DEFAULT_OPTIONS: Required<ImageCompressionOptions> = {
  maxWidth: 2000,
  maxHeight: 2000,
  maxBytes: 3 * 1024 * 1024, // 3 MB
  quality: 0.82,
};

export async function compressProductImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<File> {
  const settings = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  if (!file.type.startsWith("image/")) {
    throw new Error("Selected file is not an image.");
  }

  // 20 MB maximum original upload
  const maxOriginalBytes = 20 * 1024 * 1024;

  if (file.size > maxOriginalBytes) {
    throw new Error("Image must be 20 MB or smaller.");
  }

  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  try {
    let width = bitmap.width;
    let height = bitmap.height;

    // Resize while preserving aspect ratio.
    const scale = Math.min(
      settings.maxWidth / width,
      settings.maxHeight / height,
      1
    );

    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not create image processing canvas.");
    }

    canvas.width = width;
    canvas.height = height;

    context.drawImage(bitmap, 0, 0, width, height);

    // Start with the requested quality.
    let quality = settings.quality;

    let blob = await canvasToBlob(
      canvas,
      "image/jpeg",
      quality
    );

    // Reduce quality if the image is still larger than 3 MB.
    while (
      blob.size > settings.maxBytes &&
      quality > 0.5
    ) {
      quality -= 0.05;

      blob = await canvasToBlob(
        canvas,
        "image/jpeg",
        quality
      );
    }

    // If quality reduction wasn't enough, progressively reduce dimensions.
    while (
      blob.size > settings.maxBytes &&
      width > 1200 &&
      height > 1200
    ) {
      width = Math.round(width * 0.85);
      height = Math.round(height * 0.85);

      canvas.width = width;
      canvas.height = height;

      context.drawImage(
        bitmap,
        0,
        0,
        width,
        height
      );

      quality = 0.75;

      blob = await canvasToBlob(
        canvas,
        "image/jpeg",
        quality
      );
    }

    const originalName =
      file.name.replace(/\.[^/.]+$/, "") || "product-image";

    const compressedFile = new File(
      [blob],
      `${originalName}.jpg`,
      {
        type: "image/jpeg",
        lastModified: Date.now(),
      }
    );

    return compressedFile;
  } finally {
    bitmap.close();
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new Error("Could not compress image.")
          );
          return;
        }

        resolve(blob);
      },
      type,
      quality
    );
  });
}