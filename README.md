<div align="center">
  <img src="./docs/logo.png" width="128" alt="FinAnalysis Logo" />
  <h1>财报分析桌面端 (大模型驱动版)</h1>
  <p>基于大模型算力的财报分析桌面端软件，实现自动化的财务数据高精度提取、标准化处理与 AI 智能报告推演。</p>
</div>

## 📥 下载安装

您可以前往 [GitHub Releases](https://github.com/zhangbo0908/FinAnalysis/releases) 页面查阅更新日志并下载最新版 (v1.1.0) 安装包。

- **macOS (Apple Silicon) 用户**: [下载 财报智析 v1.1.0 (Mac ARM64)](https://github.com/zhangbo0908/FinAnalysis/releases/download/v1.1.0/%E8%B4%A2%E6%8A%A5%E6%99%BA%E6%9E%90-1.1.0-arm64-mac.zip)
  > 下载后双击解压缩，然后将应用拖入 `/Applications` (应用程序) 文件夹运行。
- **Windows (x64) 用户**: [下载 财报智析 v1.1.0 (Win x64)](https://github.com/zhangbo0908/FinAnalysis/releases/download/v1.1.0/desktop-app-1.1.0-setup.exe)
  > 下载后直接运行 Setup 安装程序。

## 1. 产品概述

本项目通过“大模型瘦客户端架构”，彻底告别了本地沉重的 Python 深度学习环境与 OCR 引擎，采用原生 Node.js 直连云端前沿多模态大模型（如 GPT-4o, Claude 3.5 Sonnet 等），在保证数据隐私安全的前提下，提供极速、精准的财报分析体验。交互界面全面落实 **拟玻璃化 (Glassmorphism)** 与 **极简主义 (Minimalism)** 的现代设计准则。

### ✨ 核心特性
- **高精度提取**：利用 VLM（视觉语言模型）从 PDF（含扫描件）中原封不动提取资产负债表、利润表与现金流量表。
- **标准化存储**：一键生成包含多 Sheet 的标准 Excel (`.xlsx`) 文件。
- **灵活的多级数据源接入**：不仅支持上一环节 PDF 解析直通，也支持直接加载历史本地存储的标准化 Excel 进行并行推演计算。
- **Agentic 推演矩阵**：内置四大财务角色视角（审计、投资、经营、风控），暴露出原生指令高阶设定口，流式（打字机效果）输出 Markdown 深度报告。
- **离线安全体验**：API 密钥本地最高级别加密存储，网络连通性一键探测，支持用户自带密钥 (BYOK)。

## 2. 技术栈

- **桌面端框架**: [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/)
- **前端框架**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **样式方案**: [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- **AI 编排**: [LangChain](https://js.langchain.com/)
- **数据处理**: [xlsx](https://sheetjs.com/) + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- **测试框架**: [Vitest](https://vitest.dev/) (TDD 驱动)

## 3. 快速上手

### 环境要求
- [Node.js](https://nodejs.org/) (推荐 v18+)
- [npm](https://www.npmjs.com/)

### 安装
```bash
$ cd desktop-app
$ npm install
```

### 开发模式
```bash
$ cd desktop-app
$ npm run dev
```

### 生产构建
```bash
$ cd desktop-app
# 构建 Windows 版本
$ npm run build:win

# 构建 macOS 版本
$ npm run build:mac

# 构建 Linux 版本
$ npm run build:linux
```

## 4. 开发规范

本项目遵循 **TDD (测试驱动开发)** 规范进行功能的迭代演进。

### 运行测试
```bash
$ cd desktop-app
# 运行所有单元测试
$ npm run test

# 监视模式
$ npm run test:watch
```

### 代码检测
```bash
$ cd desktop-app
# 类型检查
$ npm run typecheck

# Lint 检查
$ npm run lint
```

## 5. 项目结构
```text
desktop-app/
├── src/
│   ├── main/          # Electron 主进程 (核心逻辑、API 管理)
│   ├── preload/       # 预加载脚本 (IPC 通信)
│   └── renderer/      # React 渲染进程 (UI 界面、组件)
├── out/               # 构建输出
└── ...                # 其他配置文件 (vite, tsconfig, etc.)
```

---
*遵循 [财报分析软件PRD](docs/财报分析软件PRD.md) 与 [架构演进说明](docs/财报分析离线桌面端架构演进(大模型版).md) 实施。*
