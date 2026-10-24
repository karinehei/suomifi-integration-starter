import { useEffect, useState } from "react";

export type RouteId = "walkthrough" | "inspector" | "audit" | "architecture" | "status";

export function useRoute(): { id: RouteId; unknown: boolean } {
  const [route, setRoute] = useState(() => readRoute());
  useEffect(() => {
    const onChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

const ROUTES: readonly RouteId[] = ["walkthrough", "inspector", "audit", "architecture", "status"];

export function readRoute(): { id: RouteId; unknown: boolean } {
  const name = window.location.hash.replace(/^#\/?/, "").split(/[?#]/)[0];
  if (name === "" || name === "walkthrough") return { id: "walkthrough", unknown: false };
  if ((ROUTES as readonly string[]).includes(name)) {
    return { id: name as RouteId, unknown: false };
  }
  return { id: "walkthrough", unknown: true };
}
