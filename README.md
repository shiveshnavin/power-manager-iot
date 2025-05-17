# Power Manager IoT

A NodeJS app to control tuya based switch for keeping your devices powered up based on battery percentage and remote control.

## Features

- Monitors system battery percentage and AC connection status.
- Automatically toggles a Tuya smart plug:
  - Turns ON AC power if battery is below a configurable minimum threshold.
  - Turns OFF AC power if battery is above a configurable maximum threshold.
- HTTP API for:
  - Getting current battery status.
  - Manually controlling the AC power outlet.
  - Starting/stopping the automatic power management.
- Secure API endpoints using JWT authentication.
- Configurable via environment variables.

## Setup

Ever thought of always keeping your laptop on AC power does to your battery ? Well, nothing good! This simple app is there for rescue. Just install the dependencies and run the app using pm2, connect your charger via a tuya switch and get the device id by creating a cloud project in tuya.

1. Create a tuya cloud project

https://platform.tuya.com/cloud/

2. Connect your device to get the device id

https://developer.tuya.com/en/docs/iot/device-control-best-practice-nodejs?id=Kaunfr776vomb

3.  Rename `sample.env` to `.env` and Update details in the `.env` file.

## Project Structure

```
.
├── hardware.js         # Handles battery monitoring and AC toggle logic
├── index.js            # Main application: Express server, API endpoints
├── iot.js              # Manages communication with Tuya IoT devices
├── package.json        # Project dependencies and scripts (assuming it exists)
├── sample.env          # Example environment variable configuration
└── README.md           # This file
```

## Prerequisites

- Node.js (v14.x or later recommended)
- npm or yarn
- A Tuya-compatible smart plug device
- Tuya IoT Platform account and API credentials (Access Key, Secret Key)

