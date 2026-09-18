# 小树 · Personal Growth OS — 技术交接文档 (HANDOFF)

> 本文档由代码核查生成，所有结论均基于当前仓库实际代码（非推测）。
> 生成日期：2026-09-18。仓库路径：`xiaoshu-growth-os/`（Next.js 14 项目）。
> 更新：2026-09-18，4 项改动已提交 `67465ce` 并推送部署，已同步修订下文 §1/§3/§8/§10 中"工作树脏 / 线上旧版"的状态描述。
>
> ⚠️ **交接首要提醒（务必先读）**：截至 2026-09-18，这 4 项改动已**提交（commit `67465ce`）并推送到 GitHub `main`**，由外部平台（Vercel 类）自动构建部署——**线上运行版本应与本地一致**：11 个栏目（已无【每日待办】/【时间管理】）、箱型图每组 7 个 + Tukey 显著性字母、记账支出/收入默认收起。下一位开发者接手时请先确认线上版本确已更新；若手机 PWA 仍显示旧版，按 §7 完全关闭并重新打开 PWA，或等 Service Worker 自动更新。

---

## 1. 项目基本信息

| 项目 | 内容 | 确认依据 |
|---|---|---|
| 框架 | Next.js **14.2.18**（App Router） | `package.json` |
| 语言 | TypeScript 5.6 | `package.json` |
| 渲染 | 标准 Next 服务端构建（**非静态导出**，`next.config.mjs` 未设 `output: 'export'`；存在 `app/api` 服务端路由，需 Node 运行时） | `next.config.mjs`、`app/api/ai/route.ts` |
| 构建工具 | Next 内置（`next build`）+ Tailwind PostCSS | `package.json`、`postcss.config.mjs` |
| 样式 | Tailwind CSS 3.4 + 自建设计令牌（见 §2 / `tailwind.config.ts`） | `tailwind.config.ts`、`app/globals.css` |
| 动画 | Framer Motion 11 | `package.json` |
| 本地存储 | **Dexie 4（IndexedDB）**，库名 `xiaoshu-growth-os` | `lib/db/db.ts` |
| PWA | **是**（@ducanh2912/next-pwa 10.2.9，构建时生成 Service Worker） | `next.config.mjs`、`public/sw.js`、`public/manifest.webmanifest` |
| 手机端形态 | **PWA（可"添加到主屏幕"的 Web 应用，standalone 模式）**，非原生 App、非 Capacitor/Expo | `manifest.webmanifest`、`next.config.mjs` |
| AI | 完全**本地**内容池（`lib/ai/content.ts`），无外部 API 依赖；`app/api/ai/route.ts` 现仅返回 501 占位 | `components/ai/ai-fab.tsx`、`app/api/ai/route.ts` |

启动 / 构建命令（来自 `package.json`）：
- 开发：`npm run dev` → http://localhost:3000
- 构建：`npm run build`（= `next build`）
- 启动生产：`npm run start`
- 图标重生成（一般不需要）：`npm run gen:icons`（= `scripts/gen-icons.mjs`）

依赖说明：`package.json` **未锁定 `engines` 字段**；Next 14 要求 Node ≥ 18.17，建议显式锁定到 18.17 LTS 或 20 LTS。`package-lock.json` 已存在，次要版本用 `^` 浮动。

---

## 2. 项目目录结构与关键文件

