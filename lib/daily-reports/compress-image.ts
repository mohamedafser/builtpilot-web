"use client";

import { MAX_SITE_PHOTO_DIMENSION } from "@/constants/daily-report";

const JPEG_QUALITY = 0.84;
const SKIP_UNDER_BYTES = 900_000;

function isCompressibleType(type: string): boolean {
  return (
    type === "image/jpeg" ||
    type === "image/jpg" ||
    type === "image/png" ||
    type === "image/webp"
  );
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read this image."));
    };

    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to compress this image."));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}

export async function compressImageFile(file: File): Promise<File> {
  if (!isCompressibleType(file.type) || file.size < SKIP_UNDER_BYTES) {
    return file;
  }

  try {
    const image = await loadImage(file);
    const largestSide = Math.max(image.width, image.height);

    if (
      largestSide <= MAX_SITE_PHOTO_DIMENSION &&
      file.size < SKIP_UNDER_BYTES * 2
    ) {
      return file;
    }

    const scale =
      largestSide > MAX_SITE_PHOTO_DIMENSION
        ? MAX_SITE_PHOTO_DIMENSION / largestSide
        : 1;
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, width, height);
    const outputType =
      file.type === "image/png" || file.type === "image/webp"
        ? file.type
        : "image/jpeg";
    const blob = await canvasToBlob(canvas, outputType, JPEG_QUALITY);

    if (blob.size >= file.size) {
      return file;
    }

    const nextName =
      outputType === file.type
        ? file.name
        : file.name.replace(/\.[^.]+$/, ".jpg");

    return new File([blob], nextName, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
