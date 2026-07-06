# ADS-B ETA Tracker

A Chrome Extension that adds a factual ETA panel to ADS-B Exchange when an aircraft is selected.

The extension runs only on:

```text
https://globe.adsbexchange.com/*
```

## What It Shows

- Flight
- Registration
- Aircraft type
- Destination name
- Distance to the configured destination
- ETA
- Ground speed
- Altitude
- Vertical speed

If no aircraft is selected, the panel shows:

```text
Select an aircraft
```

If a selected aircraft is missing a required value, that field shows:

```text
N/A
```

The extension does not infer whether an aircraft is inbound, landing, likely inbound, or assigned to any airport. It only displays calculations based on the selected aircraft's current ADS-B Exchange data and the configured destination coordinates.

## Files

```text
manifest.json    Chrome Manifest V3 configuration
shared-config.js Shared default destination and storage key
content.js       Extension-side UI, ETA logic, distance logic, and rendering
page-reader.js   Page-context reader for ADS-B Exchange globals
styles.css       Floating panel styles
options.html     Destination settings page
options.css      Destination settings page styles
options.js       Destination settings page behavior
README.md        Project documentation
```

## Loading the Extension

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select this project folder.
6. Open `https://globe.adsbexchange.com/`.
7. Select an aircraft on the map.

## Changing the Destination

1. Open `chrome://extensions`.
2. Find **ADS-B ETA Tracker**.
3. Click **Details**.
4. Click **Extension options**.
5. Enter a destination name, latitude, and longitude.
6. Click **Save destination**.

Open ADS-B Exchange tabs update automatically after the destination is saved. A page refresh is not required.

## Why `page-reader.js` Exists

Chrome content scripts run in an isolated JavaScript world. ADS-B Exchange keeps aircraft selection data in page globals such as:

```js
selectedPlanes()
SelPlanes
```

Those globals are available to scripts running in the page context, but not directly to extension content scripts.

To handle that correctly under ADS-B Exchange's CSP, `content.js` injects `page-reader.js` as an external web-accessible script:

```js
script.src = chrome.runtime.getURL("page-reader.js");
```

The extension intentionally does not use inline JavaScript because ADS-B Exchange blocks inline script execution.

## Data Flow

1. `content.js` loads on `https://globe.adsbexchange.com/*`.
2. `content.js` injects `page-reader.js` using `chrome.runtime.getURL`.
3. `page-reader.js` runs in the ADS-B Exchange page context.
4. `page-reader.js` reads `selectedPlanes()` and falls back to `SelPlanes`.
5. `page-reader.js` sends a sanitized aircraft snapshot with `window.postMessage`.
6. `content.js` validates the message source and origin.
7. `content.js` calculates distance, ETA, and formatted values.
8. `content.js` renders the floating panel.

The reader updates once per second.

## Destination Settings

The default destination lives in `shared-config.js`:

```js
defaultDestination: Object.freeze({
  name: "Configured Destination",
  latitude: 36.58945221767374,
  longitude: -121.85851779542429
})
```

User-selected destination settings are saved in `chrome.storage.sync`. ADS-B ETA Tracker calculates to this point exactly, not to a runway, airport boundary, or automatically detected airport.

## Distance Calculation

Distance is calculated with the Haversine formula and displayed in nautical miles.

ADS-B Exchange aircraft positions are read as:

```js
position: [longitude, latitude]
```

## ETA Calculation

ETA is calculated as two segments:

1. Cruise segment: current distance outside 15 NM, flown at current ADS-B ground speed.
2. Approach segment: final 15 NM, flown at an estimated aircraft-specific approach speed.

This avoids the common problem where a fast enroute ground speed makes the final arrival estimate too optimistic.

Formula:

```text
ETA = ((max(distanceNm - 15, 0) / currentGroundSpeedKt)
    + (min(distanceNm, 15) / approachSpeedKt)) * 60
```

If position or required speed values are unavailable, ETA shows `N/A`.

## Adding Aircraft Types

Aircraft approach speeds live in `APPROACH_SPEEDS_KT` in `content.js`.

Example:

```js
const APPROACH_SPEEDS_KT = Object.freeze({
  PC12: 110,
  C680: 135,
  B738: 140
});
```

Add or adjust ICAO aircraft type codes there. Unknown types use category-based fallbacks first, then a speed-based fallback.

## Operational Notes

- The extension makes no network requests.
- The extension stores only the configured destination name, latitude, and longitude.
- The panel is intentionally small and dark to fit ADS-B Exchange's existing interface.
- The displayed ETA is an operational estimate, not an ATC clearance, flight plan prediction, runway assignment, or landing guarantee.
