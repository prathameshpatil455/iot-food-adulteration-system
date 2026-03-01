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

const SAMPLE_TYPES = {
  milk: { tdsLimit: 600, badResult: "Adulterated" },
  water: { tdsLimit: 500, badResult: "Contaminated" },
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

function updateSensorDisplay(data) {
  const tempVal = formatSensorValue(data.temp);
  const tdsVal = formatSensorValue(data.tds);
  const ntuVal = formatSensorValue(data.ntu);

  const tempEl = document.getElementById(SENSOR_IDS.temp);
  const tdsEl = document.getElementById(SENSOR_IDS.tds);
  const turbidityEl = document.getElementById(SENSOR_IDS.turbidity);

  tempEl.textContent = tempVal != null ? `${tempVal} ${UNITS.temp}` : "--";
  tdsEl.textContent = tdsVal != null ? `${tdsVal} ${UNITS.tds}` : "--";
  turbidityEl.textContent = ntuVal != null ? `${ntuVal} ${UNITS.turbidity}` : "--";

  tempEl.classList.toggle("placeholder", tempVal == null);
  tdsEl.classList.toggle("placeholder", tdsVal == null);
  turbidityEl.classList.toggle("placeholder", ntuVal == null);
}

function computeResult(data) {
  const food = foodSelect.value;
  const config = SAMPLE_TYPES[food];
  if (!config) return { result: "Pure", resultClass: "pure" };

  const tds = data.tds != null ? Number(data.tds) : null;
  const ntu = data.ntu != null ? Number(data.ntu) : null;
  const overTds = tds != null && tds > config.tdsLimit;
  const zeroTurbidity = ntu === 0;

  if (overTds || zeroTurbidity) {
    return { result: config.badResult, resultClass: food === "milk" ? "adulterated" : "contaminated" };
  }
  return { result: "Pure", resultClass: "pure" };
}

function updateResult(data) {
  const { result, resultClass } = computeResult(data);
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
  updateResult(lastSensorData);
});
