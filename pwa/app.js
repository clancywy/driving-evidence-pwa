(function initApp() {
  const core = window.TrafficReportCore;
  const storageKey = "traffic-report-records-v1";
  const state = {
    currentCoords: null,
    locationState: "waiting",
    records: [],
    activeScreen: "driving"
  };

  const elements = {};

  function byId(id) {
    return document.getElementById(id);
  }

  function cacheElements() {
    [
      "screenTitle",
      "drivingTab",
      "processTab",
      "drivingScreen",
      "processScreen",
      "currentDate",
      "currentTime",
      "gpsStatus",
      "gpsDetail",
      "currentMap",
      "currentMapFrame",
      "currentTileMap",
      "currentMapPlaceholder",
      "quickSaveButton",
      "lastSavedText",
      "recordSummary",
      "emptyState",
      "recordList"
    ].forEach((id) => {
      elements[id] = byId(id);
    });
  }

  function loadRecords() {
    const saved = safeGetItem(storageKey);
    state.records = core.trimRecords(core.parseStoredRecords(saved));
  }

  function safeGetItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSetItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function persistRecords() {
    return safeSetItem(storageKey, JSON.stringify(state.records));
  }

  function updateClock() {
    const now = new Date();
    elements.currentDate.textContent = core.formatDate(now);
    elements.currentTime.textContent = core.formatTime(now);
    elements.currentTime.dateTime = now.toISOString();
  }

  function setScreen(screen) {
    state.activeScreen = screen;
    const isDriving = screen === "driving";

    elements.screenTitle.textContent = isDriving ? "行驶中" : "处理记录";
    elements.drivingScreen.classList.toggle("is-active", isDriving);
    elements.processScreen.classList.toggle("is-active", !isDriving);
    elements.drivingTab.classList.toggle("is-active", isDriving);
    elements.processTab.classList.toggle("is-active", !isDriving);
    elements.drivingTab.setAttribute("aria-selected", String(isDriving));
    elements.processTab.setAttribute("aria-selected", String(!isDriving));

    if (!isDriving) {
      renderRecords();
    }
  }

  function setLocationStatus(status, detail) {
    state.locationState = status;
    elements.gpsStatus.className = "status-pill";

    if (status === "available") {
      elements.gpsStatus.textContent = "已定位";
      elements.gpsStatus.classList.add("status-ready");
    } else if (status === "waiting") {
      elements.gpsStatus.textContent = "定位中";
      elements.gpsStatus.classList.add("status-waiting");
    } else {
      elements.gpsStatus.textContent = "仅时间";
      elements.gpsStatus.classList.add("status-warning");
    }

    elements.gpsDetail.textContent = detail;
  }

  function startLocationWatch() {
    if (!("geolocation" in navigator)) {
      setLocationStatus("time-only", "当前浏览器不支持定位");
      renderCurrentMap();
      return;
    }

    setLocationStatus("waiting", "正在请求定位权限");
    navigator.geolocation.watchPosition(
      (position) => {
        state.currentCoords = {
          latitude: roundCoord(position.coords.latitude),
          longitude: roundCoord(position.coords.longitude),
          accuracy: Math.round(position.coords.accuracy)
        };
        setLocationStatus("available", getLocationDetailText(state.currentCoords));
        renderCurrentMap();
      },
      (error) => {
        const detail = error.code === error.PERMISSION_DENIED
          ? "定位未授权"
          : "定位暂时不可用";
        setLocationStatus("time-only", detail);
        renderCurrentMap();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  }

  function roundCoord(value) {
    return Math.round(value * 1000000) / 1000000;
  }

  function createAppleMapsUrl(record) {
    return `https://maps.apple.com/?ll=${record.latitude},${record.longitude}&q=${encodeURIComponent("保存位置")}`;
  }

  function getLocationDetailText(coords) {
    return `精度约 ${coords.accuracy} 米`;
  }

  function renderCurrentMap() {
    if (!state.currentCoords) {
      elements.currentMap.classList.remove("has-map");
      elements.currentMapFrame.removeAttribute("src");
      elements.currentTileMap.textContent = "";
      elements.currentMapPlaceholder.textContent = state.locationState === "waiting"
        ? "等待定位"
        : "仅记录时间";
      return;
    }

    elements.currentMap.classList.add("has-map");
    renderEmbedMap(elements.currentMapFrame, state.currentCoords);
    renderTileMap(elements.currentTileMap, state.currentCoords, "当前位置");
  }

  function handleQuickSave() {
    const record = core.createIncidentRecord({
      now: new Date(),
      coords: state.currentCoords
    });

    state.records = core.trimRecords([record, ...state.records]);
    const saved = persistRecords();
    elements.lastSavedText.textContent = saved
      ? `${record.displayTime} 已保存`
      : `${record.displayTime} 未能写入`;

    if (navigator.vibrate) {
      navigator.vibrate(25);
    }

    renderRecords();
  }

  function renderRecords() {
    elements.recordList.textContent = "";
    elements.recordSummary.textContent = `${state.records.length} 条`;
    elements.emptyState.hidden = state.records.length > 0;

    state.records.forEach((record) => {
      elements.recordList.appendChild(createRecordCard(record));
    });
  }

  function createRecordCard(record) {
    const card = document.createElement("article");
    card.className = "record-card";

    const head = document.createElement("div");
    head.className = "record-head";

    const time = document.createElement("div");
    time.className = "record-time";
    const strong = document.createElement("strong");
    strong.textContent = record.displayTime;
    const date = document.createElement("span");
    date.textContent = record.displayDate;
    time.append(strong, date);

    const pill = document.createElement("span");
    pill.className = record.plate || record.note
      ? "status-pill status-ready"
      : "status-pill status-warning";
    pill.textContent = record.plate || record.note ? "已补充" : "待处理";

    head.append(time, pill);
    card.appendChild(head);
    card.appendChild(createRecordMap(record));
    card.appendChild(createDetailForm(record));
    return card;
  }

  function createRecordMap(record) {
    const holder = document.createElement("div");

    if (record.latitude === null || record.longitude === null) {
      holder.className = "mini-map mini-map-empty";
      holder.textContent = "仅时间记录";
      return holder;
    }

    holder.className = "mini-map";
    const iframe = document.createElement("iframe");
    iframe.title = "保存位置地图";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    renderEmbedMap(iframe, record);

    const tileMap = document.createElement("div");
    tileMap.className = "tile-map";
    tileMap.setAttribute("aria-label", "保存位置地图");
    renderTileMap(tileMap, record, "保存位置");

    const link = document.createElement("a");
    link.className = "map-link";
    link.href = createAppleMapsUrl(record);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "在地图中打开";

    holder.append(tileMap, iframe, link);
    return holder;
  }

  function renderEmbedMap(target, coords) {
    target.src = core.createOsmEmbedUrl(coords);
  }

  function renderTileMap(target, coords, label) {
    target.textContent = "";
    const grid = core.createOsmTileGrid({
      latitude: coords.latitude,
      longitude: coords.longitude,
      zoom: 16
    });

    grid.tiles.forEach((tile) => {
      const image = document.createElement("img");
      image.src = tile.url;
      image.alt = label;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      target.appendChild(image);
    });
  }

  function createDetailForm(record) {
    const group = document.createElement("div");
    group.className = "field-group";

    const plateInput = createField("车牌号", "input", record.plate || "");
    const noteInput = createField("备注", "textarea", record.note || "");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "detail-save";
    button.textContent = "保存补充信息";
    button.addEventListener("click", () => {
      state.records = core.updateRecordDetails(state.records, record.id, {
        plate: plateInput.control.value,
        note: noteInput.control.value
      });
      persistRecords();
      renderRecords();
    });

    group.append(plateInput.row, noteInput.row, button);
    return group;
  }

  function createField(labelText, type, value) {
    const row = document.createElement("label");
    row.className = "field-row";
    const label = document.createElement("span");
    label.textContent = labelText;
    const control = type === "textarea"
      ? document.createElement("textarea")
      : document.createElement("input");
    control.value = value;
    if (type !== "textarea") {
      control.autocapitalize = "characters";
      control.inputMode = "text";
    }
    row.append(label, control);
    return { row, control };
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("./sw.js")
        .then((registration) => registration.update())
        .catch(() => {});
    }
  }

  function bindEvents() {
    elements.drivingTab.addEventListener("click", () => setScreen("driving"));
    elements.processTab.addEventListener("click", () => setScreen("process"));
    elements.quickSaveButton.addEventListener("click", handleQuickSave);
  }

  function boot() {
    cacheElements();
    loadRecords();
    bindEvents();
    updateClock();
    renderRecords();
    renderCurrentMap();
    setInterval(updateClock, 1000);
    startLocationWatch();
    registerServiceWorker();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
