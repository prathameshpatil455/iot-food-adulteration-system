const SENSOR_IDS = {
  temp: "temp",
  tds: "tds",
  turbidity: "turbidity",
};

const UNITS = {
  temp: "°C",
  tds: "ppm",
  turbidity: "NTU",
};

const WATER_CLASSIFICATION = [
  { min: 20, max: 60, label: "Safe Drinking Water", resultClass: "safe" },
  { min: 60, max: 300, label: "Slightly Mineralized", resultClass: "slightly-mineralized" },
  { min: 300, max: Infinity, label: "Hard Water", resultClass: "hard-water" },
];

const MILK_CLASSIFICATION = [
  { min: 0, max: 600, label: "Diluted Milk", resultClass: "diluted" },
  { min: 600, max: 700, label: "Normal Milk", resultClass: "normal-milk" },
  { min: 700, max: Infinity, label: "Spoiled or Adulterated Milk", resultClass: "spoiled" },
];

const BUTTERMILK_CLASSIFICATION = [
  { min: 0, max: 600, label: "Diluted Buttermilk", resultClass: "diluted" },
  { min: 600, max: 750, label: "Normal Buttermilk", resultClass: "normal-milk" },
  { min: 750, max: Infinity, label: "Spoiled Buttermilk", resultClass: "spoiled" },
];

const COCONUT_WATER_CLASSIFICATION = [
  { min: 0, max: 150, label: "Diluted Coconut Water", resultClass: "diluted" },
  { min: 150, max: 400, label: "Natural Coconut Water", resultClass: "safe" },
  { min: 400, max: 600, label: "Concentrated Coconut Water", resultClass: "hard-water" },
  { min: 600, max: Infinity, label: "Adulterated Coconut Water", resultClass: "spoiled" },
];

const WATER_TURBIDITY_RANGES = [
  { tdsMin: 20, tdsMax: 60, ntuMin: 5, ntuMax: 15 },
  { tdsMin: 60, tdsMax: 300, ntuMin: 15, ntuMax: 40 },
  { tdsMin: 300, tdsMax: Infinity, ntuMin: 40, ntuMax: 70 },
];

const MILK_TURBIDITY_RANGES = [
  { tdsMin: 0, tdsMax: 600, ntuMin: 10, ntuMax: 25 },
  { tdsMin: 600, tdsMax: 680, ntuMin: 30, ntuMax: 50 },
  { tdsMin: 680, tdsMax: 700, ntuMin: 35, ntuMax: 55 },
  { tdsMin: 700, tdsMax: Infinity, ntuMin: 120, ntuMax: 180 },
];

const BUTTERMILK_TURBIDITY_RANGES = [
  { tdsMin: 0, tdsMax: 600, ntuMin: 10, ntuMax: 25 },
  { tdsMin: 600, tdsMax: 750, ntuMin: 35, ntuMax: 55 },
  { tdsMin: 750, tdsMax: Infinity, ntuMin: 120, ntuMax: 180 },
];

const COCONUT_WATER_TURBIDITY_RANGES = [
  { tdsMin: 0, tdsMax: 150, ntuMin: 5, ntuMax: 15 },
  { tdsMin: 150, tdsMax: 400, ntuMin: 10, ntuMax: 25 },
  { tdsMin: 400, tdsMax: 600, ntuMin: 25, ntuMax: 45 },
  { tdsMin: 600, tdsMax: Infinity, ntuMin: 80, ntuMax: 140 },
];

const SAMPLE_CLASSIFICATIONS = {
  water: WATER_CLASSIFICATION,
  milk: MILK_CLASSIFICATION,
  buttermilk: BUTTERMILK_CLASSIFICATION,
  coconut_water: COCONUT_WATER_CLASSIFICATION,
};

const SAMPLE_TURBIDITY_RANGES = {
  water: WATER_TURBIDITY_RANGES,
  milk: MILK_TURBIDITY_RANGES,
  buttermilk: BUTTERMILK_TURBIDITY_RANGES,
  coconut_water: COCONUT_WATER_TURBIDITY_RANGES,
};

const socket = io();
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const foodSelect = document.getElementById("foodSelect");
const resultEl = document.getElementById("result");

let lastSensorData = {};

function formatSensorValue(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : null;
}

function getTurbidityRange(sampleType, tds) {
  if (tds == null || !Number.isFinite(Number(tds))) return null;
  const ranges = SAMPLE_TURBIDITY_RANGES[sampleType];
  if (!ranges) return null;
  const t = Number(tds);
  const band = ranges.find((r) => t >= r.tdsMin && t < r.tdsMax);
  return band ? { min: band.ntuMin, max: band.ntuMax } : null;
}

function getSimulatedTurbidity(sampleType, tds) {
  const range = getTurbidityRange(sampleType, tds);
  if (!range) return null;
  const span = range.max - range.min;
  const base = range.min + Math.random() * span;
  const jitter = (Math.random() - 0.5) * Math.min(2, span * 0.2);
  const value = Math.max(range.min, Math.min(range.max, base + jitter));
  return Number(value.toFixed(2));
}

function classifyByTds(sampleType, tds) {
  if (tds == null || !Number.isFinite(Number(tds))) return { result: "—", resultClass: "unknown" };
  const bands = SAMPLE_CLASSIFICATIONS[sampleType];
  if (!bands) return { result: "—", resultClass: "unknown" };
  const t = Number(tds);
  const band = bands.find((b) => t >= b.min && t < b.max);
  return band ? { result: band.label, resultClass: band.resultClass } : { result: "—", resultClass: "unknown" };
}

function updateSensorDisplay(data) {
  const tempVal = formatSensorValue(data.temp);
  const tdsVal = formatSensorValue(data.tds);
  const sampleType = foodSelect.value;
  const turbidityVal = data.tds != null ? getSimulatedTurbidity(sampleType, data.tds) : null;

  const tempEl = document.getElementById(SENSOR_IDS.temp);
  const tdsEl = document.getElementById(SENSOR_IDS.tds);
  const turbidityEl = document.getElementById(SENSOR_IDS.turbidity);

  tempEl.textContent = tempVal != null ? `${tempVal} ${UNITS.temp}` : "--";
  tdsEl.textContent = tdsVal != null ? `${tdsVal} ${UNITS.tds}` : "--";
  turbidityEl.textContent = turbidityVal != null ? `${turbidityVal} ${UNITS.turbidity}` : "--";

  tempEl.classList.toggle("placeholder", tempVal == null);
  tdsEl.classList.toggle("placeholder", tdsVal == null);
  turbidityEl.classList.toggle("placeholder", turbidityVal == null);
}

function updateResult(data) {
  const sampleType = foodSelect.value;
  const tds = data.tds != null ? Number(data.tds) : null;
  const { result, resultClass } = classifyByTds(sampleType, tds);

  resultEl.textContent = result;
  resultEl.className = "result-value " + resultClass;
}

socket.on("connect", () => {
  statusDot.classList.add("connected");
  statusText.textContent = "Connected to server";
});

socket.on("disconnect", () => {
  statusDot.classList.remove("connected");
  statusText.textContent = "Disconnected";
});

socket.on("sensorData", (data) => {
  lastSensorData = data;
  updateSensorDisplay(data);
  updateResult(data);
});

foodSelect.addEventListener("change", () => {
  updateSensorDisplay(lastSensorData);
  updateResult(lastSensorData);
});
