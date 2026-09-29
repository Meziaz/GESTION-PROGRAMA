# Gestor de Proyectos TI - EVM Dashboard

## Project Overview
React application for IT Project Cost Management with Earned Value Management (EVM) analysis and AI-powered insights using Gemini AI.

## Architecture
- **Frontend**: React 18 + Vite + Tailwind CSS
- **State Management**: React hooks + localStorage for data persistence
- **Charts**: Recharts for S-Curve visualization
- **AI Integration**: Gemini API mediante proxy backend
- **Backend Optional**: Express.js + PostgreSQL

## Key Features
1. **Dashboard**: Project overview with summary metrics and project table
2. **New Project Form**: AI-powered WBS generation using Gemini
3. **Project Detail**: Full EVM metrics, S-Curve graph, cut dates management, AI analysis

## Technology Stack
- React 18.2
- Vite 5.0
- Tailwind CSS 3.3
- Recharts 2.10
- Lucide React 0.294
- Gemini API (modelo configurable en el backend)
- PostgreSQL (optional backend)
- Express.js (optional)

## Configuration
- `GEMINI_API_KEY` in `.env.local` for Gemini API
- PostgreSQL schema in `schema.sql` for optional backend
- All data persisted to localStorage by default

## Development
```bash
npm install
npm run dev
```

## Database Setup (Optional)
```bash
psql -U postgres -d evm_projects_db -f schema.sql
```

## Key Calculations
- **EVM Metrics**: CPI, SPI, CV, SV calculated from cut dates
- **Sigmoid PV Curve**: Planned value using sigmoid function
- **Project Status**: Auto-calculated based on CPI/SPI thresholds
- **Forecasts**: EAC, ETC, VAC, TCPI for project completion

## AI Integration
- WBS generation from project description
- Executive analysis with risk identification and recommendations
- All responses in Spanish with proper formatting
