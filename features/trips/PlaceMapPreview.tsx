"use client";

import { cn } from "@/lib/utils";

/** Victoria Island / Lagos — mock pin until places API returns coordinates. */
export const MOCK_PLACE_MAP = {
  lat: 6.4281,
  lng: 3.4219,
  /** ~zoom 15 viewport around the pin */
  bbox: {
    minLng: 3.4019,
    minLat: 6.4131,
    maxLng: 3.4419,
    maxLat: 6.4431,
  },
} as const;

interface PlaceCoords {
  lat: number;
  lng: number;
  bbox: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  };
}

export function getPlaceMapEmbedUrl(coords: PlaceCoords = MOCK_PLACE_MAP): string {
  const { minLng, minLat, maxLng, maxLat } = coords.bbox;
  const { lat, lng } = coords;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export function getPlaceMapOpenUrl(coords: PlaceCoords = MOCK_PLACE_MAP): string {
  return `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=15/${coords.lat}/${coords.lng}`;
}

interface PlaceMapPreviewProps {
  placeName: string;
  className?: string;
  /** Optional override when backend sends real coords later. */
  lat?: number;
  lng?: number;
}

/**
 * Frontend map preview — OSM embed (no backend).
 * Replaces the old staticmap.openstreetmap.de image, which often fails to load.
 */
export function PlaceMapPreview({
  placeName,
  className,
  lat = MOCK_PLACE_MAP.lat,
  lng = MOCK_PLACE_MAP.lng,
}: PlaceMapPreviewProps) {
  const delta = 0.015;
  const embedUrl = getPlaceMapEmbedUrl({
    lat,
    lng,
    bbox: {
      minLng: lng - delta,
      minLat: lat - delta,
      maxLng: lng + delta,
      maxLat: lat + delta,
    },
  });
  const openUrl = getPlaceMapOpenUrl({
    lat,
    lng,
    bbox: MOCK_PLACE_MAP.bbox,
  });

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[16px] bg-[#E8EEF5]",
        className
      )}
    >
      <iframe
        title={`Map near ${placeName}`}
        src={embedUrl}
        className="h-[160px] w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a
        href={openUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "absolute bottom-2 right-2 rounded-full bg-white/95 px-2.5 py-1",
          "text-[11px] font-medium text-[#15131A] shadow-sm",
          "transition-opacity hover:opacity-90"
        )}
      >
        Open map
      </a>
    </div>
  );
}
