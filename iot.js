import { TuyaContext } from "@tuya/tuya-connector-nodejs";
import Dotenv from "dotenv";
import TuyAPI from 'tuyapi'

Dotenv.config();

const context = new TuyaContext({
  baseUrl: "https://openapi.tuyain.com",
  accessKey: process.env.TUYA_ACCESS_KEY,
  secretKey: process.env.TUYA_SECRET_KEY,
});



export const createDeviceManager = (deviceId) => {
  const device_id = deviceId || process.env.TUYA_DEVICE_ID;


  const deviceLocal = new TuyAPI({
    id: device_id,
    key: process.env.TUYA_DEVICE_KEY,
    ip: process.env.TUYA_DEVICE_IP,
    version: '3.3'
  });
  deviceLocal.addListener('error', (e) => {
    console.log(new Date().toLocaleString(), 'E: Local tuya device error', e.message)
  })
  deviceLocal.find().then(ldev => {
    return deviceLocal.connect().then(async (lstat) => {
      console.log(new Date().toLocaleString(), 'Local device', lstat ? 'connected' : 'not connected')
      let status = await deviceLocal.get();
      console.log(new Date().toLocaleString(), 'Local device Current status:', status);
    });
  }).catch(e => {
    console.error(new Date().toLocaleString(), 'Local tuya device', device_id, 'connect error on configured ip', process.env.TUYA_DEVICE_IP)
  })
  let devicedetail;
  context.device
    .detail({
      device_id: device_id,
    })
    .then((r) => {
      devicedetail = r;
      if (!r.success) {
        console.log(new Date().toLocaleString(), "W: Unable to find device " + device_id);
      } else {
        console.log(
          new Date().toLocaleString(),
          "Device:",
          r.result?.name + " " + r.result?.product_name,
          r.result?.online ? "online" : "offline"
        );
      }
    });

  return {
    async setStatus(newValue) {

      return deviceLocal.set({ set: newValue == 1 }).then(d => {
        console.log(new Date().toLocaleString(), 'Local device update status success. New Value=', newValue == 1);
      }).catch(async (e) => {
        console.log(new Date().toLocaleString(), 'W: Local device update status error.', e.message);

        const commands = await context.request({
          path: `/v1.0/iot-03/devices/${device_id}/commands`,
          method: "POST",
          body: {
            commands: [{ code: "switch_1", value: newValue == 1 }],
          },
        }).catch(e => {
          console.log(new Date().toLocaleString(), 'E: Error calling tuya api', e.message)
          return {
            success: false,
            msg: 'Error calling tuya api ' + e.message
          }
        });
        if (!commands.success) {
          throw new Error(
            "Error occured while connecting to device. " + commands.msg
          );
        }
        return commands;
      })
    },
  };
};