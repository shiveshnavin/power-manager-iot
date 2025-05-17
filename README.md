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

   - https://platform.tuya.com/cloud/

2. Connect your device to get the device id

   - https://developer.tuya.com/en/docs/iot/device-control-best-practice-nodejs?id=Kaunfr776vomb

3. Rename `sample.env` to `.env` and Update details in the `.env` file.

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
    git clone https://github.com/shiveshnavin/power-manager-iot
    cd power-manager-iot
    ```

2.  **Install dependencies:**

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

    - `BATTERY_KEEP_MIN`: If the battery percentage drops below this value and AC is not connected, the AC power will be turned ON.
    - `BATTERY_KEEP_MAX`: If the battery percentage goes above this value and AC is connected, the AC power will be turned OFF.
    - `TUYA_ACCESS_KEY`: Your Tuya IoT Platform Access ID/Client ID.
    - `TUYA_SECRET_KEY`: Your Tuya IoT Platform Access Secret/Client Secret.
    - `TUYA_DEVICE_ID`: The Device ID of your Tuya smart plug device (from devices section).
    - `JWT`: A secret token used for authenticating API requests. Choose a strong, random string.
    - `PORT`: The port on which the application server will run. Default: `8801`.

## Running the Application

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

All API endpoints under `/*` require authentication. Authentication can be provided either via an `Authorization` header or an `access_token` query parameter.

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
- **Auth Required:** YES
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
