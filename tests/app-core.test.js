const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../pwa/app-core.js");

function localDate(year, month, day, hour, minute, second) {
  return new Date(year, month - 1, day, hour, minute, second);
}

test("createIncidentRecord stores time and coordinates before details", () => {
  const now = localDate(2026, 6, 7, 9, 42, 5);
  const record = core.createIncidentRecord({
    now,
    coords: { latitude: 39.9042, longitude: 116.4074, accuracy: 12 }
  });

  assert.equal(record.displayDate, "2026-06-07");
  assert.equal(record.displayTime, "09:42:05");
  assert.equal(record.latitude, 39.9042);
  assert.equal(record.longitude, 116.4074);
  assert.equal(record.accuracy, 12);
  assert.equal(record.plate, "");
  assert.equal(record.note, "");
  assert.equal(record.locationStatus, "available");
});

test("createIncidentRecord allows time-only records when location is unavailable", () => {
  const now = localDate(2026, 6, 7, 9, 43, 16);
  const record = core.createIncidentRecord({ now, coords: null });

  assert.equal(record.displayDate, "2026-06-07");
  assert.equal(record.displayTime, "09:43:16");
  assert.equal(record.latitude, null);
  assert.equal(record.longitude, null);
  assert.equal(record.accuracy, null);
  assert.equal(record.locationStatus, "time-only");
});

test("updateRecordDetails edits only the selected record", () => {
  const records = [
    core.createIncidentRecord({ now: localDate(2026, 6, 7, 9, 42, 5), coords: null }),
    core.createIncidentRecord({ now: localDate(2026, 6, 7, 9, 43, 5), coords: null })
  ];

  const updated = core.updateRecordDetails(records, records[1].id, {
    plate: "京A12345",
    note: "实线变道"
  });

  assert.equal(updated[0].plate, "");
  assert.equal(updated[0].note, "");
  assert.equal(updated[1].plate, "京A12345");
  assert.equal(updated[1].note, "实线变道");
});

test("parseStoredRecords returns an empty list for invalid storage values", () => {
  assert.deepEqual(core.parseStoredRecords("not json"), []);
  assert.deepEqual(core.parseStoredRecords(null), []);
  assert.deepEqual(core.parseStoredRecords("{}"), []);
});

test("trimRecords keeps the newest records first", () => {
  const records = [
    core.createIncidentRecord({ now: localDate(2026, 6, 7, 9, 40, 0), coords: null }),
    core.createIncidentRecord({ now: localDate(2026, 6, 7, 9, 42, 0), coords: null }),
    core.createIncidentRecord({ now: localDate(2026, 6, 7, 9, 41, 0), coords: null })
  ];

  const trimmed = core.trimRecords(records, 2);

  assert.equal(trimmed.length, 2);
  assert.equal(trimmed[0].displayTime, "09:42:00");
  assert.equal(trimmed[1].displayTime, "09:41:00");
});

test("createOsmTileGrid builds a visible 3 by 3 map tile set", () => {
  const grid = core.createOsmTileGrid({
    latitude: 39.9042,
    longitude: 116.4074,
    zoom: 16
  });

  assert.equal(grid.zoom, 16);
  assert.equal(grid.tiles.length, 9);
  assert.equal(grid.tiles[4].x, grid.centerX);
  assert.equal(grid.tiles[4].y, grid.centerY);
  assert.match(grid.tiles[4].url, /^https:\/\/tile\.openstreetmap\.org\/16\/\d+\/\d+\.png$/);
});

test("getOsmDisplayCoords uses raw coordinates by default", () => {
  const raw = core.getOsmDisplayCoords({
    latitude: 39.9042,
    longitude: 116.4074,
    accuracy: 12
  });

  assert.equal(raw.corrected, false);
  assert.equal(raw.coordinateSystem, "raw");
  assert.equal(raw.latitude, 39.9042);
  assert.equal(raw.longitude, 116.4074);
});

test("getOsmDisplayCoords supports GCJ to WGS display correction", () => {
  const corrected = core.getOsmDisplayCoords({
    latitude: 39.9042,
    longitude: 116.4074,
    accuracy: 12
  }, "gcj-to-wgs");

  assert.equal(corrected.corrected, true);
  assert.equal(corrected.coordinateSystem, "wgs84-from-gcj02");
  assert.equal(corrected.accuracy, 12);
  assert.notEqual(corrected.latitude, 39.9042);
  assert.notEqual(corrected.longitude, 116.4074);
});

test("getOsmDisplayCoords supports WGS to GCJ display correction", () => {
  const corrected = core.getOsmDisplayCoords({
    latitude: 39.9042,
    longitude: 116.4074,
    accuracy: 12
  }, "wgs-to-gcj");

  assert.equal(corrected.corrected, true);
  assert.equal(corrected.coordinateSystem, "gcj02-from-wgs84");
  assert.equal(corrected.accuracy, 12);
  assert.notEqual(corrected.latitude, 39.9042);
  assert.notEqual(corrected.longitude, 116.4074);
});

test("getOsmDisplayCoords does not correct outside mainland China", () => {
  const outsideChina = core.getOsmDisplayCoords({
    latitude: 35.681236,
    longitude: 139.767125,
    accuracy: 8
  }, "gcj-to-wgs");

  assert.equal(outsideChina.corrected, false);
  assert.equal(outsideChina.latitude, 35.681236);
  assert.equal(outsideChina.longitude, 139.767125);
});