```
xiaoshu-growth-os/
├─ app/                         # 各页面（App Router，每个目录 = 一个路由）
│  ├─ layout.tsx                # 根布局：字体、metadata、manifest 引用、挂载 AppShell
│  ├─ page.tsx                  # 【首页/今日】核心仪表盘
│  ├─ globals.css               # 全局样式 + 设计令牌(CSS 变量) + 安全区适配
│  ├─ account/                  # 【记账】
│  ├─ boxplot/                  # 【箱型图】(纯前端临时工具，不落库)
│  ├─ english/                  # 【英文阅读】
│  ├─ exercise/                 # 【运动】(内含体重/排便记录 UI)
│  ├─ experiment/               # 【实验记录】
│  ├─ gratitude/                # 【感恩日记】
│  ├─ growth/                   # 【成长回顾】
│  ├─ reading/                  # 【阅读】
│  ├─ research/                 # 【论文】
│  ├─ settings/                 # 【设置】(含 导出/导入 备份 UI)
│  ├─ api/ai/route.ts           # AI 代理占位路由，当前返回 501
│  └─ (已删除) todo/ timemgr/   # 已于 2026-09-18 提交 67465ce 删除并部署
├─ components/
│  ├─ layout/
│  │  ├─ nav-config.ts          # ★ 侧边导航唯一配置源 NAV_ITEMS（顺序固定）
│  │  ├─ sidebar.tsx            # 侧边栏（折叠/展开、active 高亮）
│  │  └─ app-shell.tsx          # 全局壳：Sidebar + main + AIFab + GlobalSearch
│  ├─ common/                   # 复用组件：page-header / fold-list / growth-track / sheet / timer / coming-soon
│  ├─ ui/                       # 基础 UI：button / card / input / textarea / label / badge / progress
│  ├─ ai/ai-fab.tsx             # 全局 AI 助手悬浮按钮 + 弹层
│  └─ search/search-dialog.tsx  # 全站搜索弹窗
├─ lib/
│  ├─ db/db.ts                  # ★ Dexie 数据库定义（表结构 + schema 版本 v1–v8）
│  ├─ db/repo.ts                # 通用 CRUD 工厂 repos.*（所有模块共用）
│  ├─ backup.ts                 # ★ 导出/导入 JSON：exportAll / importAll / downloadBackup / pickBackupFile
│  ├─ constants.ts              # SITE、TODAY_MODULES、GROWTH_MODULES
│  ├─ growth.ts                 # 成长树进度 growthStep、每日 pick 锁定（复用 settings 表）
│  ├─ summary.ts                # 各类聚合统计（时长/热力图/连续打卡/记账汇总/周期统计）
│  ├─ utils.ts                  # cn()、todayKey()、weekdayCN()、greeting() 等
│  └─ ai/content.ts             # 本地内容池（书摘/英文/文献/鼓励/复盘文案）
├─ public/
│  ├─ manifest.webmanifest      # PWA 清单
│  ├─ sw.js                     # ★ 生成的 Service Worker（构建产物，勿手改）
│  ├─ workbox-*.js              # next-pwa 运行时（构建产物）
│  ├─ swe-worker-*.js           # next-pwa 注册脚本（构建产物）
│  ├─ offline.html              # 离线兜底页
│  └─ icons/                    # icon.svg / icon-192/512.png / maskable / apple-touch-icon
├─ scripts/gen-icons.mjs        # 图标生成脚本
├─ next.config.mjs              # Next + PWA 配置
├─ tailwind.config.ts           # 设计令牌（颜色/圆角/阴影）
├─ tsconfig.json / postcss.config.mjs / components.json
└─ HANDOFF.md                   # 本文档
```

★ = 数据存储 / 导航 / 备份的**关键文件**，改动需谨慎（见 §9）。

首页：`app/page.tsx`。侧边导航：`components/layout/sidebar.tsx`（数据来自 `nav-config.ts`）。全局样式：`app/globals.css` + `tailwind.config.ts`。数据存储：`lib/db/*` + `lib/backup.ts`。备份/恢复代码：`lib/backup.ts` + `app/settings/page.tsx`。

---

## 3. 全部功能模块（以真实代码为准）

> 导航顺序由 `components/layout/nav-config.ts` 的 `NAV_ITEMS` 固定，共 **11 个栏目**（【每日待办】/【时间管理】已于 2026-09-18 提交 `67465ce` 删除并部署）。

