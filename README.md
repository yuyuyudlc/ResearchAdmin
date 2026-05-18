# ResearchAdmin 项目

这是一个包含 Go 后端和 React 前端的研究文档管理系统。

## 环境要求

在开始之前，请确保您的机器上已安装以下环境：

- **Go**: 1.20 或更高版本
- **Node.js**: 16.x 或更高版本
- **pnpm**: 建议使用最新版本 (`npm install -g pnpm`)
- **Git**: 用于版本控制

## 快速开始

本项目提供了一系列脚本来简化环境配置。

### 1. 初始化环境

根据您的操作系统运行对应的初始化脚本：

#### Windows
```powershell
# 安装 Node.js 相关依赖 (Frontend, backend/node)
.\scripts\setup-node.bat

# 整理 Go 依赖
.\scripts\setup-go.bat
```

#### Linux/macOS
```bash
# 赋予权限
chmod +x scripts/*.sh

# 安装 Node.js 相关依赖
./scripts/setup-node.sh

# 整理 Go 依赖
./scripts/setup-go.sh
```

### 2. 启动项目

本项目提供了一个集成启动脚本，可以同时启动后端 Go 服务、Node 协同服务和前端 Vite 服务。

#### 快速启动（推荐）
在根目录下运行：
```powershell
npm run dev
```
该脚本 (`scripts/dev.mjs`) 会：
- 启动 **Go 后端** (`backend/main.go`)
- 启动 **Node 协同服务** (`backend/node/src/server.js`)
- 启动 **前端服务** (`Frontend`)

#### 分步启动
如果您需要调试特定模块，也可以手动启动：

**启动后端 (Go)**
```powershell
cd backend
go run main.go
```

**启动前端 (Vite)**
```powershell
cd Frontend
pnpm dev
```

## 脚本说明

位于 `scripts/` 目录下的脚本功能如下：

- `setup-node`: 自动化执行 `npm install` 和 `pnpm install`。它会扫描根目录、`Frontend` 目录以及 `backend/node` 中的依赖并进行安装。
- `setup-go`: 进入 `backend` 目录并运行 `go mod tidy` 以确保 Go 依赖库是最新的。

## 仓库维护建议

为了保持仓库体积轻量，以下内容已被加入 `.gitignore`，**请勿**提交到 Git：
- `Frontend/node_modules/`
- `backend/research-admin` (Go 编译生成的二进制文件)
- `backend/test.db` (本地测试数据库)
- `.env` 配置文件
