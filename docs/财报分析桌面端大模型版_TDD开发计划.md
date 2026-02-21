# 财报分析桌面端大模型版 TDD 开发计划

> **文档状态**：Release
> **更新日期**：2026-02-20
> **设 计 师**：资深全栈开发工程师 & 架构师
> **关联文档**：`财报分析软件PRD.md`、`架构演进(大模型版).md`、`UI_UX设计方案.md`

## 1. 核心开发哲学与愿景 (TDD & Vision)

本规划旨在通过**测试驱动开发 (TDD)** 建立高质量、高可维护性的 Electron 桌面端混合应用。我们将遵循以下准则：
- **测试先行 (Test-First)**：先写失败测试，后写实现代码，最后重构（Red-Green-Refactor）。
- **进程隔离测试**：明确 Electron 主进程（Node.js 端，处理 API 请求与 sqlite）和渲染进程（React 端，处理 UI 与用户事件）的边界，对关键 IPC (Inter-Process Communication) 桥接层实施 Mock 测试。
- **UI/UX 保真**：前端组件基于 `shadcn/ui`，使用 React Testing Library 和 Vitest 保驾护航组件逻辑，依靠 Playwright 进行关键的拖拽与生成流程端到端 (E2E) 测试。

---

## 2. 技术栈与测试工具链选型 (Tech Stack & Testing Tools)

### 2.1 整体技术栈
- **核心框架**：`Electron` (主进程) + `React 18` (渲染进程)
- **构建工具选型**：`Vite` 或 `Electron-Vite` (提供开箱即用的 HMR 和 TypeScript 支持)
- **UI 框架与样式**：`Tailwind CSS` + `shadcn/ui` (Radix UI) + `Lucide React` (图标库)
- **大模型交互层**：`LangChain.js` (编排处理图片转 Base64 及对接多模态 API)
- **本地持久化**：`better-sqlite3` + `node-keytar` (或其他原生的 AES256 加盐算法方案加密 API Key)

### 2.2 测试全景图
- **单元与集成测试 (Unit & Integration)**：`Vitest` (与 Vite 无缝集成，速度极快)
- **前端组件测试 (Component)**：`@testing-library/react` + `@testing-library/jest-dom`
- **端到端测试 (E2E)**：`Playwright` (内置极好的 Electron 测试支持 `_electron.launch`)
- **API 请求拦截与 Mock (Network)**：`MSW` (Mock Service Worker) 或在 Vitest 中直接 Mock 离线的 `fetch` 响应，来模拟大模型漫长的思辨及流式返回 (`Transfer-Encoding: chunked`)。

---

## 3. IPC 接口与端到端状态契约设计 (IPC Contracts)

在 TDD 实施前，确立主渲染进程的通信契约（`preload.ts` 暴露的方法）。这些契约将是编写 Mock 测试的核心依据。

| 领域分类           | 前端调用接口 (Channel)            | 负载/参数类型 (Payload)                                            | 返回值/事件触发 (Return/Event)                            |
| :----------------- | :-------------------------------- | :----------------------------------------------------------------- | :-------------------------------------------------------- |
| **API 配置**       | `invoke:settings:saveKey`         | `{ provider: string, key: string, baseURL?: string }`              | `Promise<{ success: boolean }>`                           |
| **API 配置**       | `invoke:settings:getKey`          | `provider: string`                                                 | `Promise<string                                           | null>`                               |
| **模板与提示配置** | `invoke:settings:getAnalyPrompt`  | 无                                                                 | `Promise<string>` (返回保存的或默认的 Prompt 字符串)      |
| **模板与提示配置** | `invoke:settings:saveAnalyPrompt` | `prompt: string`                                                   | `Promise<{ success: boolean }>`                           |
| **PDF 预处理**     | `invoke:pdf:splitToImages`        | `filePath: string`                                                 | `Promise<{ imagesBase64: string[], totalPages: number }>` |
| **文件解析**       | `invoke:excel:parseLocal`         | `filePath: string`                                                 | `Promise<FinancialTablesJSON                              | null>` (需做高强度的 Sheet 与行校验) |
| **VLM 财务抽取**   | `invoke:llm:extractTables`        | `{ images: string[], provider: string }`                           | `Promise<FinancialTablesJSON>`                            |
| **VLM/LLM 状态**   | `on:llm:streamUpdate`             | `(event, chunk: string) => void`                                   | 渲染进程实时监听此事件流用于打字机 UI                     |
| **进度更新**       | `on:process:progress`             | `(event, data: { step: string, percent: number }) => void`         | 用于更新 UI 的状态机                                      |
| **财务分析**       | `invoke:llm:analyzeFinancials`    | `{ provider: string, data: FinancialTablesJSON, prompt?: string }` | `Promise<{ success: boolean }>` + 流式推送事件            |
| **分析流式推送**   | `stream:analysis:chunk`           | 主进程 -> 渲染进程                                                 | 每个 LLM token chunk 实时推送                             |
| **分析完成**       | `stream:analysis:done`            | 主进程 -> 渲染进程                                                 | 流式输出结束信号                                          |
| **分析错误**       | `stream:analysis:error`           | 主进程 -> 渲染进程                                                 | 错误消息推送                                              |

