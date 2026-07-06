(() => {
  "use strict";

  globalThis.ADSB_ETA_TRACKER_CONFIG = Object.freeze({
    storageKeys: Object.freeze({
      destination: "destination"
    }),
    defaultDestination: Object.freeze({
      name: "Configured Destination",
      latitude: 36.58945221767374,
      longitude: -121.85851779542429
    })
  });
})();
