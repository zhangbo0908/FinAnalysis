# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

财报分析桌面端应用 (大模型驱动版)，基于 Electron + React + TypeScript 构建。通过 VLM（视觉语言模型）自动从 PDF 财报中提取资产负债表、利润表、现金流量表，并生成 AI 分析报告。

## 常用命令

所有命令需在 `desktop-app` 目录下执行：

```bash
# 开发模式
npm run dev

# 运行所有测试
npm run test

# 测试监视模式
npm run test:watch

# 类型检查
npm run typecheck

# Lint 检查
npm run lint

# 生产构建
npm run build        # 通用构建
npm run build:mac    # macOS ARM64
npm run build:win    # Windows x64
```

## 架构

项目采用 electron-vite 脚手架，代码分为三个独立进程：

```
desktop-app/src/
├── main/          # Electron 主进程
│   ├── index.ts              # 应用入口、IPC 处理器注册
│   ├── database.ts           # SQLite 数据库操作 (better-sqlite3)
│   └── services/
│       ├── llmService.ts     # VLM 财务表格提取 (LangChain)
│       ├── analysisService.ts # 流式财务分析报告生成
│       ├── exportService.ts  # Excel 导出 (xlsx-js-style)
│       └── parseExcelService.ts # 本地 Excel 解析
├── preload/       # 预加载脚本 (IPC 桥梁)
│   └── index.ts              # 暴露 api 对象到渲染进程
└── renderer/      # React 渲染进程
    └── src/
        ├── App.tsx           # 路由配置 (react-router-dom)
        ├── pages/            # 四个主要页面
        │   ├── ImportParse.tsx    # PDF/Excel 导入解析
        │   ├── DataVerification.tsx # 数据校验工作台
        │   ├── AgenticReporting.tsx  # AI 分析报告
        │   └── Settings.tsx   # API 密钥配置
        └── lib/
            └── pdfService.ts  # PDF 转图片 (pdfjs-dist)
```

## IPC 通信模式

主进程与渲染进程通过 IPC 通信，采用 `invoke:namespace:action` 命名模式：

- `invoke:settings:*` - 配置相关（保存/获取 API Key、角色等）
- `invoke:llm:*` - LLM 操作（表格提取、连通性测试、财务分析）
- `invoke:excel:*` - Excel 操作
- `invoke:export:*` - 导出操作

渲染进程通过 `window.api` 调用（定义在 preload/index.ts）。

## LLM 提供商

支持四种提供商，配置存储在 SQLite `api_keys` 表：

- `openai` - GPT-4o (默认)
- `anthropic` - Claude 3.5 Sonnet
- `gemini` - Gemini 1.5 Pro (默认提供商)
- `custom` - 自定义 OpenAI 兼容端点

## 财务分析角色

`analysisService.ts` 定义了四种分析角色视角：

- `audit` - 审计视角（默认）
- `value_investing` - 价值投资视角
- `management` - 经营管理视角
- `credit_risk` - 信贷风控视角

## 核心数据流

1. **PDF 解析**：`pdfService.ts` 将 PDF 转为 Base64 图片 → `llmService.extractFinancialTables()` 并发调用 VLM
2. **资产负债表合并**：VLM 返回左右两侧数组，`mergeBalanceSheet()` 合并为宽表（右侧字段加 `_R` 后缀）
3. **数据校验**：`DataVerification` 页面使用虚拟列表展示，支持表头校准
4. **分析报告**：`analysisService.generateFinancialAnalysis()` 流式输出 Markdown

## 测试约定

测试文件与源文件同目录，命名 `.test.ts` / `.test.tsx`。使用 Vitest + Testing Library。

```bash
# 运行单个测试文件
npx vitest run src/main/database.test.ts
```

## 路径别名

- `@renderer/*` 或 `@/*` → `src/renderer/src/`
- `src/*` → `src/` (测试用)