---

## 4. 基于 TDD 的迭代里程碑 (Iterative Milestones)

我们会将整个应用拆解为 4 个主要里程碑。每个阶段都以编写规范的测试为发端。

### Milestone 1：基础设施建立与持久化加固 (Infrastructure & DB)
**目标**：完成 Electron-Vite 项目骨架搭建，并实现安全可靠的系统设置中心（API Key 本地加密持久化）。

**当前进度：**
- [x] **0. [ 基础搭建 ]** 完成 Electron-Vite 项目骨架初始化，集成 Tailwind CSS + shadcn/ui，并成功挂载包含四大功能区的 Layout 导航侧边栏壳子。
- [x] **1. [ 测试 ]** 编写针对 SQLite CRUD 及 AES 加解密工具类的单元测试 (Vitest) -- **PASS**
- [x] **2. [ 实现 ]** 建立 `database.ts` 以及加解密逻辑（要求无纯文本泄漏）。
- [x] **3. [ 测试 ]** 编写基于 React Testing Library 的 `Settings` 组件的 UI 交互测试（验证密码框输入、错误回显、保存成功反馈） -- **PASS**
- [x] **4. [ 实现 ]** 完善设置中心的组件 UI，并通过 IPC (`saveKey`, `getKey`) 联调刚才的持久化层。

**验收**：本地运行，能在断网状态下保存并正确回填各种大模型供应商的 API Key。

### Milestone 2：PDF 处理与前端拖拽交互 (Import & Pre-process)
**目标**：完成 UI 方案中 3.1 节 “VLM 财报导入台”。

**当前进度：**
- [x] **0. [ 技术决策 ]** 经研判决定在渲染进程引入 `pdfjs-dist`，达成跨平台 100% 离线免依赖渲染截取方案。
- [x] **1. [ 测试 ]** 调整并编写 `<ImportParse />` 与拖拽组件 `<Dropzone />` 的渲染逻辑测试，验证状态流转。-- **PASS**
- [x] **2. [ 实现 ]** 封装 `lib/pdfService.ts`（使用 HTML5 Canvas与`pdfjs`工作线程输出 Base64 流）。
- [x] **3. [ 实现 ]** 开发虚线高亮拖拽区，选择文件后能够发出提取请求并在 UI 层切换为“解析中卡片流”。
- [x] **4. [ 拓展 ]** 增设图片网格复选框交互（全选/反选），允许用户截断不相关的注脚发往大模型节省 Token。

**待办任务**：
5. **验收**：本地运行，体验拖拽一个单页或多页 PDF 到界面中，观察其分割为图片卡的流程。

### Milestone 3：VLM 抽取大表与联动校对工作台 (VLM Extraction & Grid Verification)
**目标**：完成 UI 方案中 3.2 节核心重点。发起云端多模态大模型调用，展现原始图片与结构化电子表格的分屏界面。

**当前进度：**
- [x] **1. [ 测试 ]** 构建大模型调用的 API 服务层的单元测试。使用 Mock 提供一段虚拟的完整 JSON 三表组合。跑通解析、合并与格式返回逻辑并验证类型稳定性。
- [x] **2. [ 实现 ]** 编写接入主进程内基于 LangChain 的多模态适配器代码。并在设置中心拓展全局 `active_provider` 管理以及网络连通性探测接口。
- [x] **3. [ 测试 ]** 针对前端 `<VirtualTable />`（使用 TanStack Table）编写严格的组件交互测试，模拟更新表格内特定的值并断言更新。
- [x] **4. [ 实现 ]** 开发 DataVerification 左右分屏页面，结合 React 状态管理库以及 IPC，实现右侧电子表格数据自动反映到内存状态中，以及主进程 XLSX 的拼包生成导出。
- [x] **5. [ 验收 ]** 能够在真正的 UI 流程中完成“导入 PDF -> 筛选图卡 -> 调用 VLM -> 双屏校对 -> 导出至 Excel”全链路。

