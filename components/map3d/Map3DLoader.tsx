"use client";

import dynamic from "next/dynamic";
import type { Map3dData } from "@/lib/dashboard/map3d";
import type { RegionMapData } from "@/lib/dashboard/regionMap";

// WebGL maps only run in the browser, so the map is loaded there and skipped during server rendering.
const Map3D = dynamic(() => import("./Map3D"), {
  ssr: false,
  loading: () => <div className="h-[28rem] w-full animate-pulse rounded-lg bg-black/5 dark:bg-white/10" />,
});

export function Map3DLoader(props: { data: Map3dData; focusSiteId?: string; compact?: boolean }) {
  return <Map3D {...props} />;
}

const RegionMap = dynamic(() => import("./RegionMap"), {
  ssr: false,
  loading: () => <div className="h-[72vh] min-h-[480px] w-full animate-pulse rounded-lg bg-black/5 dark:bg-white/10" />,
});

export function RegionMapLoader(props: { data: RegionMapData; dayStart: number; lastHour: number; startHour: number }) {
  return <RegionMap {...props} />;
}
