#!/bin/bash

# AI Fleet Electrification Planner - Start Script
# This script sets up and starts the entire application

set -e

echo "=========================================="
echo "  AI Fleet Electrification Planner"
echo "  Starting Application..."
echo "=========================================="

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo "[OK] Environment variables loaded"
else
  echo "[ERROR] .env file not found!"
  exit 1
fi

# Function to clean up ports
cleanup_ports() {
  echo ""
  echo "[*] Cleaning up ports..."

  # Kill processes on backend port
  if lsof -ti:${BACKEND_PORT:-4000} > /dev/null 2>&1; then
    echo "  Killing process on port ${BACKEND_PORT:-4000}..."
    kill -9 $(lsof -ti:${BACKEND_PORT:-4000}) 2>/dev/null || true
  fi

  # Kill processes on frontend port
  if lsof -ti:${FRONTEND_PORT:-3000} > /dev/null 2>&1; then
    echo "  Killing process on port ${FRONTEND_PORT:-3000}..."
    kill -9 $(lsof -ti:${FRONTEND_PORT:-3000}) 2>/dev/null || true
  fi

  echo "[OK] Ports cleaned"
}

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "[*] Shutting down..."
  cleanup_ports
  exit 0
}

trap cleanup SIGINT SIGTERM

# Clean up ports first
cleanup_ports

# Check if PostgreSQL is running
echo ""
echo "[*] Checking PostgreSQL..."
if command -v pg_isready > /dev/null 2>&1; then
  if pg_isready -q 2>/dev/null; then
    echo "[OK] PostgreSQL is running"
  else
    echo "[*] Starting PostgreSQL..."
    if command -v brew > /dev/null 2>&1; then
      brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
    fi
    sleep 2
  fi
fi

# Create database and user if they don't exist
echo ""
echo "[*] Setting up database..."
psql postgres -c "CREATE USER fleet_user WITH PASSWORD 'fleet_pass';" 2>/dev/null || true
psql postgres -c "ALTER USER fleet_user CREATEDB;" 2>/dev/null || true
psql postgres -c "CREATE DATABASE fleet_electrification OWNER fleet_user;" 2>/dev/null || true
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE fleet_electrification TO fleet_user;" 2>/dev/null || true
echo "[OK] Database ready"

# Install backend dependencies
echo ""
echo "[*] Installing backend dependencies..."
cd backend
npm install --silent 2>&1 | tail -1
echo "[OK] Backend dependencies installed"

# Seed the database
echo ""
echo "[*] Seeding database with sample data..."
node src/seeds/seed.js
echo "[OK] Database seeded"

# Start backend with nodemon for hot reload
echo ""
echo "[*] Starting backend on port ${BACKEND_PORT:-4000}..."
npx nodemon src/index.js &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo "[*] Waiting for backend..."
for i in {1..30}; do
  if curl -s http://localhost:${BACKEND_PORT:-4000}/api/health > /dev/null 2>&1; then
    echo "[OK] Backend is ready"
    break
  fi
  sleep 1
done

# Install frontend dependencies
echo ""
echo "[*] Installing frontend dependencies..."
cd frontend
npm install --silent 2>&1 | tail -1
echo "[OK] Frontend dependencies installed"

# Start frontend (React dev server with hot reload)
echo ""
echo "[*] Starting frontend on port ${FRONTEND_PORT:-3000}..."
BROWSER=none PORT=${FRONTEND_PORT:-3000} npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "=========================================="
echo "  Application Started Successfully!"
echo "=========================================="
echo ""
echo "  Frontend: http://localhost:${FRONTEND_PORT:-3000}"
echo "  Backend:  http://localhost:${BACKEND_PORT:-4000}"
echo ""
echo "  Login Credentials:"
echo "    Email:    admin@fleet.com"
echo "    Password: password123"
echo ""
echo "  Press Ctrl+C to stop all services"
echo "=========================================="
echo ""

# Wait for any process to exit
wait
