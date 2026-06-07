(function initCore(root) {
  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatDate(date) {
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join("-");
  }

  function formatTime(date) {
    return [
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds())
    ].join(":");
  }

  function createId(now) {
    return `record-${now.getTime()}-${Math.random().toString(16).slice(2)}`;
  }

  function createIncidentRecord({ now = new Date(), coords = null }) {
    const hasLocation = Boolean(coords);

    return {
      id: createId(now),
      savedAt: now.toISOString(),
      displayDate: formatDate(now),
      displayTime: formatTime(now),
      latitude: hasLocation ? coords.latitude : null,
      longitude: hasLocation ? coords.longitude : null,
      accuracy: hasLocation ? coords.accuracy : null,
      locationStatus: hasLocation ? "available" : "time-only",
      plate: "",
      note: "",
      updatedAt: null
    };
  }

  function updateRecordDetails(records, id, details) {
    return records.map((record) => {
      if (record.id !== id) return record;

      return {
        ...record,
        plate: (details.plate || "").trim(),
        note: (details.note || "").trim(),
        updatedAt: new Date().toISOString()
      };
    });
  }

  function deleteRecord(records, id) {
    return records.filter((record) => record.id !== id);
  }

  function parseStoredRecords(value) {
    if (!value) return [];

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function trimRecords(records, limit = 50) {
    return [...records]
      .sort((left, right) => new Date(right.savedAt) - new Date(left.savedAt))
      .slice(0, limit);
  }

  function longitudeToTileX(longitude, zoom) {
    const scale = 2 ** zoom;
    return Math.floor(((longitude + 180) / 360) * scale);
  }

  function latitudeToTileY(latitude, zoom) {
    const scale = 2 ** zoom;
    const radians = latitude * Math.PI / 180;
    const value = (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2;
    return Math.floor(value * scale);
  }

  function createOsmTileGrid({ latitude, longitude, zoom = 16, radius = 1 }) {
    const maxIndex = (2 ** zoom) - 1;
    const centerX = Math.max(0, Math.min(maxIndex, longitudeToTileX(longitude, zoom)));
    const centerY = Math.max(0, Math.min(maxIndex, latitudeToTileY(latitude, zoom)));
    const tiles = [];

    for (let y = centerY - radius; y <= centerY + radius; y += 1) {
      for (let x = centerX - radius; x <= centerX + radius; x += 1) {
        const wrappedX = ((x % (maxIndex + 1)) + (maxIndex + 1)) % (maxIndex + 1);
        const clampedY = Math.max(0, Math.min(maxIndex, y));
        tiles.push({
          x: wrappedX,
          y: clampedY,
          zoom,
          url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${clampedY}.png`
        });
      }
    }

    return { centerX, centerY, zoom, tiles };
  }

  function createOsmEmbedUrl({ latitude, longitude }) {
    const delta = 0.0035;
    const left = longitude - delta;
    const right = longitude + delta;
    const top = latitude + delta;
    const bottom = latitude - delta;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${left},${bottom},${right},${top}&layer=mapnik&marker=${latitude},${longitude}`;
  }

  const api = {
    formatDate,
    formatTime,
    createIncidentRecord,
    updateRecordDetails,
    deleteRecord,
    parseStoredRecords,
    trimRecords,
    createOsmTileGrid,
    createOsmEmbedUrl
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.TrafficReportCore = api;
})(typeof window !== "undefined" ? window : globalThis);