| # | 栏目 | 路由 | 代码位置 | 数据表 | 关键行为 |
|---|---|---|---|---|---|
| 1 | 今日(首页) | `/` | `app/page.tsx` | `dailyTasks`、`favorite`、`exercise`、`reading`、`research`、`experiment` | 问候语；今日成长树(`GrowthTrack`+5模块自动打卡：运动/英文/论文/实验由数据驱动，阅读手动勾选 `dailyTasks`)；收藏夹(折叠)；今日专注时长(`summary.getTodayDuration`)；近7天习惯热力图(`summary.getHeatmap`) |
| 2 | 运动 | `/exercise` | `app/exercise/page.tsx` | `exercise`、`weight`、`bowel` | 运动记录(项目/时长/备注)；**体重折线图**(`WeightChart`，`weight` 表)；**排便记录**(`bowel` 表) — 注意体重/排便UI嵌在运动页内 |
| 3 | 记账 | `/account` | `app/account/page.tsx` | `account` | 收入/支出记录，按月日历，文本抽金额(`extractAmount`)，树苗可视化(`BASELINE=30000`)；支出/收入列表默认收起(`FoldList` 的 `startCollapsed`+`startCollapsedShowAll`) |
| 4 | 箱型图 | `/boxplot` | `app/boxplot/page.tsx` | **无（不落库）** | 纯前端临时工具：10 固定分组 × **7 个输入**(`SLOTS=7`)；箱线图 + 均值±SD 柱形误差棒图 + 柱顶 **Tukey–Kramer HSD 显著性字母**（页面内实时计算，无外部统计库）；刷新即清空 |
| 5 | 阅读 | `/reading` | `app/reading/page.tsx` | `spark`、`favorite`(type=book) | 每日书摘(`BOOK_POOL` 本地池，按日锁定)；灵光笔记(`spark`)；收藏 |
| 6 | 英文阅读 | `/english` | `app/english/page.tsx` | `english`、`favorite`(type=english) | 每日英文短文(`ENGLISH_POOL`)；收藏 |
| 7 | 论文 | `/research` | `app/research/page.tsx` | `research`、`literature`、`favorite`(type=paper) | 论文写作计时(`research`，含 `Timer` 组件)；文献摘录(`literature`，`LITERATURE_POOL`)；收藏 |
| 8 | 实验 | `/experiment` | `app/experiment/page.tsx` | `experiment` | 实验记录（单一自由文本框 `note`，含搜索）；跨月完整保留 |
| 9 | 感恩日记 | `/gratitude` | `app/gratitude/page.tsx` | `gratitude` | 感恩内容(`content`) |
| 10 | 成长回顾 | `/growth` | `app/growth/page.tsx` | 读取全部表（实时聚合） | 周/月统计(`summary.getPeriodStat`)；AI 复盘文案(`REVIEW_OPENERS`)；**`GrowthReport` 表已声明但从未写入**（死代码，见 §10） |
| 11 | 设置 | `/settings` | `app/settings/page.tsx` | `settings` | 数据备份导出/导入；AI 配置(`settings` 表 key=`aiProvider`) |

**全局功能（不在导航菜单内）：**
- **小树 AI 助手** `components/ai/ai-fab.tsx`：4 个动作（鼓励文案/习惯分析/学习计划/总结笔记），全部来自本地内容池 `lib/ai/content.ts`，**不联网**；`app/api/ai/route.ts` 仅返回 501 占位（二期真实模型接口预留）。
- **全站搜索** `components/search/search-dialog.tsx`：跨 8 张表搜索（exercise/reading/research/literature/experiment/gratitude/english/spark）。
- **收藏** `favorite` 表：跨模块（book/english/paper 三类），首页与各页均可见，可删除。

**已删除但数据仍在（详见 §10）：** `todo`、`timeThread`、`timeCell`、`timeMerge` 四个表的数据仍存于 IndexedDB 且仍被备份，但查看/恢复 UI 已不存在（页面与导航已于 2026-09-18 提交 `67465ce` 删除）。

---

## 4. 数据存储机制（最高优先级）

### 4.1 唯一用户数据存储 = IndexedDB（经 Dexie）

- **没有任何 `localStorage` / `sessionStorage` 用户数据。** 全仓库 `grep` 仅在 `node_modules` 的类型声明里出现这些关键字，业务代码零使用。所有用户数据都在 IndexedDB。
- 数据库名：`xiaoshu-growth-os`（见 `lib/db/db.ts` 中 `super("xiaoshu-growth-os")`）。
- 访问层：`lib/db/repo.ts` 的 `repos.*`（通用 CRUD），各页面通过 `repos.xxx` 读写。

### 4.2 表结构（来自 `lib/db/db.ts` 接口定义）

