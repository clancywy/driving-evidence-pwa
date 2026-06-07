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

  function isInsideMainlandChina({ latitude, longitude }) {
    return longitude >= 72.004
      && longitude <= 137.8347
      && latitude >= 0.8293
      && latitude <= 55.8271;
  }

  function transformChinaLatitude(x, y) {
    let result = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    result += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
    result += (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3;
    result += (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3;
    return result;
  }

  function transformChinaLongitude(x, y) {
    let result = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    result += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
    result += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3;
    result += (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3;
    return result;
  }

  function wgs84ToGcj02({ latitude, longitude }) {
    const earthAxis = 6378245;
    const eccentricity = 0.006693421622965943;
    let dLat = transformChinaLatitude(longitude - 105, latitude - 35);
    let dLon = transformChinaLongitude(longitude - 105, latitude - 35);
    const radLat = latitude / 180 * Math.PI;
    let magic = Math.sin(radLat);
    magic = 1 - eccentricity * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = dLat * 180 / ((earthAxis * (1 - eccentricity)) / (magic * sqrtMagic) * Math.PI);
    dLon = dLon * 180 / (earthAxis / sqrtMagic * Math.cos(radLat) * Math.PI);

    return {
      latitude: latitude + dLat,
      longitude: longitude + dLon
    };
  }

  function gcj02ToWgs84(coords) {
    const converted = wgs84ToGcj02(coords);
    return {
      latitude: coords.latitude * 2 - converted.latitude,
      longitude: coords.longitude * 2 - converted.longitude
    };
  }

  function getOsmDisplayCoords(coords) {
    if (!coords) return null;

    if (!isInsideMainlandChina(coords)) {
      return {
        ...coords,
        corrected: false,
        coordinateSystem: "raw"
      };
    }

    const corrected = gcj02ToWgs84(coords);
    return {
      ...coords,
      latitude: Math.round(corrected.latitude * 1000000) / 1000000,
      longitude: Math.round(corrected.longitude * 1000000) / 1000000,
      corrected: true,
      coordinateSystem: "wgs84-from-gcj02"
    };
  }

  const api = {
    formatDate,
    formatTime,
    createIncidentRecord,
    updateRecordDetails,
    parseStoredRecords,
    trimRecords,
    createOsmTileGrid,
    getOsmDisplayCoords
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.TrafficReportCore = api;
})(typeof window !== "undefined" ? window : globalThis);