### Milestone 4：智能报告推演生成器 (Agentic Reporting & Streaming Markdown)
**目标**：完成 UI 方案中 3.3 节。彻底解耦上游依赖，支持加载存储 Excel 文件组装为 JSON 发送给 LLM，支持动态设定分析逻辑，并流式输出五维度专业财务分析报告。

**当前进度与重构规划：**
- [x] **1. [ 测试 ]** 新建针对 `parseExcelService` 的 Node 解析单元测试。喂给不同的畸形 Excel 以及含正确 Sheet('资产负债表', '利润表', '现金流量表') 的样板文件，确保严格的边界容忍与类型断言。
- [x] **2. [ 实现 ]** 为 Electron 扩展 IPC 方法 `invoke:excel:parseLocal` 与 `saveAnalyPrompt`。突破 Electron GUI 沙盒限制，采用 `ArrayBuffer` 作为通信载体进行 Node.js 原生的 `xlsx` 解析。
- [x] **3. [ 实现 ]** 建立 `analysisService.ts`，内置 4 套细分分析角色的组合映射（中立审计、价值投资、经营管理、信贷风控）。现重构该方法接收前端定制透传的 `prompt` 组合。
- [x] **4. [ 实现 ]** 主进程注册 `invoke:llm:analyzeFinancials` + 三个流式推送事件，Preload 暴露多角色存储与取用的新 API API 含清理函数。
- [x] **5. [ 实现 ]** 重写 `AgenticReporting.tsx` 交互组件：左侧大面积重设“本地 Excel 拖拽加载区”，新增下拉“角色 Select 切换台”及下方极具交互包容性的“原生指令高阶设定” 抽屉，支持即刻动态篡写真正底层的发包逻辑。
- [x] **6. [ 实现 ]** 校对台新增"跳转分析"按钮，携带内存三表数据导航。
- [x] **7. [ 验收 ]** 支持断网不报错，能够顺畅将之前留存的一份“资产负债表”提取 Excel 从桌面拖入，选择不同角色、修改 Prompt 验证不同的偏好存底，运行正确并看到结构化流式打字机反馈。

---

## 5. 持续集成与质量门禁 (CI/CD Quality Gates)

为确保整个研发生命周期中 TDD 价值最大化，将在该项目中实施：

- **Git Hook**：使用 `Husky` + `lint-staged`。每次提交 (Commit) 都必须通过 `eslint` 校验并触发相关的被改动文件的 Vitest 单元测试。
- **CI 流水线 (GitHub Actions)**：
  - 代码推送到 `main` 或 `dev` 分支，执行云端全量单元和组件测试。
  - 通过 xvfb 无头模式执行 Electron Playwright 的 E2E 端到端冒烟测试。
  - 触发跨平台 (`macOS`, `Windows`, `Linux`) 的 `electron-builder` 静默打包工作流，生成 Draft Release。

---

## 6. 开发规约与最佳实践 (Development Guidelines)

1. **零状态副作用防范**：大模型接口调用的异步性很强（可能长达数分钟），必须对并发发起调用做强管控机制（如：正在生成报告中，锁定“再次发起分析”按钮）。
2. **测试数据工厂 (Test Data Factories)**：必须维护一套极其规范的、经过匿名脱敏的 `fixtures/mock-financial-json.json` 数据集，供所有组件渲染测试进行可靠的绑定验证，杜绝在测试时引入真实公司的涉密数据。
3. **安全红线**：绝不可以在渲染进程（前端代码）直接存放或暴露任何第三方大模型 SDK 的硬编码鉴权能力；必须走 Node 主进程隔离中转。
4. **统一错误拦截**：无论是图片解析异常、网络环境受限，还是 Token 余额不足，均应归一化成前端友好的 Error Boundary 弹窗（使用 UI 方案中的 Semantic 色值规范展现）。 
