import express from "express";
import bodyParser from "body-parser";
import { createDeviceManager } from "./iot.js";
import { getStatus, startBatteryCheck, stopBatteryCheck } from "./hardware.js";

process.on("unhandledRejection", (reason, promise) => {
  console.error(new Date().toLocaleString(), "Unhandled Promise Rejection:", reason.message);
});

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
  if (value == undefined || value != '1' && value != '0') {
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
    const { battery, cpu, network, mem, disk } = status;

    const html = `
    <html>
    <head>
      <title>Status Overview</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          background: #f9f9f9;
          color: #333;
        }
        h1 {
          text-align: center;
          margin-bottom: 30px;
        }
        section {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        .inline-list td {
          border: none;
          padding-left: 5px;
        }
        .inline-list th {
          border: none;
          padding-left: 5px;
          background: none;
          font-weight: normal;
          color: #555;
        }
        .power-controls {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-bottom: 20px;
        }
        .power-btn {
          padding: 15px 40px;
          font-size: 18px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          transition: background-color 0.3s;
        }
        .power-btn.on {
          background-color: #4CAF50;
          color: white;
        }
        .power-btn.on:hover {
          background-color: #45a049;
        }
        .power-btn.off {
          background-color: #f44336;
          color: white;
        }
        .power-btn.off:hover {
          background-color: #da190b;
        }
        .power-btn:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        #status-message {
          text-align: center;
          margin-bottom: 10px;
          padding: 10px;
          border-radius: 4px;
          display: none;
        }
        #status-message.success {
          background-color: #dff0d8;
          color: #3c763d;
          display: block;
        }
        #status-message.error {
          background-color: #f2dede;
          color: #a94442;
          display: block;
        }
        #status-message.processing {
          background-color: #d9edf7;
          color: #31708f;
          display: block;
        }
      </style>
    </head>
    <body>
      <h1>System Status Overview</h1>

      <section>
        <h2>Power Control</h2>
        <div id="status-message"></div>
        <div class="power-controls">
          <button class="power-btn on" onclick="setPower(1)">Turn ON</button>
          <button class="power-btn off" onclick="setPower(0)">Turn OFF</button>
        </div>
      </section>

      <script>
        function getAccessToken() {
          const params = new URLSearchParams(window.location.search);
          return params.get('access_token');
        }

        function setPower(value) {
          const token = getAccessToken();
          const statusEl = document.getElementById('status-message');
          
          if (!token) {
            statusEl.textContent = 'Error: No access token found in URL';
            statusEl.className = 'error';
            return;
          }

          const buttons = document.querySelectorAll('.power-btn');
          buttons.forEach(btn => btn.disabled = true);
          statusEl.textContent = 'Processing...';
          statusEl.className = 'processing';

          fetch('/api/set-status?value=' + value + '&access_token=' + encodeURIComponent(token))
            .then(response => {
              if (!response.ok) {
                return response.json().then(data => {
                  throw new Error(data.message || 'Request failed with status ' + response.status);
                });
              }
              return response.json();
            })
            .then(data => {
              if (data.message === 'Success') {
                statusEl.textContent = 'Power ' + (value === 1 ? 'ON' : 'OFF') + ' command sent successfully!';
                statusEl.className = 'success';
              } else {
                statusEl.textContent = 'Error: ' + (data.message || 'Unknown error');
                statusEl.className = 'error';
              }
            })
            .catch(error => {
              statusEl.textContent = 'Error: ' + error.message;
              statusEl.className = 'error';
            })
            .finally(() => {
              buttons.forEach(btn => btn.disabled = false);
            });
        }
      </script>

      <section>
        <h2>Battery</h2>
        <table>
          <tr><th>Has Battery</th><td>${battery.hasBattery}</td></tr>
          <tr><th>Cycle Count</th><td>${battery.cycleCount}</td></tr>
          <tr><th>Charging</th><td>${battery.isCharging}</td></tr>
          <tr><th>Designed Capacity</th><td>${battery.designedCapacity} ${battery.capacityUnit}</td></tr>
          <tr><th>Max Capacity</th><td>${battery.maxCapacity} ${battery.capacityUnit}</td></tr>
          <tr><th>Current Capacity</th><td>${battery.currentCapacity} ${battery.capacityUnit}</td></tr>
          <tr><th>Voltage</th><td>${battery.voltage} V</td></tr>
          <tr><th>Percent</th><td>${battery.percent}%</td></tr>
          <tr><th>Time Remaining</th><td>${battery.timeRemaining} minutes</td></tr>
          <tr><th>AC Connected</th><td>${battery.acConnected}</td></tr>
          <tr><th>Type</th><td>${battery.type}</td></tr>
          <tr><th>Model</th><td>${battery.model}</td></tr>
          <tr><th>Manufacturer</th><td>${battery.manufacturer}</td></tr>
          <tr><th>Serial</th><td>${battery.serial}</td></tr>
        </table>
      </section>

      <section>
        <h2>CPU</h2>
        <table>
          <tr><th>Speed Min (GHz)</th><td>${cpu.speed.min}</td></tr>
          <tr><th>Speed Max (GHz)</th><td>${cpu.speed.max}</td></tr>
          <tr><th>Speed Avg (GHz)</th><td>${cpu.speed.avg}</td></tr>
          <tr><th>Speed per Core (GHz)</th>
            <td>${cpu.speed.cores.join(', ')}</td>
          </tr>
          <tr><th>Main Temp (°C)</th><td>${cpu.temp.main}</td></tr>
          <tr><th>Max Temp (°C)</th><td>${cpu.temp.max}</td></tr>
          <tr><th>Core Temps (°C)</th>
            <td>${cpu.temp.cores.join(', ')}</td>
          </tr>
          <tr><th>Socket Temps (°C)</th>
            <td>${cpu.temp.socket ? cpu.temp.socket.join(', ') : 'N/A'}</td>
          </tr>
          <tr><th>Chipset Temp (°C)</th><td>${cpu.temp.chipset ?? 'N/A'}</td></tr>
        </table>
      </section>

      <section>
        <h2>Network Interfaces</h2>
        ${network.map(iface => `
          <h3>${iface.iface} (${iface.operstate})</h3>
          <table>
            <tr><th>RX Bytes</th><td>${iface.rx_bytes}</td></tr>
            <tr><th>RX Dropped</th><td>${iface.rx_dropped}</td></tr>
            <tr><th>RX Errors</th><td>${iface.rx_errors}</td></tr>
            <tr><th>TX Bytes</th><td>${iface.tx_bytes}</td></tr>
            <tr><th>TX Dropped</th><td>${iface.tx_dropped}</td></tr>
            <tr><th>TX Errors</th><td>${iface.tx_errors}</td></tr>
          </table>
        `).join('')}
      </section>

      <section>
        <h2>Memory</h2>
        <table>
          <tr><th>Total</th><td>${(mem.total / 1024 / 1024).toFixed(2)} MB</td></tr>
          <tr><th>Free</th><td>${(mem.free / 1024 / 1024).toFixed(2)} MB</td></tr>
          <tr><th>Used</th><td>${(mem.used / 1024 / 1024).toFixed(2)} MB</td></tr>
          <tr><th>Active</th><td>${(mem.active / 1024 / 1024).toFixed(2)} MB</td></tr>
          <tr><th>Available</th><td>${(mem.available / 1024 / 1024).toFixed(2)} MB</td></tr>
          <tr><th>Buffers</th><td>${(mem.buffers / 1024 / 1024).toFixed(2)} MB</td></tr>
          <tr><th>Cached</th><td>${(mem.cached / 1024 / 1024).toFixed(2)} MB</td></tr>
          <tr><th>Slab</th><td>${(mem.slab / 1024 / 1024).toFixed(2)} MB</td></tr>
          <tr><th>BuffCache</th><td>${(mem.buffcache / 1024 / 1024).toFixed(2)} MB</td></tr>
          <tr><th>Swap Total</th><td>${(mem.swaptotal / 1024 / 1024).toFixed(2)} MB</td></tr>
          <tr><th>Swap Used</th><td>${(mem.swapused / 1024 / 1024).toFixed(2)} MB</td></tr>
          <tr><th>Swap Free</th><td>${(mem.swapfree / 1024 / 1024).toFixed(2)} MB</td></tr>
          <tr><th>Writeback</th><td>${mem.writeback}</td></tr>
          <tr><th>Dirty</th><td>${mem.dirty}</td></tr>
        </table>
      </section>

      <section>
        <h2>Disk IO</h2>
        <table>
          <tr><th>Read IO</th><td>${disk.rIO}</td></tr>
          <tr><th>Write IO</th><td>${disk.wIO}</td></tr>
          <tr><th>Total IO</th><td>${disk.tIO}</td></tr>
          <tr><th>Read Wait Time (ms)</th><td>${disk.rWaitTime}</td></tr>
          <tr><th>Write Wait Time (ms)</th><td>${disk.wWaitTime}</td></tr>
          <tr><th>Total Wait Time (ms)</th><td>${disk.tWaitTime}</td></tr>
        </table>
      </section>

    </body>
    </html>
    `;

    res.send(html);
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


app.get("/api", (req, res) => {
  getStatus().then((status) => {
    res.send(status);
  });
});

const PORT = process.env.PORT || 8801;
app.listen(PORT, () => {
  console.log("Device manager started on port", PORT);
  initBatteryCheck();
});
