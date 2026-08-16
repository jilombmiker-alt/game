"use client";

import { useEffect, useMemo, useState } from "react";
import { buildContinuitySnapshot, hydrateLargeWorld } from "./continuity";
import MediumWorldPlayer from "./medium-world-player";
import { storageKeys } from "./medium-world-engine";
import type { ContinuitySnapshot, MediumRun, MediumWorld } from "./medium-world-types";

export default function LargeWorldPlayer({ world }: { world: MediumWorld }) {
  const [snapshot, setSnapshot] = useState<ContinuitySnapshot | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      let existing: Partial<MediumRun> | null = null;
      try { existing = JSON.parse(window.localStorage.getItem(storageKeys(world.id).current) ?? "null") as Partial<MediumRun> | null; } catch { existing = null; }
      const inherited = existing?.inheritance;
      setSnapshot(inherited?.schemaVersion === "continuity-snapshot-v1" && inherited.targetWorldId === world.id
        ? inherited
        : buildContinuitySnapshot(window.localStorage, world.id as "L01" | "L02"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [world.id]);
  const resolved = useMemo(() => snapshot ? hydrateLargeWorld(world, snapshot) : world, [snapshot, world]);
  if (!snapshot) return <main className="medium-shell"><section className="medium-result-card"><p>正在核对九界正史与旧存档……</p></section></main>;
  return <MediumWorldPlayer world={resolved} scaleLabel="大型连续世界" inheritance={snapshot} />;
}
