import { TuyaContext } from "@tuya/tuya-connector-nodejs";
import Dotenv from "dotenv";

Dotenv.config();

const context = new TuyaContext({
  baseUrl: "https://openapi.tuyain.com",
  accessKey: process.env.TUYA_ACCESS_KEY,
  secretKey: process.env.TUYA_SECRET_KEY,
});

export const createDeviceManager = (deviceId) => {
  const device_id = deviceId || process.env.TUYA_DEVICE_ID;
  let devicedetail;
  context.device
    .detail({
      device_id: device_id,
    })
    .then((r) => {
      devicedetail = r;
      if (!r.success) {
        console.warn("Unable to find device " + device_id);
      } else {
        console.log(
          "Device:",
          r.result?.name + " " + r.result?.product_name,
          r.result?.online ? "online" : "offline"
        );
      }
    });

  return {
    async setStatus(newValue) {
      const commands = await context.request({
        path: `/v1.0/iot-03/devices/${device_id}/commands`,
        method: "POST",
        body: {
          commands: [{ code: "switch_1", value: newValue == 1 }],
        },
      });
      if (!commands.success) {
        throw new Error(
          "Error occured while connecting to device. " + commands.msg
        );
      }
      return commands;
    },
  };
};
