# 🌊 Global Freight Disruption Firewall & Mode-Swap Predictor

> A real-time decision support system for shipping companies to reroute vessels during global disruptions using Monte Carlo simulations.

**Research Paper Edition** | **4 Students** | **Deadline: October 31**

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation Guide](#installation-guide)
  - [Step 1: Install Python](#step-1-install-python)
  - [Step 2: Install Node.js](#step-2-install-nodejs)
  - [Step 3: Install PostgreSQL & PostGIS](#step-3-install-postgresql--postgis)
  - [Step 4: Install Git](#step-4-install-git)
  - [Step 5: Install Docker (Optional)](#step-5-install-docker-optional)
  - [Step 6: Install VS Code Extensions](#step-6-install-vs-code-extensions)
- [Project Setup](#project-setup)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Database Setup](#database-setup)
  - [API Keys Setup](#api-keys-setup)
- [Running the Application](#running-the-application)
- [Verification Checklist](#verification-checklist)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [Team Contributions](#team-contributions)

---

## 🎯 Project Overview

This system helps shipping companies make faster, smarter rerouting decisions during global disruptions (weather, geopolitics, port strikes, etc.).

### What It Does

- **Live Tracking**: Shows all 50 vessels on an interactive map
- **Disruption Alerts**: Notifies logistics managers of active disruptions
- **Smart Rerouting**: Runs 2,000 Monte Carlo simulations to find optimal routes
- **Historical Validation**: Tests the system against real events (Suez 2021, Shanghai 2022, etc.)
- **Executive Dashboard**: Shows cost savings and risk overview for C-suite

### 5 Dashboards | 20 Pages

| Dashboard | User | Purpose |
|-----------|------|---------|
| Operations | Logistics Manager | Real-time monitoring + reroute decisions |
| Simulator | Route Analyst | Run simulations and validate scenarios |
| Port | Port Operations Officer | Monitor port health and vessel arrivals |
| Admin | System Administrator | Manage data, users, system health |
| Executive | CEO/COO | High-level KPIs and cost savings |

---

## 🛠️ Tech Stack

### Backend

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
| OR-Tools | 9.8+ | Route optimization (optional) |
| NumPy | 1.26+ | Monte Carlo calculations |
| Pandas | 2.1+ | Data manipulation |
| PyJWT | 2.8+ | Authentication tokens |

### Frontend

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
| MarineTraffic | Vessel positions (AIS data) | 500 records/day |
| OpenWeatherMap | Weather data | 1,000 calls/day |
| Mapbox | Maps & geocoding | 50,000 loads/month |
| Port API (RapidAPI) | Port congestion | ~100 calls/day (use multiple APIs) |

---

## 📦 Prerequisites

Before you start, make sure you have:

- Windows 10/11 (this guide is for Windows)
- Admin access to install software
- Stable internet connection
- Minimum 8GB RAM (16GB recommended)
- 10GB free disk space

---

## 🔧 Installation Guide

### Step 1: Install Python

1. Download Python 3.11+ from: https://www.python.org/downloads/windows/
2. During installation, **IMPORTANT**: Check ✅ **"Add Python to PATH"**
3. Verify installation:

```powershell
python --version
# Should show: Python 3.11.x or higher

"### Step 2: Install Node.js"
Download Node.js 20 LTS from: https://nodejs.org/en/download/

Choose "Windows Installer (.msi)"

Verify installation:
pip --version
# Should show: pip 23.x.x

node --version
# Should show: v20.x.x

npm --version
# Should show: 10.x.x

"### Step 3: Install PostgreSQL & PostGIS"
Download PostgreSQL 15+ from: https://www.postgresql.org/download/windows/

Run the installer:

Port: 5432 (default)

Password: Choose a strong password and SAVE IT (you'll need it later)

✅ Check "Install Stack Builder" at the end

Install PostGIS (IMPORTANT):

Open Stack Builder (Start Menu → PostgreSQL 15 → Stack Builder)

Select your PostgreSQL installation

Navigate to "Spatial Extensions"

Check ✅ "PostGIS 3.4 Bundle for PostgreSQL 15"

Click Next and install

Verify installation:

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

### Step 4: Install Git
git --version
# Should show: git version 2.x.x

Step 6: Install VS Code Extensions
Open VS Code and install these extensions (you can use the command below):

# Install all extensions at once
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
code --install-extension formulahendry.auto-rename-tag
code --install-extension christian-kohler.path-intellisense

mkdir freight-disruption-system
cd freight-disruption-system

Step 2: Backend Setup
2.1 Create Virtual Environment
powershell
cd backend

# Create virtual environment
python -m venv venv

# Activate it (PowerShell)
.\venv\Scripts\Activate.ps1

# If you get execution policy error:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

pip install -r requirements.txt

Step 3: Frontend Setup
3.1 Create React + Vite Project
powershell
# Go back to project root
cd ..

# Create frontend with Vite
npm create vite@latest frontend -- --template react-ts

cd frontend

3.2 Install Dependencies
powershell
# Install core dependencies
npm install

# Install additional packages
npm install react-router-dom axios zustand @tanstack/react-query
npm install recharts mapbox-gl date-fns jspdf jspdf-autotable
npm install --save-dev @types/mapbox-gl

# Install TailwindCSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install Shadcn UI
npx shadcn@latest init
# Choose: Style=Default, Color=Slate, CSS variables=Yes 

4.3 Initialize Alembic (Database Migrations)
powershell
cd backend
alembic init alembic