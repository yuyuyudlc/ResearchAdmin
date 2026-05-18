@echo off
echo Running go mod tidy for backend...
cd backend
go mod tidy
cd ..

echo Go environment setup complete!
