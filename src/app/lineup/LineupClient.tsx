"use client";

import dynamic from "next/dynamic";

const Lineup = dynamic(() => import("@/components/Lineup"), { ssr: false });

export default function LineupClient() {
  return <Lineup />;
}
