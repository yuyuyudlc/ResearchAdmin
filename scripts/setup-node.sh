#!/bin/bash
# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install Frontend dependencies
echo "Installing Frontend dependencies..."
cd Frontend
pnpm install
cd ..

# Install Backend Node dependencies
echo "Installing Backend Node dependencies..."
cd backend/node
npm install
cd ../..

echo "Node environment setup complete!"
