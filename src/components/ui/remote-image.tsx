"use client";

import Image, { type ImageProps } from "next/image";

import { isNextImageOptimizable } from "@/lib/image-remote";
import { cn } from "@/lib/utils";

const VARIANT_DEFAULTS = {
  thumbnail: { quality: 70, sizes: "140px" },
  card: { quality: 75, sizes: "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" },
  profile: { quality: 80, sizes: "(max-width: 768px) 48px, 96px" },
  overlay: { quality: 85, sizes: "128px" },
  sheetMusic: { quality: 82, sizes: "(max-width: 1100px) 96vw" },
} as const;

export type RemoteImageVariant = keyof typeof VARIANT_DEFAULTS;

export type RemoteImageProps = Omit<ImageProps, "quality" | "loading"> & {
  variant?: RemoteImageVariant;
};

export function RemoteImage({
  variant = "card",
  src,
  alt,
  quality,
  sizes,
  loading,
  priority,
  unoptimized,
  className,
  ...props
}: RemoteImageProps) {
  const defaults = VARIANT_DEFAULTS[variant];
  const srcString = typeof src === "string" ? src : "";
  const canOptimize = srcString ? isNextImageOptimizable(srcString) : false;

  return (
    <Image
      src={src}
      alt={alt}
      quality={quality ?? defaults.quality}
      sizes={sizes ?? defaults.sizes}
      loading={priority ? undefined : (loading ?? "lazy")}
      priority={priority}
      unoptimized={unoptimized ?? !canOptimize}
      className={cn(className)}
      {...props}
    />
  );
}
