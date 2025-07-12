import { battery, disksIO, mem, networkStats, cpuTemperature, cpuCurrentSpeed } from "systeminformation";
import fs from 'fs'
import child_process from 'child_process'
import path from "path";

let interval = undefined;
let ic = 0;
export async function getStatus() {
  let status = {
    interval: interval != undefined ? "started" : "stopped",
    battery: await battery(),
    cpu: {
      speed: await cpuCurrentSpeed(),
      temp: await cpuTemperature(),
    },
    network: await networkStats(),
    mem: await mem(),
    disk: await disksIO()
  }
  return status
}

export function startBatteryCheck(
  min,
  max,
  onToggleAc,
  intervalMs = process.env.BATTERY_CHECK_INTERVAL_MS || 10000
) {
  if (interval) {
    clearInterval();
  }
  let sentCriticalAlert = false;
  console.info(
    "Starting battery check every",
    intervalMs,
    "max=",
    max,
    "min=",
    min
  );
  interval = setInterval(async () => {
    let batteryInfo = await battery();
    if (ic++ % 12 == 0)
      console.info(
        new Date().toLocaleString(),
        "Battery status",
        batteryInfo.percent,
        batteryInfo.acConnected ? 'charging' : 'on-battery'
      );
    if (batteryInfo.percent < (process.env.BATTERY_CRITICAL || 20)) {
      if (fs.existsSync('notify.sh') && !sentCriticalAlert) {
        sentCriticalAlert = true
        child_process.exec('sh ./notify.sh', [batteryInfo.percent.toString()], (err, stdout, stderr) => {
          if (err) {
            console.error(new Date().toLocaleString(), 'Error executing Send critical battery alert:', err);
          } else {
            console.info(new Date().toLocaleString(), 'Sent critical battery alert:', stdout);
          }
        });
      }
    }
    else {
      sentCriticalAlert = false
    }
    if (!batteryInfo.hasBattery && !batteryInfo.acConnected) {
      console.log(
        new Date().toLocaleString(),
        "Requesting to turn on AC power as no battery present"
      );
      onToggleAc(1);
    } else {
      if (batteryInfo.percent < min && !batteryInfo.acConnected) {
        console.log(
          new Date().toLocaleString(),
          "Requesting to turn on AC power as  battery percent",
          batteryInfo.percent,
          "is less than",
          min
        );
        onToggleAc(1);
      } else if (batteryInfo.percent >= max && batteryInfo.acConnected) {
        console.log(
          new Date().toLocaleString(),
          "Requesting to turn off AC power as  battery percent",
          batteryInfo.percent,
          "is more than",
          max
        );
        onToggleAc(0);
      }
    }
  }, intervalMs);
}

export function stopBatteryCheck() {
  clearInterval(interval);
  interval = undefined;
}
