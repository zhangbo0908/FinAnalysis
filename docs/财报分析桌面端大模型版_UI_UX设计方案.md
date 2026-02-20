# 财报分析桌面端 (大模型版) UI/UX 设计方案

> **文档状态**：Release
> **更新日期**：2026-02-20
> **设 计 师**：全栈数字化专家 (Antigravity & ui-ux-pro-max)
> **关联文档**：`财报分析软件PRD.md`、`财报分析离线桌面端架构演进(大模型版).md`

为了适配从“本地重度深度学习”向“轻量级大模型驱动 (Thin-Client)”的技术演进，本方案基于专业 UI/UX 规则库进行了全面重构。设计融合了财务软件的**严谨专业感**与 AI 工具的**前卫智能感**，核心目标是提升效率、保障无障碍交互 (Accessibility) 并消除用户在 AI 异步推理时的焦虑。

---

## 1. 设计理念与视觉系统 (Design Philosophy & Visual System)

### 1.1 设计语言风格
- **Minimalism (极简主义)**：剥离多余装饰，让财报数据与大语言模型 (LLM) 推演的 Markdown 报告成为绝对的视觉焦点。
- **Glassmorphism (轻微拟玻璃化)**：边栏与系统设置采用半透明高斯模糊材质（backdrop-blur），融入原生 MacOS/Windows 桌面设计，提升单机客户端的“原生沉浸感”。

### 1.2 色彩与对比度规范 (Color & Contrast Palette)
遵循 `CRITICAL` 级的无障碍 (Accessibility) 标准（**至少 4.5:1 的文本对比度**），构建清晰的信息层级：
- **主色调 (Primary)**：`#18181B` (Zinc-900) 配合明亮的深邃蓝 `#2563EB` (Blue-600) 作为大模型生成状态和主要行动按钮 (CTA)。
- **背景与表面 (Background & Surface)**：
  - **Light 模式**：主背景 `#FAFAFA`，玻璃态卡片背景需使用 `#FFFFFF/80` 或更高不透明度。浅色模式不可使用 `#94A3B8(slate-400)` 作为正文，需采用 `#0F172A(slate-900)`，次要文本至少 `#475569(slate-600)`。边框使用 `border-gray-200` 增强可见度。
  - **Dark 模式**：主背景 `#09090B`，面板背景 `#18181B`，淡灰色描边 (1px border-white/10)。
- **情绪语义色 (Semantic)**：
  - AI 成功/校验通过：`#10B981` (Emerald-500)
  - Token 消耗警告/API 报错：`#EF4444` (Red-500)
  - 异步处理中 (VLM/LLM 处理)：`#A855F7` (Purple-500，带平滑 `opacity` 和 `transform` 呼吸动效)。

### 1.3 字体排版与图标规范 (Typography & Iconography)
- **界面常规字体**：主推 `Inter` 配合系统默认无衬线字体。行高配置为 `1.5 - 1.75` 提升阅读性。移动/小屏视窗最低字号维持 `16px`。
- **财务数字呈现**：严格使用**等宽字体 (Monospace)**（如 `JetBrains Mono` 或 `Roboto Mono`），确保表单中财务数据与纵向小数点完美对应齐整。
- **图标原则**：**禁止使用 Emoji 作为 UI 控件图标**。全面采用 SVG 格式图标库 (推荐 `Lucide` / `Heroicons`)，维持固定的 viewBox 且尺寸一致 (如 `w-6 h-6`)。

---

## 2. 客户端信息结构与导航 (Information Architecture)

大屏端采取**左侧静态导航栏 (Sidebar) + 右侧动态工作区 (Main Canvas)**，避免传统阻断式弹窗。

### 2.1 全局侧边栏 (Sidebar - 宽度 240px)
- **顶部区**：App Logo 与版本标识。
- **主导航菜单**：
  - 📄 财报导入与多模态解析 (Import & Parse)
  - 🔍 结构化数据双屏校对 (Data Verification)
  - 📈 智能报告推演生成 (Agentic Reporting)
- **底部常驻区**：
  - 💵 API 计费预估（动态展示 Token 用量）
  - ⚙️ 系统设置 (配置大模型 Provider、API Key、指定模型型号与测试网络连通性)

---

## 3. 核心大模型功能工作台详设 (Core Feature Views)

### 3.1 VLM 财报预处理与导入台 (Import)
**用户目标：** 极速拖入 PDF，驱动底层视觉语言模型 (VLM) 开始切片与识别。
- **布局/交互**：大面积虚线拖拽区。鼠标悬停时边框高亮，触发 `transition-colors duration-200` 平滑反馈，拒绝会导致布局抖动 (Layout Shift) 的缩放形变动效。
- **状态感知**：文件导入瞬间激活显性的步骤条 (Stepper) / 进度横向卡片，防止异步内容呈现跳动 (Content Jumping)。加载执行时按钮应呈现禁用态 (disabled)。
- **精细化挑选**：切图完成后，提供带有勾选框的图片缩略图网格。支持“全选/取消全选”，帮助用户剔除无关附页，极大减少请求耗时与计算成本。

