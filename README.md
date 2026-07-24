# 🌊 Global Freight Disruption Firewall & Mode-Swap Predictor

> A real-time decision support system for shipping companies to reroute vessels during global disruptions using Monte Carlo simulations.

**Research Paper Edition** | **4 Students** | **Deadline: October 31**

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Installation Guide](#installation-guide)
5. [Project Setup](#project-setup)
6. [Running the Application](#running-the-application)
7. [Verification Checklist](#verification-checklist)
8. [Troubleshooting](#troubleshooting)
9. [Project Structure](#project-structure)
10. [Team Contributions](#team-contributions)

---

## 🎯 Project Overview

### What This System Does

This system helps shipping companies make faster, smarter rerouting decisions during global disruptions (weather, geopolitics, port strikes, etc.).

| Feature | Description |
|---------|-------------|
| **Live Tracking** | Shows all 50 vessels on an interactive Mapbox map |
| **Disruption Alerts** | Notifies logistics managers of active disruptions in real-time |
| **Smart Rerouting** | Runs 2,000 Monte Carlo simulations to find optimal routes |
| **Historical Validation** | Tests the system against real events (Suez 2021, Shanghai 2022, etc.) |
| **Executive Dashboard** | Shows cost savings and risk overview for C-suite |

### 5 Dashboards | 20 Pages

| Dashboard | User | Purpose |
|-----------|------|---------|
| **Operations** | Logistics Manager | Real-time monitoring + reroute decisions |
| **Simulator** | Route Analyst | Run simulations and validate scenarios |
| **Port** | Port Operations Officer | Monitor port health and vessel arrivals |
| **Admin** | System Administrator | Manage data, users, system health |
| **Executive** | CEO/COO | High-level KPIs and cost savings |

---

## 🛠️ Tech Stack

### Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11+ | Core backend language |
| FastAPI | 0.104+ | REST API framework |
| Uvicorn | 0.24+ | ASGI server |
| PostgreSQL | 15+ | Main database |
| PostGIS | 3.4+ | Spatial data (maps, coordinates) |
| SQLAlchemy | 2.0+ | Database ORM (write Python instead of SQL) |
| Alembic | 1.12+ | Database migrations |
| GeoAlchemy2 | 0.14+ | PostGIS support for SQLAlchemy |
| NetworkX | 3.2+ | Graph/route analysis |
| NumPy | 1.26+ | Monte Carlo calculations |
| Pandas | 2.1+ | Data manipulation |
| PyJWT | 2.8+ | Authentication tokens |

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20+ LTS | JavaScript runtime |
| React | 18.2+ | UI framework |
| Vite | 5.0+ | Fast build tool |
| TypeScript | 5.3+ | Type safety |
| React Router | 6.20+ | Page navigation |
| Mapbox GL JS | 3.0+ | Interactive maps |
| Recharts | 2.10+ | Charts & graphs |
| Axios | 1.6+ | HTTP requests to backend |
| Zustand | 4.4+ | State management |
| TailwindCSS | 3.4+ | Styling |
| Shadcn UI | Latest | UI components |
| jsPDF | 2.5+ | PDF export |

### External APIs

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| aisstream.io | Vessel positions (AIS data) | FREE - Unlimited streaming (BETA) |
| OpenWeatherMap | Weather data | 1,000 calls/day |
| Mapbox | Maps & geocoding | 50,000 loads/month |
| Sinay Port API | Port congestion | 500 calls/month |

---

## 🔧 Installation Guide

### Step 1: Install Python 3.11+

1. Download Python 3.11+ from: https://www.python.org/downloads/windows/
2. During installation, **IMPORTANT**: Check ✅ **"Add Python to PATH"**
3. Verify installation:

```powershell
python --version
# Should show: Python 3.11.x or higher

pip --version
# Should show: pip 23.x.x
```

---

### Step 2: Install Node.js 20+ LTS

1. Download Node.js 20 LTS from: https://nodejs.org/en/download/
2. Choose "Windows Installer (.msi)"
3. Verify installation:

```powershell
node --version
# Should show: v20.x.x

npm --version
# Should show: 10.x.x
```

---

### Step 3: Install PostgreSQL 15+ & PostGIS

1. Download PostgreSQL 15+ from: https://www.postgresql.org/download/windows/
2. Run the installer:
   - Port: `5432` (default)
   - Password: Choose a strong password and **SAVE IT**
   - ✅ Check "Install Stack Builder" at the end

3. **Install PostGIS** (IMPORTANT):
   - Open Stack Builder (Start Menu → PostgreSQL 15 → Stack Builder)
   - Select your PostgreSQL installation
   - Navigate to "Spatial Extensions"
   - Check ✅ "PostGIS 3.4 Bundle for PostgreSQL 15"
   - Click Next and install

4. Verify installation:

```powershell
# Open PostgreSQL
psql -U postgres

# In psql, create database
CREATE DATABASE freight_db;

# Connect to new database
\c freight_db;

# Enable PostGIS extension
CREATE EXTENSION postgis;

# Verify PostGIS is working
SELECT PostGIS_Version();

# Exit psql
\q
```

---

### Step 4: Install Git

1. Download Git from: https://git-scm.com/download/win
2. Verify:

```powershell
git --version
# Should show: git version 2.x.x
```

---

### Step 5: Install VS Code Extensions

```powershell
code --install-extension ms-python.python
code --install-extension ms-python.vscode-pylance
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension dsznajder.es7-react-js-snippets
code --install-extension eamodio.gitlens
code --install-extension ms-azuretools.vscode-docker
code --install-extension ckolkman.vscode-postgres
code --install-extension rangav.vscode-thunder-client
```

---

## 📁 Project Setup

### Step 1: Create Project Structure

```powershell
# Navigate to your documents folder
cd C:\Users\YourName\Documents

# Create project folder
mkdir freight-disruption-system
cd freight-disruption-system

# Open in VS Code
code .
```

### Step 2: Backend Setup

#### 2.1 Create Virtual Environment

```powershell
cd backend

# Create virtual environment
python -m venv venv

# Activate it (PowerShell)
.\venv\Scripts\Activate.ps1

# If you get execution policy error:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

> 💡 You should see `(venv)` in your terminal prompt.


#### 2.2 Install Dependencies

```powershell
pip install -r requirements.txt
```

---

### Step 3: Frontend Setup

#### 3.1 Create React + Vite Project

```powershell
# Go back to project root
cd ..

# Create frontend with Vite
npm create vite@latest frontend -- --template react-ts

cd frontend
```

#### 3.2 Install Dependencies

```powershell
# Install core dependencies
npm install

# Install additional packages
npm install react-router-dom axios zustand @tanstack/react-query
npm install recharts mapbox-gl date-fns jspdf jspdf-autotable
npm install --save-dev @types/mapbox-gl
npm install zustand framer-motion lucide-react react-router-dom
npm install --save-dev @types/node

# Install TailwindCSS
npm install -D tailwindcss postcss autoprefixer
```

#### 3.3 Create Tailwind Config Manually (Skip npx)

Since you had issues with `npx`, create these files manually:

**Create `frontend/tailwind.config.js`**:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Create `frontend/postcss.config.js`**:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Update `frontend/src/index.css`** (Tailwind v4 syntax):

```css
@import "tailwindcss";
```

#### 3.4 Update TypeScript Configs

**Update `frontend/tsconfig.app.json`**:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "ignoreDeprecations": "6.0"
  },
  "include": ["src"]
}
```

**Update `frontend/vite.config.ts`**:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

#### 3.5 Install Node Types

```powershell
npm install --save-dev @types/node
```

#### 3.6 Install Shadcn UI

```powershell
npx shadcn@latest init
```
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add toast
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add toast


### Step 4: Database Setup

#### 4.1 Create Database

```powershell
# Open PostgreSQL
psql -U postgres

# In psql:
CREATE DATABASE freight_db;
\c freight_db;
CREATE EXTENSION postgis;
SELECT PostGIS_Version();
\q
```

#### 4.2 Initialize Alembic

```powershell
cd backend
alembic init alembic
```

Edit `backend/alembic.ini`:

```ini
sqlalchemy.url = postgresql://postgres:YOUR_PASSWORD@localhost:5432/freight_db
```

---

### Step 5: API Keys Setup

#### 5.1 aisstream.io (for vessel positions)

1. Go to: https://aisstream.io/
2. Sign in with GitHub (free)
3. Generate API key at: https://aisstream.io/apikeys
4. Add to `backend/.env` as `AISSTREAM_API_KEY`

#### 5.2 Sinay Port Congestion API

1. Go to: https://developers.sinay.ai/home
2. Create free account (500 calls/month)
3. Generate API key
4. Add to `backend/.env` as `SINAY_API_KEY`

#### 5.3 Mapbox Token

1. Go to: https://account.mapbox.com/
2. Sign up (free)
3. Copy your public token
4. Add to `backend/.env` and `frontend/.env`

#### 5.4 OpenWeatherMap API

1. Go to: https://openweathermap.org/api
2. Sign up (free tier: 1,000 calls/day)
3. Add to `backend/.env` as `OPENWEATHER_API_KEY`

---

## 🚀 Running the Application


**Terminal 1 - PostgreSQL**:
```powershell
# Make sure PostgreSQL is running
# Check in Services (services.msc)
# Service name: postgresql-x64-15
```

**Terminal 2 - Backend**:
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
# Runs on: http://localhost:8000
```

**Terminal 3 - Frontend**:
```powershell
cd frontend
npm run dev
# Runs on: http://localhost:5173
```

---

## ✅ Verification Checklist

- [ ] Python 3.11+ installed (`python --version`)
- [ ] Node.js 20+ installed (`node --version`)
- [ ] PostgreSQL 15+ installed (`psql --version`)
- [ ] PostGIS extension enabled (`SELECT PostGIS_Version();`)
- [ ] Git installed (`git --version`)
- [ ] Backend running on http://localhost:8000
- [ ] Frontend running on http://localhost:5173
- [ ] Database connected (check `/docs` endpoint)
- [ ] API keys added to `.env` files

---

## 🆘 Troubleshooting

### PowerShell Execution Policy Error
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### PostgreSQL Connection Error
```powershell
# Check if PostgreSQL is running
Get-Service -Name postgresql*

# Start if stopped
Start-Service postgresql-x64-15
```

### Port Already in Use
```powershell
# Find process on port 8000
netstat -ano | findstr :8000

# Kill process (replace PID with actual number)
taskkill /PID <PID> /F
```

### Tailwind v4 Syntax Error
Make sure your `index.css` uses:
```css
@import "tailwindcss";
```
Not the old v3 syntax.

### TypeScript Deprecation Warning
Add `"ignoreDeprecations": "6.0"` to `tsconfig.app.json` under `compilerOptions`.

*** To get the folder structure ***
function Clean-Tree($path, $indent = "") {
    $exclude = @(
        "venv","node_modules","__pycache__",".git",
        "site-packages","pip","dist","build",".cache","logs"
    )

    Get-ChildItem $path | Where-Object {
        $exclude -notcontains $_.Name
    } | ForEach-Object {
        Write-Output "$indent$($_.Name)"
        if ($_.PSIsContainer) {
            Clean-Tree $_.FullName "$indent  "
        }
    }
}

Clean-Tree .

**Built with ❤️ by Team Freight Disruption Firewall**

**Deadline: October 31**