| 表名 | 主键 | 关键字段 | 说明 |
|---|---|---|---|
| `dailyTasks` | ++id | date, key, done | 今日待办勾选状态 |
| `exercise` | ++id | date, project, duration, note | 运动记录 |
| `reading` | ++id | date, book, duration, feeling | 阅读记录 |
| `english` | ++id | date, title, content | 英文阅读 |
| `research` | ++id | date, duration, summary | 论文写作 |
| `literature` | ++id | date, title, journal, excerpt, cnSummary, findings, vocab[] | 文献 |
| `experiment` | ++id | date, note(新版自由文本) | 实验 |
| `gratitude` | ++id | date, content | 感恩 |
| `spark` | ++id | date, text | 灵光笔记(阅读页) |
| `weight` | ++id | date, value, note | 体重(运动页内) |
| `bowel` | ++id | date, note | 排便(运动页内) |
| `favorite` | ++id | type, key, title, excerpt, zh, date | 收藏(book/english/paper) |
| `growth` | ++id | period, type, data | **已声明但从未写入** |
| `settings` | ++id | key, value | 元数据存储：`growthStep`(成长树进度)、`aiProvider`、`daily:*`(每日内容锁定)等 |
| `account` | ++id | date, type(income/expense), amount, note | 记账 |
| `timeThread` / `timeCell` / `timeMerge` | ++id | 见 db.ts | **已删模块的孤儿表，数据与备份仍在** |
| `todo` | ++id | date, text, done, order | **已删模块的孤儿表，数据与备份仍在** |

### 4.3 Schema 版本历史（`lib/db/db.ts` 构造函数）

```
v1: dailyTasks, exercise, reading, english, research, literature, experiment, gratitude, growth, settings
v2: + spark
v3: + weight, bowel
v4: + favorite (声明)
v5: + favorite (再次声明，等同 v4)
v6: + account
v7: + timeThread, timeCell, timeMerge
v8: + todo
```
⚠️ **Dexie 的 schema 是累积且"声明即存在"的**：当用户打开比本地库更高版本的 schema 时，Dexie 会按版本链重建对象存储。**若某 `version(N).stores({})` 块中删除了一个表，该表在新版本中不会被创建，旧数据随之丢失。** 因此 `todo`/`timeThread`/`timeCell`/`timeMerge` 的声明块**必须保留**（见 §9、§10）。

### 4.4 其他存储机制

- **Cache Storage**：由 Service Worker（`public/sw.js`，next-pwa 生成）使用，**仅缓存构建静态资源与导航 HTML，不存用户数据**。
- **Service Worker / 离线**：见 §7。
- **文件存储**：无。应用不读写任何本地文件（除浏览器下载的备份 JSON）。
- **Cookie / 服务端会话**：无。纯前端 + 本地 IndexedDB，无账号系统。

### 4.5 ⚠️ 哪些操作会导致用户数据丢失

1. **清除站点数据 / 卸载 PWA / 浏览器"清除浏览数据"** → IndexedDB 被清空，数据永久丢失（除非有 JSON 备份）。
2. **更换源(origin)**：改域名、改端口、http↔https、换部署地址 → 浏览器为该 origin 新建空 IndexedDB，旧数据不可见（旧源数据本身未删，只是新源取不到）。
3. **导入一个不完整的 version=1 备份**（`importAll` 行为，见 §6）：会先 `clear` 再 `bulkAdd`，缺表/空表会把现有对应表清空。
4. **升级 DB schema 时移除某表的声明块**：该表 object store 被删（见 §4.3）。
5. **浏览器存储配额/隐私模式淘汰**：IndexedDB 可能被浏览器在存储紧张时回收（少见但存在）。

---

## 5. 手机与电脑的数据关系

- **数据按 origin（源）严格隔离**。以下每一种环境都拥有**各自独立**的 IndexedDB 实例，互不互通：
  - 手机浏览器（Chrome/Safari）普通访问
  - 手机"添加到主屏幕"的 PWA
  - 电脑浏览器
  - 不同浏览器（Chrome vs Safari vs Edge）
  - 同一浏览器的不同"用户/个人资料"
  - 不同域名 / 端口 / 协议(http vs https)
