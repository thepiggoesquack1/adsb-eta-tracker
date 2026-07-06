(() => {
  "use strict";

  const CONTENT_GUARD = "__ADSB_ETA_CONTENT_ACTIVE__";

  if (window[CONTENT_GUARD]) {
    return;
  }

  window[CONTENT_GUARD] = true;

  const CHANNEL = "ADSB_ETA_TRACKER_BRIDGE";
  const MESSAGE_TYPE_SELECTION = "selection";
  const PANEL_ID = "adsb-eta-panel";
  const APPROACH_SEGMENT_NM = 15;
  const EARTH_RADIUS_NM = 3440.065;

  const CONFIG = globalThis.ADSB_ETA_TRACKER_CONFIG || {
    storageKeys: {
      destination: "destination"
    },
    defaultDestination: {
      name: "Configured Destination",
      latitude: 36.58945221767374,
      longitude: -121.85851779542429
    }
  };
  const DESTINATION_STORAGE_KEY = CONFIG.storageKeys.destination;
  const DEFAULT_DESTINATION = Object.freeze({ ...CONFIG.defaultDestination });

  const APPROACH_SPEEDS_KT = Object.freeze({
    C150: 65,
    C152: 65,
    C162: 65,
    C172: 70,
    C177: 75,
    C182: 80,
    C185: 85,
    C206: 85,
    C207: 85,
    C208: 95,
    C210: 90,
    C310: 105,
    C340: 110,
    C414: 110,
    C421: 115,
    C425: 115,
    C441: 120,
    P28A: 75,
    PA28: 75,
    PA32: 85,
    PA34: 90,
    PA46: 100,
    P46T: 105,
    SR20: 85,
    SR22: 90,
    BE33: 90,
    BE35: 90,
    BE36: 95,
    BE55: 100,
    BE58: 105,
    BE9L: 105,
    BE20: 120,
    B200: 120,
    B300: 125,
    B350: 125,
    E110: 105,
    E120: 120,
    PC12: 110,
    TBM7: 115,
    TBM8: 120,
    TBM9: 120,
    TBM: 120,
    C500: 120,
    C501: 120,
    C510: 115,
    C525: 120,
    C25A: 120,
    C25B: 125,
    C25C: 125,
    C550: 125,
    C551: 125,
    C560: 130,
    C56X: 130,
    C650: 135,
    C680: 135,
    C68A: 135,
    C700: 135,
    C750: 140,
    LJ23: 125,
    LJ24: 125,
    LJ25: 125,
    LJ31: 125,
    LJ35: 130,
    LJ40: 130,
    LJ45: 130,
    LJ55: 135,
    LJ60: 135,
    LJ70: 135,
    LJ75: 135,
    GLF2: 135,
    GLF3: 135,
    GLF4: 140,
    GLF5: 145,
    GLF6: 145,
    GLF7: 145,
    G150: 130,
    G200: 135,
    G280: 135,
    FA10: 130,
    FA20: 130,
    FA50: 135,
    F2TH: 135,
    F2LX: 135,
    FA7X: 140,
    FA8X: 140,
    F900: 140,
    F9EX: 140,
    CL30: 135,
    CL35: 135,
    CL60: 140,
    CL6T: 140,
    GLEX: 145,
    GL5T: 145,
    GL6T: 145,
    E50P: 115,
    E55P: 125,
    E135: 125,
    E145: 130,
    E545: 130,
    E550: 135,
    E170: 135,
    E75L: 135,
    E75S: 135,
    E190: 140,
    E195: 140,
    E290: 140,
    E295: 140,
    B731: 135,
    B732: 135,
    B733: 140,
    B734: 140,
    B735: 135,
    B736: 135,
    B737: 140,
    B738: 140,
    B739: 145,
    B37M: 140,
    B38M: 140,
    B39M: 145,
    A318: 135,
    A319: 135,
    A320: 140,
    A321: 145,
    A20N: 140,
    A21N: 145,
    CRJ1: 125,
    CRJ2: 125,
    CRJ7: 130,
    CRJ9: 135,
    CRJX: 135,
    BCS1: 135,
    BCS3: 140
  });

  const rows = [
    { key: "flight", label: "Flight" },
    { key: "registration", label: "Reg" },
    { key: "type", label: "Type" },
    { key: "destination", label: "To" },
    { key: "distance", label: "Distance", grouped: true },
    { key: "eta", label: "ETA", grouped: true, emphasized: true },
    { key: "groundSpeed", label: "GS", grouped: true },
    { key: "altitude", label: "Altitude", grouped: true },
    { key: "verticalSpeed", label: "Vertical", grouped: true }
  ];

  const state = {
    selected: false,
    plane: null,
    destination: { ...DEFAULT_DESTINATION },
    lastMessageAt: 0
  };

  const ui = createPanel();
  document.documentElement.append(ui.panel);
  injectPageReader();
  loadStoredDestination();
  subscribeToDestinationChanges();
  renderPanel();

  window.addEventListener("message", handlePageMessage);

  function injectPageReader() {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("page-reader.js");
    script.async = false;
    script.onload = () => script.remove();
    script.onerror = () => script.remove();

    (document.head || document.documentElement).append(script);
  }

  function handlePageMessage(event) {
    if (event.source !== window || event.origin !== window.location.origin) {
      return;
    }

    const data = event.data;

    if (!data || data.source !== CHANNEL || data.type !== MESSAGE_TYPE_SELECTION) {
      return;
    }

    state.selected = Boolean(data.selected);
    state.plane = isPlainObject(data.plane) ? data.plane : null;
    state.lastMessageAt = Date.now();

    renderPanel();
  }

  function loadStoredDestination() {
    if (!hasChromeStorage()) {
      return;
    }

    chrome.storage.sync.get({ [DESTINATION_STORAGE_KEY]: DEFAULT_DESTINATION }, (items) => {
      if (chrome.runtime.lastError) {
        return;
      }

      const storedDestination = normalizeDestination(items[DESTINATION_STORAGE_KEY]);

      if (storedDestination) {
        state.destination = storedDestination;
        renderPanel();
      }
    });
  }

  function subscribeToDestinationChanges() {
    if (!hasChromeStorage() || !chrome.storage.onChanged) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync" || !changes[DESTINATION_STORAGE_KEY]) {
        return;
      }

      const nextDestination =
        normalizeDestination(changes[DESTINATION_STORAGE_KEY].newValue) || { ...DEFAULT_DESTINATION };

      state.destination = nextDestination;
      renderPanel();
    });
  }

  function createPanel() {
    const existingPanel = document.getElementById(PANEL_ID);
    if (existingPanel) {
      existingPanel.remove();
    }

    const panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.className = "adsb-eta-panel";
    panel.setAttribute("aria-label", "ADS-B ETA");

    const header = document.createElement("div");
    header.className = "adsb-eta-header";
    header.textContent = "ADS-B ETA";

    const message = document.createElement("div");
    message.className = "adsb-eta-message";
    message.textContent = "Select an aircraft";

    const list = document.createElement("dl");
    list.className = "adsb-eta-list adsb-eta-hidden";

    const values = {};

    rows.forEach((row) => {
      const wrapper = document.createElement("div");
      wrapper.className = "adsb-eta-row";

      if (row.grouped) {
        wrapper.classList.add("adsb-eta-row-grouped");
      }

      if (row.emphasized) {
        wrapper.classList.add("adsb-eta-row-emphasized");
      }

      const term = document.createElement("dt");
      term.className = "adsb-eta-label";
      term.textContent = row.label;

      const description = document.createElement("dd");
      description.className = "adsb-eta-value";
      description.textContent = "N/A";

      wrapper.append(term, description);
      list.append(wrapper);
      values[row.key] = description;
    });

    panel.append(header, message, list);

    return {
      panel,
      message,
      list,
      values
    };
  }

  function renderPanel() {
    if (!state.selected || !state.plane) {
      ui.message.classList.remove("adsb-eta-hidden");
      ui.list.classList.add("adsb-eta-hidden");
      return;
    }

    const metrics = calculateAircraftMetrics(state.plane);

    ui.values.flight.textContent = formatText(state.plane.flight);
    ui.values.registration.textContent = formatText(state.plane.registration);
    ui.values.type.textContent = formatText(state.plane.icaoType);
    ui.values.destination.textContent = formatText(state.destination.name);
    ui.values.distance.textContent = formatDistance(metrics.distanceNm);
    ui.values.eta.textContent = formatEta(metrics.etaMinutes);
    ui.values.groundSpeed.textContent = formatKnots(state.plane.gs);
    ui.values.altitude.textContent = formatAltitude(state.plane.altitude);
    ui.values.verticalSpeed.textContent = formatVerticalSpeed(state.plane.vert_rate);

    ui.message.classList.add("adsb-eta-hidden");
    ui.list.classList.remove("adsb-eta-hidden");
  }

  function calculateAircraftMetrics(plane) {
    const position = readAircraftPosition(plane);

    if (!position) {
      return {
        distanceNm: null,
        bearingDeg: null,
        approachSpeedKt: getApproachSpeedKt(plane.icaoType, plane.gs),
        etaMinutes: null
      };
    }

    const distanceNm = haversineDistanceNm(
      position.latitude,
      position.longitude,
      state.destination.latitude,
      state.destination.longitude
    );
    const bearingDeg = bearingDegrees(
      position.latitude,
      position.longitude,
      state.destination.latitude,
      state.destination.longitude
    );
    const approachSpeedKt = getApproachSpeedKt(plane.icaoType, plane.gs);
    const etaMinutes = calculateEtaMinutes(distanceNm, plane.gs, approachSpeedKt);

    return {
      distanceNm,
      bearingDeg,
      approachSpeedKt,
      etaMinutes
    };
  }

  function readAircraftPosition(plane) {
    if (!plane || !Array.isArray(plane.position) || plane.position.length < 2) {
      return null;
    }

    const longitude = toFiniteNumber(plane.position[0]);
    const latitude = toFiniteNumber(plane.position[1]);

    if (longitude === null || latitude === null) {
      return null;
    }

    return {
      latitude,
      longitude
    };
  }

  function haversineDistanceNm(fromLatitude, fromLongitude, toLatitude, toLongitude) {
    const fromLatRad = degreesToRadians(fromLatitude);
    const toLatRad = degreesToRadians(toLatitude);
    const deltaLatRad = degreesToRadians(toLatitude - fromLatitude);
    const deltaLonRad = degreesToRadians(toLongitude - fromLongitude);

    const halfChord =
      Math.sin(deltaLatRad / 2) ** 2 +
      Math.cos(fromLatRad) * Math.cos(toLatRad) * Math.sin(deltaLonRad / 2) ** 2;

    const centralAngle = 2 * Math.atan2(Math.sqrt(halfChord), Math.sqrt(1 - halfChord));
    return EARTH_RADIUS_NM * centralAngle;
  }

  function bearingDegrees(fromLatitude, fromLongitude, toLatitude, toLongitude) {
    const fromLatRad = degreesToRadians(fromLatitude);
    const toLatRad = degreesToRadians(toLatitude);
    const deltaLonRad = degreesToRadians(toLongitude - fromLongitude);

    const y = Math.sin(deltaLonRad) * Math.cos(toLatRad);
    const x =
      Math.cos(fromLatRad) * Math.sin(toLatRad) -
      Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(deltaLonRad);

    return normalizeDegrees(radiansToDegrees(Math.atan2(y, x)));
  }

  function calculateEtaMinutes(distanceNm, groundSpeedKt, approachSpeedKt) {
    const normalizedDistance = toFiniteNumber(distanceNm);
    const cruiseSpeed = toFiniteNumber(groundSpeedKt);
    const approachSpeed = toFiniteNumber(approachSpeedKt);

    if (normalizedDistance === null || normalizedDistance < 0 || approachSpeed === null || approachSpeed <= 0) {
      return null;
    }

    const approachDistanceNm = Math.min(normalizedDistance, APPROACH_SEGMENT_NM);
    const cruiseDistanceNm = Math.max(0, normalizedDistance - APPROACH_SEGMENT_NM);

    if (cruiseDistanceNm > 0 && (cruiseSpeed === null || cruiseSpeed <= 0)) {
      return null;
    }

    const cruiseHours = cruiseDistanceNm > 0 ? cruiseDistanceNm / cruiseSpeed : 0;
    const approachHours = approachDistanceNm / approachSpeed;

    return (cruiseHours + approachHours) * 60;
  }

  function getApproachSpeedKt(icaoType, groundSpeedKt) {
    const normalizedType = normalizeAircraftType(icaoType);

    if (normalizedType && APPROACH_SPEEDS_KT[normalizedType]) {
      return APPROACH_SPEEDS_KT[normalizedType];
    }

    const categorySpeed = getCategoryApproachSpeedKt(normalizedType);
    if (categorySpeed !== null) {
      return categorySpeed;
    }

    return getSpeedBasedFallbackKt(groundSpeedKt);
  }

  function getCategoryApproachSpeedKt(icaoType) {
    if (!icaoType) {
      return null;
    }

    if (/^(A3|A20|A21|B7|B37|B38|B39|BCS|CRJ|E17|E19|E29|E75)/.test(icaoType)) {
      return 140;
    }

    if (/^(C5|C6|C7|C25|C68|CL|GL|G1|G2|G3|FA|F2|F9|LJ|E5)/.test(icaoType)) {
      return 135;
    }

    if (/^(BE2|B2|B3|PC12|TBM|C208|C4|P46|E12)/.test(icaoType)) {
      return 115;
    }

    if (/^(C1|C2|C3|PA|P28|SR|BE3|BE5)/.test(icaoType)) {
      return 90;
    }

    return null;
  }

  function getSpeedBasedFallbackKt(groundSpeedKt) {
    const speed = toFiniteNumber(groundSpeedKt);

    if (speed === null) {
      return 120;
    }

    if (speed >= 250) {
      return 135;
    }

    if (speed >= 150) {
      return 120;
    }

    if (speed >= 95) {
      return 105;
    }

    return 80;
  }

  function normalizeAircraftType(icaoType) {
    if (typeof icaoType !== "string") {
      return null;
    }

    const cleaned = icaoType.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    return cleaned === "" ? null : cleaned;
  }

  function normalizeDestination(candidate) {
    if (!candidate || typeof candidate !== "object") {
      return null;
    }

    const latitude = toFiniteNumber(candidate.latitude);
    const longitude = toFiniteNumber(candidate.longitude);

    if (latitude === null || latitude < -90 || latitude > 90) {
      return null;
    }

    if (longitude === null || longitude < -180 || longitude > 180) {
      return null;
    }

    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";

    return {
      name: name || DEFAULT_DESTINATION.name,
      latitude,
      longitude
    };
  }

  function formatText(value) {
    if (typeof value !== "string") {
      return "N/A";
    }

    const cleaned = value.trim();
    return cleaned === "" ? "N/A" : cleaned;
  }

  function formatDistance(distanceNm) {
    const distance = toFiniteNumber(distanceNm);
    return distance === null ? "N/A" : `${distance.toFixed(1)} NM`;
  }

  function formatEta(minutes) {
    const etaMinutes = toFiniteNumber(minutes);

    if (etaMinutes === null || etaMinutes < 0) {
      return "N/A";
    }

    if (etaMinutes < 1) {
      return "<1 min";
    }

    const roundedMinutes = Math.round(etaMinutes);

    if (roundedMinutes < 60) {
      return `~${roundedMinutes} min`;
    }

    const hours = Math.floor(roundedMinutes / 60);
    const minutesRemainder = roundedMinutes % 60;

    if (minutesRemainder === 0) {
      return `~${hours} hr`;
    }

    return `~${hours} hr ${minutesRemainder} min`;
  }

  function formatKnots(speedKt) {
    const speed = toFiniteNumber(speedKt);
    return speed === null ? "N/A" : `${Math.round(speed)} kt`;
  }

  function formatAltitude(altitude) {
    const numericAltitude = toFiniteNumber(altitude);

    if (numericAltitude !== null) {
      return `${Math.round(numericAltitude).toLocaleString("en-US")} ft`;
    }

    if (typeof altitude === "string" && altitude.trim() !== "") {
      return altitude.trim();
    }

    return "N/A";
  }

  function formatVerticalSpeed(verticalSpeedFpm) {
    const verticalSpeed = toFiniteNumber(verticalSpeedFpm);

    if (verticalSpeed === null) {
      return "N/A";
    }

    if (verticalSpeed > 0) {
      return `\u2191${Math.round(verticalSpeed)} fpm`;
    }

    if (verticalSpeed < 0) {
      return `\u2193${Math.abs(Math.round(verticalSpeed))} fpm`;
    }

    return "0 fpm";
  }

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

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function hasChromeStorage() {
    return (
      typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.sync &&
      typeof chrome.storage.sync.get === "function" &&
      typeof chrome.storage.sync.set === "function"
    );
  }

  function degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  function radiansToDegrees(radians) {
    return (radians * 180) / Math.PI;
  }

  function normalizeDegrees(degrees) {
    return (degrees + 360) % 360;
  }
})();
