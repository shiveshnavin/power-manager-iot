import { battery } from "systeminformation";

let interval = undefined;
export function getStatus() {
  return battery()
    .then((status) => ({
      interval: interval != undefined ? "started" : "stopped",
      ...status,
    }))
    .catch((e) => ({
      interval: interval != undefined ? "started" : "stopped",
      message: "Unable to read battery info. " + e.message,
    }));
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
  interval = setInterval(async () => {
    let batteryInfo = await battery();
    console.info("Battery status", batteryInfo.percent);
    if (!batteryInfo.hasBattery && !batteryInfo.acConnected) {
      console.log("Requesting to turn on AC power as no battery present");
      onToggleAc(1);
    } else {
      if (batteryInfo.percent < min && !batteryInfo.acConnected) {
        console.log(
          "Requesting to turn on AC power as  battery percent",
          batteryInfo.percent,
          "is less than",
          min
        );
        onToggleAc(1);
      } else if (batteryInfo.percent >= max && batteryInfo.acConnected) {
        console.log(
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