- **同一浏览器 + 同一 origin** 下，PWA 与普通网页**共享同一份 IndexedDB**（PWA 安装只是多一个入口，数据同源）。
- **更换域名/端口/部署地址/协议后**：旧数据仍在旧源，新源是空库。要迁移必须靠 **JSON 导出(旧源) → 导入(新源)**（见 §6）。
- **卸载/重装 PWA、清除站点存储**：等于删除该 origin 的 IndexedDB，数据丢失。
- 本应用**没有** localStorage 用户数据，因此"换域名后 localStorage 是否还在"这个问题不适用——所有数据都在 IndexedDB，遵循上述 origin 隔离规则。

---

## 6. 备份与恢复系统

### 6.1 实现位置（文件与函数）

- `lib/backup.ts`：
  - `exportAll(): Promise<string>` — 遍历 `TABLE_NAMES`（19 张表），`toArray()` 收集全部行，组装 `{ version:1, app:"xiaoshu-growth-os", exportedAt, tables:{...} }`，`JSON.stringify(...,2)`。
  - `importAll(json): Promise<void>` — `JSON.parse` → 校验 `version===1`（否则抛"不支持的备份版本"）→ **对每张表先 `table.clear()` 再 `bulkAdd(rows)`**。
  - `downloadBackup(json)` — 建 `Blob` → `URL.createObjectURL` → 临时 `<a download>` → `click()` → `remove()` → **立即 `URL.revokeObjectURL(url)`**。
  - `pickBackupFile()` — 建 `<input type="file" accept=".json">` → `FileReader.readAsText`。
- `app/settings/page.tsx`：导出按钮调 `exportAll()`+`downloadBackup()`；导入按钮先 `pickBackupFile()`，再 `window.confirm("导入将覆盖当前所有本地数据…")` 确认后 `importAll()`。

### 6.2 导出的 JSON 理论内容

根结构：`{ version:1, app:"xiaoshu-growth-os", exportedAt:ISO时间, tables:{...} }`。
`tables` 包含 19 张表的全部行：`dailyTasks, exercise, reading, english, research, literature, experiment, gratitude, spark, weight, bowel, favorite, growth, settings, account, timeThread, timeCell, timeMerge, todo`。
即**全量用户数据**（含已删模块的孤儿数据、settings 里的成长树进度与 AI 配置）。

### 6.3 ⚠️ 为什么 Android 手机端点击"导出"后可能找不到 .json 文件（仅分析，未修改）

源码 `downloadBackup` 流程：`Blob` → `createObjectURL` → 临时 `<a download>` → `click()` → `revokeObjectURL` **立即同步调用**。可能原因：

1. **程序化 `<a download>` + blob: URL 在 Android 上被静默拦截**：在 PWA（standalone/WebAPK）或某些 WebView 中，代码触发的下载可能被忽略，或改为"在新标签页打开 JSON 文本"而非保存文件 → 文件管理器看不到下载项。
2. **`URL.revokeObjectURL(url)` 在 `click()` 之后立即同步执行**：部分 Android 机型/浏览器在 blob 尚未被读取完就 revoke，导致下载被取消或生成 0 字节文件 → 找不到有效文件。这是经典的"撤销竞态"。
3. **`download` 属性对 blob: URL 被忽略**：某些浏览器忽略该属性，直接导航打开 JSON，用户误以为没有下载。
4. **无降级方案**：没有"复制到剪贴板 / 显示文本弹层 / Web Share API / File System Access"兜底，失败时无任何提示。
5. **文件其实落地到系统 Download 目录，但部分厂商文件管理器不刷新或不易定位**。
6. **在微信/QQ 等 App 内置浏览器中打开**：下载通常被禁用。

> 按你的要求，此处**只分析原因、不做修改**。建议（供下一位开发者）：`revokeObjectURL` 改为 `setTimeout` 延迟、失败时改用 `navigator.share` 或展示文本框/复制按钮兜底。

---

## 7. PWA / 手机相关配置

