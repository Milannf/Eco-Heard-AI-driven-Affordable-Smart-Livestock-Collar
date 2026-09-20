# Eco-Herd — Smart Monitoring for Healthier Herds

Eco-Herd is an IoT-based smart cattle collar application designed for the Samsung Solve For Tomorrow competition. It monitors cattle body temperature and motion using wearable IoT collars (ESP32-A node, ESP32-B gateway, and cloud backend).

---

## 🚀 What This Application Can Do

1. **Telemetry Ingestion**: Receives batched sensor data from ESP32 gateways via HTTP REST API (`POST /api/v1/telemetry`).
2. **Real-Time Monitoring**: Streams live telemetry updates using Server-Sent Events (SSE).
3. **Database Integration**: Stores telemetry, cattle profiles, and alerts using PostgreSQL and Prisma ORM.
4. **Web Dashboard**: Responsive web app built with React, Vite, and Tailwind CSS to track herd health and individual cattle metrics.
5. **Mobile Application**: React Native app built with Expo and Expo Router, featuring cross-platform support (Android/iOS via Expo Go).
6. **Simulation Mode**: Includes a telemetry simulator script (`scripts/simulate-telemetry.ts`) to test the system without physical hardware.

---

## 📦 Monorepo Structure

```text
eco-herd/
├── apps/
│   ├── web/        # React + Vite web dashboard
│   ├── mobile/     # React Native + Expo mobile application
│   └── api/        # Node.js + Express backend with Prisma ORM
├── packages/
│   ├── shared/     # Shared types and utilities
│   └── ui/         # Shared UI components
├── kode-esp/       # Reference firmware for ESP32
└── package.json    # Root monorepo configuration
```

---

## 🛠️ Setup & Installation Guide (For New Laptop / Cloning)

Follow these steps to set up and run the project locally on a new machine:

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **PostgreSQL** installed locally or via cloud (e.g., Supabase / Neon)
- **Git**

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Eco-Heard-AI-driven-Affordable-Smart-Livestock-Collar
```

### 2. Install Dependencies
Install dependencies across the monorepo workspaces:
```bash
npm install
```

### 3. Configure Environment Variables
Navigate to `apps/api/` and create a `.env` file based on your database configuration:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/eco_herd?schema=public"
PORT=3000
```

### 4. Setup Database
Run Prisma migrations to initialize the database schema:
```bash
cd apps/api
npx prisma migrate dev --name init
cd ../..
```

### 5. Running the Application

You can run each part of the system concurrently using separate terminals:

* **Start the Backend API**:
  ```bash
  cd apps/api
  npx ts-node index.ts
  ```

* **Start the Web Application**:
  ```bash
  cd apps/web
  npm run dev
  ```

* **Start the Mobile Application (Expo Go)**:
  ```bash
  cd apps/mobile
  npx expo start
  ```

### 6. Testing Without Hardware (Simulation)
To test telemetry ingestion without the physical ESP32 collar:
```bash
cd apps/api
npx ts-node scripts/simulate-telemetry.ts
```
