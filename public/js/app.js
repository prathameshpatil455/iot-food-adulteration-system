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
  { min: 300, max: 500, label: "Hard Water", resultClass: "hard-water" },
  { min: 500, max: Infinity, label: "Contaminated Water", resultClass: "contaminated" },
];

const MILK_CLASSIFICATION = [
  { min: 0, max: 620, label: "Diluted Milk", resultClass: "diluted" },
  { min: 620, max: 700, label: "Normal Milk", resultClass: "normal-milk" },
  { min: 700, max: Infinity, label: "Spoiled or Adulterated Milk", resultClass: "spoiled" },
];

const WATER_TURBIDITY_RANGES = [
  { tdsMin: 20, tdsMax: 60, ntuMin: 5, ntuMax: 15 },
  { tdsMin: 60, tdsMax: 300, ntuMin: 15, ntuMax: 40 },
  { tdsMin: 300, tdsMax: 500, ntuMin: 40, ntuMax: 70 },
  { tdsMin: 500, tdsMax: Infinity, ntuMin: 100, ntuMax: 150 },
];

const MILK_TURBIDITY_RANGES = [
  { tdsMin: 0, tdsMax: 620, ntuMin: 10, ntuMax: 25 },
  { tdsMin: 620, tdsMax: 680, ntuMin: 30, ntuMax: 50 },
  { tdsMin: 680, tdsMax: 700, ntuMin: 35, ntuMax: 55 },
  { tdsMin: 700, tdsMax: Infinity, ntuMin: 120, ntuMax: 180 },
];

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
  const ranges = sampleType === "water" ? WATER_TURBIDITY_RANGES : MILK_TURBIDITY_RANGES;
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
  const t = Number(tds);
  const bands = sampleType === "water" ? WATER_CLASSIFICATION : MILK_CLASSIFICATION;
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
