import dotenv from "dotenv";
import { loginDeviceByIp } from "tp-link-tapo-connect";

dotenv.config();

const { TAPO_EMAIL, TAPO_PASSWORD, TAPO_IP } = process.env;

let cachedDevice = null;

function getConfig() {
    if (!TAPO_EMAIL || !TAPO_PASSWORD || !TAPO_IP) {
        throw new Error("Missing TAPO_EMAIL, TAPO_PASSWORD, or TAPO_IP in environment");
    }

    return { email: TAPO_EMAIL, password: TAPO_PASSWORD, ip: TAPO_IP };
}

async function getDevice() {
    if (!cachedDevice) {
        const { email, password, ip } = getConfig();
        cachedDevice = await loginDeviceByIp(email, password, ip);
    }

    return cachedDevice;
}

export async function getTapoStatus() {
    const device = await getDevice();
    const info = await device.getDeviceInfo();

    return {
        deviceId: info.device_id,
        nickname: info.nickname || info.device_id,
        isOn: !!info.device_on,
        power: info.device_on ? 1 : 0,
        raw: info,
    };
}

export async function setTapoStatus(value) {
    const normalized = Number(value);

    if (normalized !== 0 && normalized !== 1) {
        throw new Error("Missing or Incorrect `value` 1 | 0 in query params");
    }

    const device = await getDevice();

    if (normalized === 1) {
        await device.turnOn();
    } else {
        await device.turnOff();
    }

    return {
        message: "Success",
        value: normalized,
    };
}

export function createTapoManager() {
    return {
        async getStatus() {
            return getTapoStatus();
        },
        async setStatus(value) {
            return setTapoStatus(value);
        },
    };
}