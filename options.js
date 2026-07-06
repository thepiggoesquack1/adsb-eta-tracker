(() => {
  "use strict";

  const config = globalThis.ADSB_ETA_TRACKER_CONFIG;
  const destinationKey = config.storageKeys.destination;
  const defaultDestination = config.defaultDestination;

  const form = document.getElementById("destination-form");
  const nameInput = document.getElementById("destination-name");
  const latitudeInput = document.getElementById("destination-latitude");
  const longitudeInput = document.getElementById("destination-longitude");
  const resetButton = document.getElementById("reset-button");
  const message = document.getElementById("form-message");

  loadDestination();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveDestination(readFormDestination());
  });

  resetButton.addEventListener("click", () => {
    populateForm(defaultDestination);
    saveDestination(defaultDestination, "Default destination restored.");
  });

  function loadDestination() {
    chrome.storage.sync.get({ [destinationKey]: defaultDestination }, (items) => {
      if (chrome.runtime.lastError) {
        showMessage(chrome.runtime.lastError.message, "error");
        populateForm(defaultDestination);
        return;
      }

      populateForm(normalizeDestination(items[destinationKey]) || defaultDestination);
    });
  }

  function readFormDestination() {
    return {
      name: nameInput.value,
      latitude: latitudeInput.value,
      longitude: longitudeInput.value
    };
  }

  function saveDestination(candidate, successMessage = "Destination saved.") {
    const destination = normalizeDestination(candidate);

    if (!destination) {
      showMessage("Enter a valid latitude from -90 to 90 and longitude from -180 to 180.", "error");
      return;
    }

    chrome.storage.sync.set({ [destinationKey]: destination }, () => {
      if (chrome.runtime.lastError) {
        showMessage(chrome.runtime.lastError.message, "error");
        return;
      }

      populateForm(destination);
      showMessage(successMessage, "success");
    });
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
      name: name || defaultDestination.name,
      latitude,
      longitude
    };
  }

  function populateForm(destination) {
    nameInput.value = destination.name;
    latitudeInput.value = String(destination.latitude);
    longitudeInput.value = String(destination.longitude);
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

  function showMessage(text, status) {
    message.textContent = text;
    message.className = `form-message ${status}`;
  }
})();