- **Manifest**：`public/manifest.webmanifest` — name "小树 · Personal Growth OS"、short_name "小树"、`display: standalone`、`orientation: portrait`、`start_url: /`、`scope: /`、theme/background `#F7F8FA`、icons（svg/png/maskable/apple-touch）。根布局 `app/layout.tsx` 已通过 `metadata.manifest` 引用，并设 `appleWebApp`。
- **Service Worker**：由 `@ducanh2912/next-pwa` 在 `next build` 时生成到 `public/sw.js`（及 `workbox-*.js`、`swe-worker-*.js`）。**这些是构建产物，禁止手改**；改逻辑后需重新 `next build`。
- **缓存策略**（`next.config.mjs` 配置）：`register:true`、`cacheOnFrontEndNav:true`、`aggressiveFrontEndNavCaching:true`、`reloadOnOnline:true`、`disableDevLogs:true`、`disable` 在开发环境。
- **SW 行为**：生成的 `sw.js` 执行 `self.skipWaiting()` + `self.clientsClaim()`，对构建资源做 precache（按 build id 版本化），并对前端导航做运行时缓存；另含 `public/offline.html` 离线兜底。
- **⚠️ 部署新版本后手机 PWA 可能短暂用旧版**：新 SW 安装后 `skipWaiting`+`clientsClaim` 会接管，且 `reloadOnOnline` 在恢复联网时触发刷新，通常最终会更新；但存在"旧版窗口期"——用户重开 PWA 时可能先读到 Cache Storage 里的旧 HTML/JS，需**完全关闭再打开 PWA** 或等 SW 周期更新才生效。建议下一位开发者考虑加"发现新版本"提示，或调整 `aggressiveFrontEndNavCaching`。

---

## 8. 部署方式

- **构建命令**：`npm run build`（= `next build`）。输出到 `.next/`（标准 Next 服务端构建，需 Node 运行时，**非静态导出**）。
- **本地预览**：`npm run dev`（localhost:3000）/ `npm run start`（生产模式）。
- **PWA 资源**：`next build` 时由 next-pwa 自动生成进 `public/`（sw.js / workbox / swe-worker）。
- **Git 远端**：`origin = https://github.com/shuhan131313-jpg/xiaoshu-growth-os.git`（分支 `main`）。
- **部署平台 / 域名 / 分支设置**：仓库内**无 `vercel.json`、无 `.github/` workflows**，因此部署目标（如 Vercel）与域名、构建分支等配置在**平台侧（如 Vercel 控制台）**，**无法从代码确认**。可确认的是：源码推送到 GitHub 后由外部 CI/CD 自动构建部署。
- **当前运行版本**：线上与本地均已更新至提交 `67465ce`（2026-09-18，含 4 项改动：删待办/时间管理、箱型图每组 7 个+Tukey 显著性字母、记账默认收起）。平台自动部署后手机即生效（若 PWA 仍显示旧版见 §7）。
- **部署无需密钥/环境变量**：AI 当前完全本地；设置里填的 API Key 仅存本地 IndexedDB，不在部署环境。二期启用真实模型时才需配置密钥。

---

## 9. 接手开发注意事项

### 可以安全修改（不影响现有用户数据）
- `app/<模块>/page.tsx` 的 UI 与业务逻辑（**只要不改 `lib/db/db.ts` 的表结构**）。
- `components/`（UI 组件）、`components/common/*`、`lib/ai/content.ts`（内容池）、`lib/utils.ts`、`lib/summary.ts`（只读聚合，注意别改返回结构契约）、`tailwind.config.ts`、`app/globals.css`。

### 不可随意修改 / 改动前务必谨慎
- **`lib/db/db.ts` 的 `version(N).stores({})` 块**：移除某表声明 = 升级时该表被删 = 丢数据。**`todo`/`timeThread`/`timeCell`/`timeMerge` 的声明块即便页面已删也必须保留**，否则老用户这些表里残留的数据会随下次 DB 打开而丢失。
- **`lib/backup.ts` 的 `TABLE_NAMES`**：移除某表名 = 导出/导入不再包含它 = 导入后该表被 `importAll` 清空。要保留老数据就必须保留这些名字（含上述孤儿表）。
- **`settings` 表的 key 语义**：`growthStep`(成长树进度)、`aiProvider`、`daily:*`(每日内容锁定) 都存这里；改字段结构需做迁移。
- **`next.config.mjs` 的 PWA 配置**：影响缓存与更新行为（见 §7）。
- **`public/sw.js` / `workbox-*.js` / `swe-worker-*.js`**：构建产物，**禁止手改**；改完逻辑后跑 `next build` 重新生成。

