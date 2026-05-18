@echo off
echo Installing root dependencies...
call npm install

echo Installing Frontend dependencies...
cd Frontend
call pnpm install
cd ..

echo Installing Backend Node dependencies...
cd backend/node
call npm install
cd ..\..

echo Node environment setup complete!
