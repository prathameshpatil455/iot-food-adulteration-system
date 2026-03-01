const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { SerialPort, ReadlineParser } = require("serialport");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const port = new SerialPort({ path: "COM12", baudRate: 9600 });

port.on("error", (err) => {
  console.error("Serial port error:", err.message);
});

const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

parser.on("data", (data) => {
  try {
    const jsonData = JSON.parse(data);
    io.emit("sensorData", jsonData);
  } catch (err) {
    console.log("Invalid JSON:", data);
  }
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