### 怎样改 UI 而不影响现有用户数据
UI 改动只要不碰 `lib/db/db.ts` 的 schema、`lib/backup.ts` 的 `TABLE_NAMES`、`settings` 的 key 语义，就不会影响数据。新增字段请设为**可选**（如 `field?: type`），保持向后兼容。

### 怎样发布新版本而不让手机端已有数据丢失
1. **发布前提醒用户先"设置 → 导出备份"**（且因数据按源隔离，每个设备/浏览器分别导出）。
2. **只增表、不删表、不改已有字段名**；新字段用可选类型。
3. **所有数据表保持在 `TABLE_NAMES` 中**（含孤儿表）以保全老数据。
4. 部署后提醒用户**完全关闭并重新打开 PWA**（或等其自动更新）以加载新 Service Worker。
5. 不要手动删除 `public/sw.js` 等产物或改动 DB schema。

---

## 10. 当前已知问题 / 技术债

1. **📱 手机端 JSON 导出可能"找不到文件"**：Android 上 `downloadBackup` 的 blob 下载 + 立即 `revokeObjectURL` 存在竞态/被拦截风险（详见 §6.3，尚未修复）。
2. **`importAll` 先 `clear` 后 `bulkAdd`**：导入一个部分/空 version=1 文件会清空现有对应表；建议增加"导入前自动备份 + 逐表校验 + 失败回滚"。
3. **孤儿数据**：`todo`/`timeThread`/`timeCell`/`timeMerge` 表仍在 IndexedDB 与备份中，但无 UI 查看/恢复（页面已删）。数据未丢，但用户看不到。
4. **死代码**：`GrowthReport` 表已声明但全项目无写入调用（成长回顾用实时 `getPeriodStat`）；易与真实存储混淆。
5. **PWA 更新窗口期**：用户可能短暂使用旧版（见 §7）。
6. **无自动化测试、无仓库内 CI 配置**（部署由平台侧完成）。
7. **无 `engines` 锁定 Node 版本**；依赖次要版本用 `^` 浮动（但 `package-lock.json` 存在，可锁定）。
8. **无 `.env` / 无外部 API Key 依赖**：当前部署无需任何密钥；二期启用真实 AI 模型时才涉及密钥管理。
9. **（已解决）工作树脏问题**：2026-09-18 已将 4 项改动提交为 `67465ce` 并推送，平台自动部署；接手时确认线上已更新即可。

---

## 给下一位开发者的最短接手说明（10–20 行）

1. **这是什么**：Next.js 14 + TS + Tailwind 的**个人成长 PWA**，数据全在 **IndexedDB（Dexie，库名 `xiaoshu-growth-os`）**，无后端、无账号、AI 完全本地。
2. **跑起来**：`npm install` → `npm run dev`（localhost:3000）；构建 `npm run build`；**不可用静态导出**（需 Node 运行时）。
3. **导航/页面**：菜单在 `components/layout/nav-config.ts` 的 `NAV_ITEMS`（11 栏），页面在 `app/<模块>/page.tsx`。
4. **数据层**：表结构+版本在 `lib/db/db.ts`，CRUD 在 `lib/db/repo.ts`，**千万别删 `version(N).stores` 里的任何表声明**（删=丢数据）。
5. **备份**：`lib/backup.ts`（导出/导入 JSON），`TABLE_NAMES` 里的表名也别删。
6. **PWA**：next-pwa 生成 `public/sw.js` 等，**是构建产物勿手改**；部署后手机可能短暂用旧版，需重开 PWA。
7. **✅ 4 项改动已于 2026-09-18 提交 `67465ce` 并部署**（删待办/时间管理、箱型图每组 7 个+Tukey、记账默认收起）；接手时确认线上已更新。
8. **已知大坑**：Android 导出 JSON 可能找不到文件（`downloadBackup` 的 blob 竞态，未修）；导入会先清空再写，注意备份。
9. **改 UI 安全**；改 schema/备份表名/settings key 要谨慎并做兼容。
10. **部署**：源码推 GitHub(`shuhan131313-jpg/xiaoshu-growth-os`)→ 平台(Vercel 类)自动构建；域名/平台设置在控制台，**代码里看不到**。
