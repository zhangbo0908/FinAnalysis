# 财报分析桌面端 (大模型驱动版)

基于大模型算力的财报分析桌面端软件，实现自动化的财务数据高精度提取、标准化处理与 AI 智能报告推演。

## 1. 产品概述

本项目通过“大模型瘦客户端架构”，彻底告别了本地沉重的 Python 深度学习环境与 OCR 引擎，采用原生 Node.js 直连云端前沿多模态大模型（如 GPT-4o, Claude 3.5, Gemini 2.0），在保证数据隐私安全的前提下，提供极速、精准的财报分析体验。

### 核心特性
- **高精度提取**：利用 VLM（视觉语言模型）从 PDF（含扫描件）中原封不动提取资产负债表、利润表与现金流量表。
- **标准化存储**：一键生成包含多 Sheet 的标准 Excel (`.xlsx`) 文件。
- **Agentic 推演**：基于 LangChain 驱动的 AI 分析引擎，流式（打字机效果）输出深度财务分析报告。
- **离线安全体验**：API 密钥本地加密存储，支持用户自带密钥 (BYOK)。

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
$ npm install
```

### 开发模式
```bash
$ npm run dev
```

### 生产构建
```bash
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
# 运行所有单元测试
$ npm run test

# 监视模式
$ npm run test:watch
```

### 代码检测
```bash
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
