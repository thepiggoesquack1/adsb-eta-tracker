(() => {
  "use strict";

  const CHANNEL = "ADSB_ETA_TRACKER_BRIDGE";
  const MESSAGE_TYPE_SELECTION = "selection";
  const UPDATE_INTERVAL_MS = 1000;
  const GLOBAL_GUARD = "__ADSB_ETA_PAGE_READER_ACTIVE__";

  if (window[GLOBAL_GUARD]) {
    return;
  }

  window[GLOBAL_GUARD] = true;

  let intervalId = null;

  function toFiniteNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  function toCleanString(value) {
    if (typeof value !== "string") {
      return null;
    }

    const cleaned = value.trim();
    return cleaned === "" ? null : cleaned;
  }

  function readAltitude(value) {
    const numericAltitude = toFiniteNumber(value);
    if (numericAltitude !== null) {
      return numericAltitude;
    }

    return toCleanString(value);
  }

  function readPosition(position) {
    if (!Array.isArray(position) || position.length < 2) {
      return null;
    }

    const longitude = toFiniteNumber(position[0]);
    const latitude = toFiniteNumber(position[1]);

    if (longitude === null || latitude === null) {
      return null;
    }

    return [longitude, latitude];
  }

  function normalizePlane(plane) {
    if (!plane || typeof plane !== "object") {
      return null;
    }

    return {
      flight: toCleanString(plane.flight),
      registration: toCleanString(plane.registration),
      icaoType: toCleanString(plane.icaoType),
      position: readPosition(plane.position),
      gs: toFiniteNumber(plane.gs),
      track: toFiniteNumber(plane.track),
      altitude: readAltitude(plane.altitude),
      vert_rate: toFiniteNumber(plane.vert_rate)
    };
  }

  function selectedPlanesFromFunction() {
    if (typeof window.selectedPlanes !== "function") {
      return null;
    }

    const planes = window.selectedPlanes();
    return Array.isArray(planes) ? planes : null;
  }

  function selectedPlanesFromGlobal() {
    const selectedPlanes = window.SelPlanes;

    if (!selectedPlanes || typeof selectedPlanes !== "object") {
      return [];
    }

    return Object.keys(selectedPlanes)
      .map((key) => selectedPlanes[key])
      .filter((plane) => plane && plane.selected);
  }

  function readSelectedPlanes() {
    try {
      const planes = selectedPlanesFromFunction();
      if (planes) {
        return planes;
      }
    } catch (error) {
      // Fall back to SelPlanes below. ADS-B Exchange internals can change while
      // the map is updating, so a single failed read should not break polling.
    }

    try {
      return selectedPlanesFromGlobal();
    } catch (error) {
      return [];
    }
  }

  function postSelection() {
    const selected = readSelectedPlanes();
    const plane = selected.length > 0 ? normalizePlane(selected[0]) : null;

    window.postMessage(
      {
        source: CHANNEL,
        type: MESSAGE_TYPE_SELECTION,
        selected: Boolean(plane),
        plane,
        timestamp: Date.now()
      },
      window.location.origin
    );
  }

  function stopPolling() {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }

    window[GLOBAL_GUARD] = false;
  }

  postSelection();
  intervalId = window.setInterval(postSelection, UPDATE_INTERVAL_MS);
  window.addEventListener("pagehide", stopPolling, { once: true });
})();
