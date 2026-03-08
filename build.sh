#!/bin/bash
set -e

echo "📦 Installing root dependencies..."
npm install

echo "🎨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "🚀 Starting backend..."
cd backend
npm install
node server.js
