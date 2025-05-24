import { Metadata } from "next";

export function constructMetadata({
  title,
  fullTitle,
  description = "Lorrigo is the modern logistics platform for fast and efficient delivery.",
  image = "https://assets.lorrigo.in/thumbnail.jpg",
  video,
  icons = [
    {
      rel: "apple-touch-icon",
      sizes: "32x32",
      url: "https://lorrigo.in/_next/static/media/lorrigologo.e54a51f3.svg"
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      url: "https://lorrigo.in/_next/static/media/lorrigologo.e54a51f3.svg"
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      url: "https://lorrigo.in/_next/static/media/lorrigologo.e54a51f3.svg"
    },
  ],
  url,
  canonicalUrl,
  noIndex = false,
  manifest,
}: {
  title?: string;
  fullTitle?: string;
  description?: string;
  image?: string | null;
  video?: string | null;
  icons?: Metadata["icons"];
  url?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  manifest?: string | URL | null;
} = {}): Metadata {
  return {
    title:
      fullTitle ||
      (title ? `${title} | Lorrigo` : "Lorrigo - The Modern Logistics Platform"),
    description,
    openGraph: {
      title,
      description,
      ...(image && {
        images: image,
      }),
      url,
      ...(video && {
        videos: video,
      }),
    },
    twitter: {
      title,
      description,
      ...(image && {
        card: "summary_large_image",
        images: [image],
      }),
      ...(video && {
        player: video,
      }),
      creator: "@lorrigo",
    },
    icons,
    metadataBase: new URL("https://lorrigo.in"),
    ...((url || canonicalUrl) && {
      alternates: {
        canonical: url || canonicalUrl,
      },
    }),
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
    ...(manifest && {
      manifest,
    }),
  };
}