## Setup and Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd <repository-folder-name>
    ```

2.  **Install dependencies:**
    (Assuming you have a `package.json` file)

    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root of the project by copying `sample.env`:

    ```bash
    cp sample.env .env
    ```

    Then, edit the `.env` file with your specific configurations:

    ```properties
    # Contents from d:\code\node_projects\power-manager-iot\sample.env
    BATTERY_CHECK_INTERVAL_MS=10000
    BATTERY_KEEP_MIN=70
    BATTERY_KEEP_MAX=80
    TUYA_ACCESS_KEY=YOUR_TUYA_ACCESS_KEY
    TUYA_SECRET_KEY=YOUR_TUYA_SECRET_KEY
    TUYA_DEVICE_ID=YOUR_TUYA_DEVICE_ID
    JWT=YOUR_SECRET_JWT_TOKEN
    # PORT=8801 (Optional: The application defaults to 8801 if PORT is not set in .env)
    ```

    **Environment Variables Explained:**

    - `BATTERY_CHECK_INTERVAL_MS`: How often to check the battery status (in milliseconds). Default used in code: `10000`.
    - `BATTERY_KEEP_MIN`: If the battery percentage drops below this value and AC is not connected, the AC power will be turned ON. `sample.env` suggests `70`. If not set, `index.js` defaults to `60`.
    - `BATTERY_KEEP_MAX`: If the battery percentage goes above this value and AC is connected, the AC power will be turned OFF. `sample.env` suggests `80`. If not set, `index.js` defaults to `80`.
    - `TUYA_ACCESS_KEY`: Your Tuya IoT Platform Access Key.
    - `TUYA_SECRET_KEY`: Your Tuya IoT Platform Secret Key.
    - `TUYA_DEVICE_ID`: The ID of your Tuya smart plug device.
    - `JWT`: A secret token used for authenticating API requests. Choose a strong, random string.
    - `PORT`: The port on which the application server will run. Default: `8801`.

## Running the Application

Start the application using (assuming `start` script in `package.json` points to `node index.js`):

```bash
npm start
# or directly
# node index.js
```

You should see log messages indicating the server has started and device status:

```
Device manager started on port 8801
Device: [Device Name] [Product Name] [online/offline]
Starting battery check every [intervalMs] max=[max_value] min=[min_value]
```

## API Endpoints

All API endpoints under `/api/*` require authentication. Authentication can be provided either via an `Authorization` header or an `access_token` query parameter.

**Authentication Methods:**

1.  **Header:**
    `Authorization: Bearer <YOUR_JWT_TOKEN>`
2.  **Query Parameter:**
    `?access_token=<YOUR_JWT_TOKEN>`

---

### 1. Get Status

Returns the current battery status and the status of the automatic battery check interval.

- **URL:** `/`
- **Method:** `GET`
- **Auth Required:** No
- **Success Response (200 OK):**
  ```json
  {
    "interval": "started", // or "stopped"
    "hasBattery": true,
    "isCharging": false,
    "voltage": 12.3,
    "percent": 75,
    "acConnected": false
    // ... other battery info from systeminformation
  }
  ```
  Or if battery info cannot be read:
  ```json
  {
    "interval": "started", // or "stopped"
    "message": "Unable to read battery info. <error_message>"
  }
  ```

---

### 2. Manually Set AC Power Status

Manually turns the AC power outlet ON or OFF.

- **URL:** `/api/set-status`
- **Method:** `GET`
- **Auth Required:** Yes
- **Query Parameters:**
  - `value` (required): `1` to turn ON, `0` to turn OFF.
- **Success Response (200 OK):**
  ```json
  {
    "message": "Success"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: If `value` is missing or not `0` or `1`.
  ```json
  {
    "message": "Missing or Incorrect `value` 1 | 0 in query params"
  }
  ```
  - `401 Unauthorized`: If authentication fails.
  ```json
  {
    "message": "unauthorized"
  }
  ```
  - `500 Internal Server Error`: If an error occurs while communicating with the Tuya device.
  ```json
  {
    "message": "Error occured while connecting to device. <error_details>"
  }
  ```
- **Example:**
  `GET /api/set-status?value=1&access_token=<YOUR_JWT_TOKEN>`

---

### 3. Start Automatic Power Management

Starts the automatic battery checking and AC power toggling.

- **URL:** `/api/auto-manager/start`
- **Method:** `GET`
- **Auth Required:** Yes
- **Success Response (200 OK):**
  ```json
  {
    "message": "Started",
    "min": "70", // or the configured/default min value
    "max": "80", // or the configured/default max value
    "intervalMs": "10000" // or the configured/default interval
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`.

---

### 4. Stop Automatic Power Management

Stops the automatic battery checking. The AC power outlet will remain in its current state.

- **URL:** `/api/auto-manager/stop`
- **Method:** `GET`
- **Auth Required:** Yes
- **Success Response (200 OK):**
  ```json
  {
    "message": "Stopped"
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`.

---

## How It Works

1.  **Initialization (`index.js`):**

    - The application starts an Express server.
    - It initializes a connection to your Tuya device using `iot.js`.
    - By default, or via an API call, it starts the automatic battery check (`hardware.js`) using parameters from environment variables or defaults.

2.  **Battery Monitoring (`hardware.js`):**

    - The `startBatteryCheck` function sets up a `setInterval` to periodically fetch battery information using the `systeminformation` library.
    - It compares the current battery percentage (`batteryInfo.percent`) and AC connection status (`batteryInfo.acConnected`) against the configured `min` and `max` thresholds.

3.  **Automatic AC Control Logic (`hardware.js`):**

    - **If no battery is detected and AC is not connected:** It requests to turn ON the AC power.
    - **If battery percentage < `min` AND AC is NOT connected:** It requests to turn ON the AC power.
    - **If battery percentage >= `max` AND AC IS connected:** It requests to turn OFF the AC power.
    - These requests are made by calling the `onToggleAc` callback function (defined in `index.js`).

4.  **Tuya Device Interaction (`iot.js` via `onToggleAc` in `index.js`):**
    - The `onToggleAc` function in `index.js` receives the desired state (1 for ON, 0 for OFF).
    - It uses the `deviceMgr.setStatus()` method (from `iot.js`) to send a command to the configured Tuya device (`TUYA_DEVICE_ID`) to change its `switch_1` state.

## Key Dependencies

- Express.js: Web framework for Node.js.
- body-parser: Node.js body parsing middleware.
- systeminformation: System hardware/software information library (used for battery status).
- @tuya/tuya-connector-nodejs: SDK for Tuya Open API.
- dotenv: Loads environment variables from a `.env` file.

## Potential Improvements & Notes

- **Error Handling in `iot.js`:** The `createDeviceManager` function in `iot.js` fetches device details using `context.device.detail().then(...)`. Consider adding a `.catch(...)` to this promise chain to handle potential errors during device detail fetching.
- **Input Validation in `/api/set-status` (`index.js`):** The validation logic for the `value` query parameter (`if (value == undefined || value != 1 || value != 0)`) is currently flawed and will incorrectly reject valid inputs (`0` or `1`). It should be corrected (e.g., `if (value === undefined || (value !== '0' && value !== '1'))`).
- **`clearInterval()` in `hardware.js`:** In `startBatteryCheck`, when an existing interval is cleared, `clearInterval()` is called without an argument. It should be `clearInterval(interval);`.
- **Default Values Consistency:** The default value for `BATTERY_KEEP_MIN` is `60` in `index.js` if the environment variable is not set, while `sample.env` suggests `70`. Ensure this is the intended behavior or align them. `BATTERY_KEEP_MAX` and `BATTERY_CHECK_INTERVAL_MS` have consistent defaults/suggestions.
