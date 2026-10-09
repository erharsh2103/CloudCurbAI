import { lazy, Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { ComputeSceneProps } from "./compute-scene";

const ComputeScene = lazy(() => import("./compute-scene"));
export function SceneView(props: ComputeSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let loadTimer: number | undefined;
    let observer: IntersectionObserver | undefined;
    const scheduleLoad = () => {
      loadTimer = window.setTimeout(() => setShouldLoad(true), 500);
    };

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer?.disconnect();
            scheduleLoad();
          }
        },
        { rootMargin: "120px" },
      );
      observer.observe(container);
    } else {
      scheduleLoad();
    }

    return () => {
      observer?.disconnect();
      if (loadTimer !== undefined) window.clearTimeout(loadTimer);
    };
  }, []);

  return (
    <div className="scene-container" ref={containerRef}>
      {shouldLoad ? (
        <ClientOnly fallback={<div className="scene-loading">Preparing infrastructure…</div>}>
          <Suspense fallback={<div className="scene-loading">Preparing infrastructure…</div>}>
            <ComputeScene {...props} />
          </Suspense>
        </ClientOnly>
      ) : (
        <div className="scene-loading">Preparing infrastructure…</div>
      )}
    </div>
  );
}
