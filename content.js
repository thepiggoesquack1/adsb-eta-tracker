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
  const TAXI_DEFAULT_MINUTES = 3;
  const TAXI_MIN_MINUTES = 1;
  const TAXI_MAX_MINUTES = 8;
  const TAXI_ASSUMED_SPEED_KT = 12;
  const TAXI_MIN_USEFUL_SPEED_KT = 5;
  const TAXI_MAX_USEFUL_SPEED_KT = 25;

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
    BE40: 125,
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
    BD700: 145,
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

  const ICAO_TYPE_NAMES = Object.freeze({
    C150: "Cessna 150",
    C152: "Cessna 152",
    C162: "Cessna 162 Skycatcher",
    C172: "Cessna 172 Skyhawk",
    C177: "Cessna 177 Cardinal",
    C182: "Cessna 182 Skylane",
    C185: "Cessna 185 Skywagon",
    C206: "Cessna 206 Stationair",
    C207: "Cessna 207 Skywagon",
    C208: "Cessna 208 Caravan",
    C210: "Cessna 210 Centurion",
    C310: "Cessna 310",
    C340: "Cessna 340",
    C414: "Cessna 414 Chancellor",
    C421: "Cessna 421 Golden Eagle",
    C425: "Cessna 425 Conquest I",
    C441: "Cessna 441 Conquest II",
    P28A: "Piper PA-28 Cherokee/Archer",
    PA28: "Piper PA-28 Cherokee/Archer",
    PA32: "Piper PA-32 Cherokee Six/Saratoga",
    PA34: "Piper PA-34 Seneca",
    PA46: "Piper PA-46 Malibu/Meridian",
    P46T: "Piper PA-46 Meridian/M500/M600",
    SR20: "Cirrus SR20",
    SR22: "Cirrus SR22",
    BE33: "Beechcraft Bonanza",
    BE35: "Beechcraft Bonanza",
    BE36: "Beechcraft Bonanza",
    BE55: "Beechcraft Baron",
    BE58: "Beechcraft Baron",
    BE9L: "Beechcraft King Air 90",
    BE20: "Beechcraft King Air 200",
    B200: "Beechcraft King Air 200",
    B300: "Beechcraft King Air 350",
    B350: "Beechcraft King Air 350",
    BE40: "Beechcraft Beechjet",
    E110: "Embraer EMB 110 Bandeirante",
    E120: "Embraer EMB 120 Brasilia",
    PC12: "Pilatus PC-12",
    TBM7: "Daher/Socata TBM 700",
    TBM8: "Daher/Socata TBM 850",
    TBM9: "Daher/Socata TBM 900/910/930/940",
    TBM: "Daher/Socata TBM",
    C500: "Cessna Citation I",
    C501: "Cessna Citation I/SP",
    C510: "Cessna Citation Mustang",
    C525: "Cessna CitationJet",
    C25A: "Cessna Citation CJ2",
    C25B: "Cessna Citation CJ3",
    C25C: "Cessna Citation CJ4",
    C550: "Cessna Citation II",
    C551: "Cessna Citation II/SP",
    C560: "Cessna Citation V/Ultra/Encore",
    C56X: "Cessna Citation Excel/XLS",
    C650: "Cessna Citation III/VI/VII",
    C680: "Cessna Citation Sovereign",
    C68A: "Cessna Citation Latitude",
    C700: "Cessna Citation Longitude",
    C750: "Cessna Citation X",
    LJ23: "Learjet 23",
    LJ24: "Learjet 24",
    LJ25: "Learjet 25",
    LJ31: "Learjet 31",
    LJ35: "Learjet 35",
    LJ40: "Learjet 40",
    LJ45: "Learjet 45",
    LJ55: "Learjet 55",
    LJ60: "Learjet 60",
    LJ70: "Learjet 70",
    LJ75: "Learjet 75",
    GLF2: "Gulfstream II",
    GLF3: "Gulfstream III",
    GLF4: "Gulfstream IV",
    GLF5: "Gulfstream V/G500/G550",
    GLF6: "Gulfstream G650",
    GLF7: "Gulfstream G700",
    G150: "Gulfstream G150",
    G200: "Gulfstream G200",
    G280: "Gulfstream G280",
    FA10: "Dassault Falcon 10",
    FA20: "Dassault Falcon 20",
    FA50: "Dassault Falcon 50",
    F2TH: "Dassault Falcon 2000",
    F2LX: "Dassault Falcon 2000LX",
    FA7X: "Dassault Falcon 7X",
    FA8X: "Dassault Falcon 8X",
    F900: "Dassault Falcon 900",
    F9EX: "Dassault Falcon 900EX",
    CL30: "Bombardier Challenger 300/350",
    CL35: "Bombardier Challenger 350",
    CL60: "Bombardier Challenger 600/601/604/605",
    CL6T: "Bombardier Challenger 650",
    BD700: "Bombardier Global Express",
    GLEX: "Bombardier Global Express",
    GL5T: "Bombardier Global 5000",
    GL6T: "Bombardier Global 6000",
    E50P: "Embraer Phenom 100",
    E55P: "Embraer Phenom 300",
    E135: "Embraer ERJ 135",
    E145: "Embraer ERJ 145",
    E545: "Embraer Legacy 450/Praetor 500",
    E550: "Embraer Legacy 500/Praetor 600",
    E170: "Embraer 170",
    E75L: "Embraer 175",
    E75S: "Embraer 175",
    E190: "Embraer 190",
    E195: "Embraer 195",
    E290: "Embraer E190-E2",
    E295: "Embraer E195-E2",
    B731: "Boeing 737-100",
    B732: "Boeing 737-200",
    B733: "Boeing 737-300",
    B734: "Boeing 737-400",
    B735: "Boeing 737-500",
    B736: "Boeing 737-600",
    B737: "Boeing 737-700",
    B738: "Boeing 737-800",
    B739: "Boeing 737-900",
    B37M: "Boeing 737 MAX 7",
    B38M: "Boeing 737 MAX 8",
    B39M: "Boeing 737 MAX 9",
    A318: "Airbus A318",
    A319: "Airbus A319",
    A320: "Airbus A320",
    A321: "Airbus A321",
    A20N: "Airbus A320neo",
    A21N: "Airbus A321neo",
    CRJ1: "Bombardier CRJ100",
    CRJ2: "Bombardier CRJ200",
    CRJ7: "Bombardier CRJ700",
    CRJ9: "Bombardier CRJ900",
    CRJX: "Bombardier CRJ1000",
    BCS1: "Airbus A220-100",
    BCS3: "Airbus A220-300"
  });

  const rows = [
    { key: "flight", label: "Flight" },
    { key: "registration", label: "Reg" },
    { key: "type", label: "Type" },
    { key: "typeName", label: "Aircraft" },
    { key: "destination", label: "To" },
    { key: "distance", label: "Distance", grouped: true },
    { key: "eta", label: "ETA", grouped: true, emphasized: true },
    { key: "groundSpeed", label: "GS", grouped: true },
    { key: "altitude", label: "Altitude", grouped: true },
    { key: "verticalSpeed", label: "Vertical", grouped: true }
  ];
  const ETA_COLOR_CLASSES = [
    "adsb-eta-eta-neutral",
    "adsb-eta-eta-far",
    "adsb-eta-eta-medium",
    "adsb-eta-eta-close",
    "adsb-eta-eta-imminent"
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
    ui.values.typeName.textContent = getAircraftTypeName(state.plane);
    ui.values.destination.textContent = formatText(state.destination.name);
    ui.values.distance.textContent = formatDistance(metrics.distanceNm);
    ui.values.eta.textContent = formatEta(metrics.etaMinutes);
    setEtaColor(ui.values.eta, metrics.etaMinutes);
    ui.values.groundSpeed.textContent = formatKnots(state.plane.gs);
    ui.values.altitude.textContent = formatAltitude(state.plane.altitude);
    ui.values.verticalSpeed.textContent = formatVerticalSpeed(state.plane.vert_rate);

    ui.message.classList.add("adsb-eta-hidden");
    ui.list.classList.remove("adsb-eta-hidden");
  }

  function calculateAircraftMetrics(plane) {
    const position = readAircraftPosition(plane);
    const onGround = isAircraftOnGround(plane);

    if (!position) {
      return {
        distanceNm: null,
        bearingDeg: null,
        approachSpeedKt: getApproachSpeedKt(plane.icaoType, plane.gs),
        taxiMinutes: null,
        onGround,
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
    const taxiMinutes = calculateTaxiMinutes(distanceNm, getGroundSpeedKt(plane), onGround);
    const etaMinutes = calculateEtaMinutes(distanceNm, plane.gs, approachSpeedKt, onGround, taxiMinutes);

    return {
      distanceNm,
      bearingDeg,
      approachSpeedKt,
      taxiMinutes,
      onGround,
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

  function isAircraftOnGround(plane) {
    if (!plane || typeof plane !== "object") {
      return false;
    }

    if (plane.onGround === true) {
      return true;
    }

    return isGroundAltitude(plane.altitude) || isGroundAltitude(plane.alt_baro);
  }

  function isGroundAltitude(value) {
    return typeof value === "string" && value.trim().toLowerCase() === "ground";
  }

  function getGroundSpeedKt(plane) {
    if (!plane || typeof plane !== "object") {
      return null;
    }

    return toFiniteNumber(plane.gs) ?? toFiniteNumber(plane.speed);
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

  function calculateEtaMinutes(distanceNm, groundSpeedKt, approachSpeedKt, onGround, taxiMinutes) {
    const normalizedDistance = toFiniteNumber(distanceNm);
    const cruiseSpeed = toFiniteNumber(groundSpeedKt);
    const approachSpeed = toFiniteNumber(approachSpeedKt);
    const normalizedTaxiMinutes = toFiniteNumber(taxiMinutes);

    if (normalizedDistance === null || normalizedDistance < 0) {
      return null;
    }

    if (onGround) {
      return normalizedTaxiMinutes;
    }

    if (approachSpeed === null || approachSpeed <= 0 || normalizedTaxiMinutes === null) {
      return null;
    }

    const approachDistanceNm = Math.min(normalizedDistance, APPROACH_SEGMENT_NM);
    const cruiseDistanceNm = Math.max(0, normalizedDistance - APPROACH_SEGMENT_NM);

    if (cruiseDistanceNm > 0 && (cruiseSpeed === null || cruiseSpeed <= 0)) {
      return null;
    }

    const cruiseHours = cruiseDistanceNm > 0 ? cruiseDistanceNm / cruiseSpeed : 0;
    const approachHours = approachDistanceNm / approachSpeed;

    return (cruiseHours + approachHours) * 60 + normalizedTaxiMinutes;
  }

  function calculateTaxiMinutes(distanceNm, groundSpeedKt, onGround) {
    const distance = toFiniteNumber(distanceNm);
    const groundSpeed = toFiniteNumber(groundSpeedKt);

    if (!onGround) {
      return TAXI_DEFAULT_MINUTES;
    }

    if (distance === null || distance < 0) {
      return TAXI_DEFAULT_MINUTES;
    }

    if (distance <= 0.05) {
      return 0;
    }

    const taxiSpeedKt =
      groundSpeed === null || groundSpeed < TAXI_MIN_USEFUL_SPEED_KT
        ? TAXI_ASSUMED_SPEED_KT
        : Math.min(TAXI_MAX_USEFUL_SPEED_KT, Math.max(TAXI_MIN_USEFUL_SPEED_KT, groundSpeed));
    const taxiMinutes = (distance / taxiSpeedKt) * 60;

    return Math.min(TAXI_MAX_MINUTES, Math.max(TAXI_MIN_MINUTES, taxiMinutes));
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

  function getAircraftTypeName(plane) {
    if (!plane || typeof plane !== "object") {
      return "N/A";
    }

    const normalizedType = normalizeAircraftType(plane.icaoType);

    if (normalizedType && ICAO_TYPE_NAMES[normalizedType]) {
      return ICAO_TYPE_NAMES[normalizedType];
    }

    return (
      getPageProvidedTypeName(plane.typeLong) ||
      getPageProvidedTypeName(plane.typeName) ||
      getPageProvidedTypeName(plane.aircraftType) ||
      getPageProvidedTypeName(plane.typeDescription) ||
      getPageProvidedTypeName(plane.desc) ||
      "N/A"
    );
  }

  function getPageProvidedTypeName(value) {
    if (typeof value !== "string") {
      return null;
    }

    const cleaned = value.trim();

    if (cleaned === "" || cleaned.length < 4 || /^[A-Z][0-9][A-Z]$/i.test(cleaned)) {
      return null;
    }

    return cleaned;
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

  function setEtaColor(element, minutes) {
    element.classList.remove(...ETA_COLOR_CLASSES);
    element.classList.add(getEtaColorClass(minutes));
  }

  function getEtaColorClass(minutes) {
    const etaMinutes = toFiniteNumber(minutes);

    if (etaMinutes === null || etaMinutes < 0) {
      return "adsb-eta-eta-neutral";
    }

    if (etaMinutes <= 5) {
      return "adsb-eta-eta-imminent";
    }

    if (etaMinutes <= 10) {
      return "adsb-eta-eta-close";
    }

    if (etaMinutes <= 20) {
      return "adsb-eta-eta-medium";
    }

    return "adsb-eta-eta-far";
  }

  function formatKnots(speedKt) {
    const speed = toFiniteNumber(speedKt);
    return speed === null ? "N/A" : `${Math.round(speed)} kt`;
  }

  function formatAltitude(altitude) {
    if (isGroundAltitude(altitude)) {
      return "Ground";
    }

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
