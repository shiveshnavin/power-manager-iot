import express from "express";
import bodyParser from "body-parser";
import { createDeviceManager } from "./iot.js";
import { getStatus, startBatteryCheck, stopBatteryCheck } from "./hardware.js";

const app = express();
app.use(bodyParser.json());

app.use((req, res, next) => {
  let auth = req.headers["authorization"] || "";
  let token = auth.split(" ")[1] || req.query.access_token;
  if (!token || token != process.env.JWT) {
    return res.status(401).send({
      message: "unauthorized",
    });
  }
  next();
});

const deviceMgr = createDeviceManager(process.env.TUYA_DEVICE_ID);

app.get("/api/set-status", (req, res) => {
  let value = req.query.value;
  if (value == undefined || value != 1 || value != 0) {
    return res.status(400).send({
      message: "Missing or Incorrect `value` 1 | 0 in query params",
    });
  }
  deviceMgr
    .setStatus(value)
    .then((r) => {
      res.send({
        message: "Success",
      });
    })
    .catch((e) => {
      res.status(500).send({
        message: e.message,
      });
    });
});

function onToggleAc(value) {
  return deviceMgr
    .setStatus(value)
    .then((response) => {
      console.info("Success setting AC status to", value);
    })
    .catch((e) => {
      console.warn("Error setting AC status", e.message);
    });
}

app.get("/", (req, res) => {
  getStatus().then((status) => {
    res.send(status);
  });
});
function initBatteryCheck(_min, _max, _intervalMs) {
  let min = _min || process.env.BATTERY_KEEP_MIN || 60;
  let max = _max || process.env.BATTERY_KEEP_MAX || 80;
  let intervalMs =
    _intervalMs || process.env.BATTERY_CHECK_INTERVAL_MS || 10000;
  startBatteryCheck(min, max, onToggleAc, intervalMs);
  return {
    message: "Started",
    min,
    max,
    intervalMs,
  };
}
app.get("/api/auto-manager/start", (req, res) => {
  res.send(initBatteryCheck(req.query.min, req.query.max, req.query.interval));
});

app.get("/api/auto-manager/stop", (req, res) => {
  stopBatteryCheck();
  res.send({
    message: "Stopped",
  });
});

const PORT = process.env.PORT || 8801;
app.listen(PORT, () => {
  console.log("Device manager started on port", PORT);
  initBatteryCheck();
});