### 3.2 结构化数据双屏校对台 (Split-View Data Verification)
**用户目标：** 核实大模型（如 GPT-4o）提取 JSON 财报（三大表）的准确度，手工微调并导出 Excel。
- **布局形态**：左右 Split View 对齐排列。左侧为 PDF 切片原图，右侧为虚拟长列表 (Virtual Scrolling) 渲染的高密度电子表格。
- **交互规范 (Interaction CRITICAL)**：
  - **联动高亮 (Linked Hover)**：鼠标悬停右侧对应数据格时，左侧图层联动高亮，大幅减缓眼动疲劳。一切交互元素强制带 `cursor-pointer`。
  - **键盘无障碍导航 (Keyboard Nav)**：Tab 序列和视图顺序严格匹配，可聚焦元素保证有明显的 `focus-ring` (焦点光环)。双击表格直接激活行内 Input。
  - **表格可访问性**：大模型结构化的原始数据必须保留 `<label>` / `<th scope="col">` 等语义，为读屏软件提供备用支持。

### 3.3 智能报告发电机 (Agentic Reporting)
**用户目标：** 将三大表数据投喂大模型，获取五维度专业财务分析报告（偿债/盈利/营运/现金流/综合评价）。
- **布局形态**：左右分屏。左侧为数据源概览面板（三张卡片展示资产负债表/利润表/现金流量表的行数与加载状态），右侧为 Markdown 流式渲染区。
- **四态状态机 UI**：
  - **空态**：居中引导卡片，提示用户先完成数据提取。
  - **就绪态**：数据已加载，底部高亮"开始分析 ✨"按钮。
  - **流式输出中**：按钮变禁用态"分析中..."，顶部出现紫色呼吸动效进度条 (`animate-pulse`)，右侧 Markdown 逐 token 渲染（`react-markdown` + `remark-gfm`），末尾闪烁光标模拟打字机效果。
  - **完成态**：按钮变为"重新分析 🔄"，报告全文可滚动浏览。
- **数据传递**：校对台通过 `react-router` state 携带三表 JSON 数据跳转至报告页，无需二次加载。
- **流式通信架构**：主进程通过 `event.sender.send()` 推送 chunk 事件给渲染进程，Preload 暴露 `onAnalysisChunk` / `onAnalysisDone` / `onAnalysisError` 事件监听器（均返回清理函数防止内存泄漏）。
- **导出操作条**：浮动悬停操作栏需配置在安全间距（例如 `top-4 right-4` 避免贴顶），Z-index 管理在 50，以保持层级有序 (10, 20, 30, 50 尺度)。

### 3.4 密钥与系统安全中心 (Settings Center)
**用户目标：** 录入私钥 (API Key / Base URL) 且建立安全信任感。
- **呈现形式**：左底栏唤起的全屏模态框带高斯模糊 (Backdrop Modal)，或右滑抽屉 (Drawer)。
- **交互设计**：
  - 表单错误反馈就近展现 (Clear error messages near problem)。
  - 输入框必须搭配清晰的 `<label htmlFor="apiKey">` 标签。
  - **连通性测试**：提供轻量级的“测试网络探测”按钮，无须保存即可实时反馈连通状态。

---

## 4. 大模型专属的交互及效能优化 (LLM/VLM UX Focus)

1. **消除 API 异步焦虑状态机**：
   网络 I/O 耗时无法绝对预期。引入精细具象的状态条（例如：`图像切割中...` -> `请求大模型抽取三表...` -> `校验表单结构中...`），拒绝用单一菊花图 (Spinner) 敷衍用户。必须为按钮提供耗时反馈（不可点击态）。
2. **可视化 Token 消耗成本透明**：
   提取与总结操作周围附着轻量 Badge: `(预估: $0.05 - 120k Tokens)`，迎合单机版自持 API Key 的财务成本控制心理。
3. **响应式与无障碍保底**：
   考虑偶尔的小屏显示或视穿戴场景，添加 `<meta name="viewport" content="width=device-width, initial-scale=1">`。必须尊重设备系统的 `prefers-reduced-motion` 设置，关闭一切非必要的动效。动效区间严格控制在 150ms-300ms 间，并仅作用于 `opacity` 与 `transform`。

---

## 5. 前端实施标准技术栈 (Front-End Toolchain)

- **框架基座**：React 18+ / Next.js，搭配 Tailwind CSS (采用原子化优先策略)。
- **UI 积木库**：**shadcn/ui** (基于 Radix UI，天生符合前述的 A11y 与键盘支持)。
- **长列表性能**：考虑到财报数据长尾特征，使用 `@tanstack/react-table` 集成虚拟滚动 (Virtualization) 防止 DOM 节点爆炸。
- **文件导出引擎**：利用 `exceljs` 在浏览器/Node层直接按 JSON 数据打分多 Sheet 工作簿。
