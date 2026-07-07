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

  function toBoolean(value) {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      const cleaned = value.trim().toLowerCase();
      if (cleaned === "true") {
        return true;
      }

      if (cleaned === "false") {
        return false;
      }
    }

    return null;
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

  function isGroundAltitude(value) {
    return typeof value === "string" && value.trim().toLowerCase() === "ground";
  }

  function readOnGround(plane) {
    const explicitOnGround = toBoolean(plane.onGround);
    if (explicitOnGround !== null) {
      return explicitOnGround;
    }

    return isGroundAltitude(plane.altitude) || isGroundAltitude(plane.alt_baro);
  }

  function normalizePlane(plane) {
    if (!plane || typeof plane !== "object") {
      return null;
    }

    return {
      icao: toCleanString(plane.icao),
      flight: toCleanString(plane.flight),
      registration: toCleanString(plane.registration),
      icaoType: toCleanString(plane.icaoType),
      typeName: toCleanString(plane.typeName),
      typeLong: toCleanString(plane.typeLong),
      typeDescription: toCleanString(plane.typeDescription),
      aircraftType: toCleanString(plane.aircraftType),
      desc: toCleanString(plane.desc),
      position: readPosition(plane.position),
      gs: toFiniteNumber(plane.gs),
      speed: toFiniteNumber(plane.speed),
      track: toFiniteNumber(plane.track),
      onGround: readOnGround(plane),
      altitude: readAltitude(plane.altitude),
      alt_baro: readAltitude(plane.alt_baro),
      alt_geom: readAltitude(plane.alt_geom),
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

  function currentPlaneFromGlobalSelection() {
    try {
      if (typeof SelectedPlane !== "undefined" && SelectedPlane) {
        return SelectedPlane;
      }
    } catch (error) {
      // Ignore and continue to the next page-global fallback.
    }

    try {
      if (typeof sp !== "undefined" && sp) {
        return sp;
      }
    } catch (error) {
      // Ignore and continue to selected-plane collections.
    }

    return null;
  }

  function selectedPlanesFromGlobal() {
    let selectedPlanes = window.SelPlanes;

    try {
      if (!selectedPlanes && typeof SelPlanes !== "undefined") {
        selectedPlanes = SelPlanes;
      }
    } catch (error) {
      // Keep the window-property value if the lexical global is unavailable.
    }

    if (!selectedPlanes || typeof selectedPlanes !== "object") {
      return [];
    }

    if (Array.isArray(selectedPlanes)) {
      return selectedPlanes.filter((plane) => plane && plane.selected);
    }

    return Object.keys(selectedPlanes).map((key) => selectedPlanes[key]).filter((plane) => plane && plane.selected);
  }

  function readCurrentPlane() {
    const currentPlane = currentPlaneFromGlobalSelection();
    if (currentPlane) {
      return currentPlane;
    }

    const selectedPlanes = readSelectedPlanes();
    return selectedPlanes.length > 0 ? selectedPlanes[0] : null;
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
    const plane = normalizePlane(readCurrentPlane());

    window.postMessage(
      {
        source: CHANNEL,
        type: MESSAGE_TYPE_SELECTION,
        selected: Boolean(plane),
        selectedCount: selected.length,
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
