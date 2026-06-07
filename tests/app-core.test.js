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

test("deleteRecord removes only the selected record", () => {
  const records = [
    core.createIncidentRecord({ now: localDate(2026, 6, 7, 9, 42, 5), coords: null }),
    core.createIncidentRecord({ now: localDate(2026, 6, 7, 9, 43, 5), coords: null }),
    core.createIncidentRecord({ now: localDate(2026, 6, 7, 9, 44, 5), coords: null })
  ];

  const remaining = core.deleteRecord(records, records[1].id);

  assert.equal(remaining.length, 2);
  assert.equal(remaining[0].id, records[0].id);
  assert.equal(remaining[1].id, records[2].id);
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

test("createOsmEmbedUrl builds an embeddable map centered on coordinates", () => {
  const url = core.createOsmEmbedUrl({
    latitude: 12.345678,
    longitude: 98.765432
  });

  assert.match(url, /^https:\/\/www\.openstreetmap\.org\/export\/embed\.html\?/);
  assert.match(url, /marker=12\.345678,98\.765432/);
  assert.match(url, /layer=mapnik/);
});
