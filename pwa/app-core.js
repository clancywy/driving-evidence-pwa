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

  const api = {
    formatDate,
    formatTime,
    createIncidentRecord,
    updateRecordDetails,
    parseStoredRecords,
    trimRecords
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.TrafficReportCore = api;
})(typeof window !== "undefined" ? window : globalThis);
