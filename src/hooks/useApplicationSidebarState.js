import { useState } from "react";

export default function useApplicationSidebarState() {
  const [collapsedApps, setCollapsedApps] = useState({});
  const [collapsedSteps, setCollapsedSteps] = useState({});
  const [collapsedSupport, setCollapsedSupport] = useState({});

  const toggle = (setter, map, id, force = null) => {
    setter((prev) => ({
      ...prev,
      [id]: force !== null ? force : !prev[id],
    }));
  };

  return {
    collapsedApps,
    collapsedSteps,
    collapsedSupport,
    setCollapsedApps,
    setCollapsedSteps,
    setCollapsedSupport,
    toggle,
  };
}
