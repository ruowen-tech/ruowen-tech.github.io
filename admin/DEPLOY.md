# 上海若紊科技 · Decap CMS 部署手册

本手册把「新闻 / 招聘后台」从**本地浏览器存储（localStorage）** 迁到**仓库文件（真实持久化）** 的完整上线步骤固化下来。
网站仍由 **GitHub Pages** 发布；登录认证由**自建的 Cloudflare Worker OAuth 代理**完成（免费、自托管、无第三方依赖）。

---

## 0. 架构与凭据一览

```
编辑者在浏览器打开 https://www.wonderingwall.com/admin/
        │
        ▼  点击「登录」→ 弹窗打开 <Worker>/auth
自建 Cloudflare Worker（OAuth 代理，免费层）
        │  302 跳转到 GitHub 授权页
        ▼
GitHub OAuth App（你创建的，仅做登录鉴权）
        │  回调 <Worker>/callback?code=...
        ▼
Worker 用 code 换 access_token → postMessage 回传后台弹窗
        │
        ▼  Decap 通过 GitHub API 读写仓库文件
content/news.json  ←→  content/jobs.json
        │
        ▼  仓库变更 → GitHub Pages 自动重新发布 → 全站访客可见
```

**涉及的账号 / 凭据**

| 名称 | 是什么 | 在哪用 |
|------|--------|--------|
| GitHub 账号 | 用于登录后台、写仓库 | 编辑者每人一个 |
| GitHub OAuth App | 经典 OAuth App（**不是** GitHub App） | 提供 Client ID / Client Secret 给 Worker |
| `GITHUB_CLIENT_ID` | OAuth App 公开的 Client ID | 设为 Worker 的 Secret |
| `GITHUB_CLIENT_SECRET` | OAuth App 的 Secret（敏感） | 设为 Worker 的 Secret（**不要写进代码**） |
| Cloudflare 账号 | 托管 Worker（免费层） | 部署 OAuth 代理 |
| Worker 地址 | 形如 `https://ruowen-decap-proxy.<子域>.workers.dev` | 回填到 `config.yml` 的 `base_url` |

---

## 1. 前置条件

- 已安装 **Node.js 18+**（本机已具备，`npx wrangler` 会用到）
- 拥有 **GitHub 账号**，且对 `ruowen-tech/ruowen-tech.github.io` 仓库有**写权限**
- 拥有 **Cloudflare 账号**（免费注册即可，无需绑卡）

---

## 2. 第一步：创建 GitHub OAuth App

> 入口有点隐蔽，在**账号级设置**里，不在仓库设置里。

1. 点右上角头像 → **Settings**
2. 左侧栏滚到底 → **Developer settings**
3. 点 **OAuth Apps**（注意：是它，**不是**上面的 *GitHub Apps*）
4. 点 **New OAuth App**（首次会显示 *Register a new application*）
   - 直达链接：`https://github.com/settings/applications/new`

**填表：**

| 字段 | 填什么 |
|------|--------|
| Application name | `若紊科技 Decap CMS`（随意） |
| Homepage URL | `https://www.wonderingwall.com` |
| Authorization callback URL | `https://ruowen-decap-proxy.spt-genius.workers.dev/callback`（**必须带 `/callback` 完整路径**，否则登录报 `redirect_uri_mismatch`） |
| Description | 可选，如 `Decap CMS 登录代理` |

5. 点 **Register application**
6. 页面上直接显示 **Client ID**（形如 `Ov23xxxx` 或 `Iv1.xxxx`）→ 复制备用
7. 点 **Generate a new client secret** → 生成的 **Client Secret** 只显示一次 → **立即复制保存**

> ⚠️ 若仓库属于**组织（org）**：OAuth App 建在个人账号下即可（个人账号有该仓库写权限就行）。若登录时提示组织未授权，去组织 **Settings → Third-party access** 批准该 OAuth App。

---

## 3. 第二步：部署 Cloudflare Worker（OAuth 代理）

### 3.1 安装并登录 wrangler

```bash
# 安装（只需一次）
npm i -g wrangler          # 或每次用 npx wrangler

# 登录 Cloudflare（首次会打开浏览器授权）
npx wrangler login
```

### 3.2 进入 Worker 目录

```bash
cd admin/worker
```

该目录已包含：

- `index.js` —— 零依赖代理：
  - `GET /auth`：302 跳转到 GitHub 授权页（带 `state` Cookie 防 CSRF）
  - `GET /callback`：用 `code` 换 token，经 `postMessage` 回传后台弹窗
  - 其余路径：返回健康检查文本
- `wrangler.toml` —— 配置：`name = "ruowen-decap-proxy"`、`main = "index.js"`、`compatibility_date = "2024-09-23"`

> 当前 Worker 使用 `scope=public_repo`，**适用于公开仓库**。若仓库是私有的，把 `index.js` 第 29 行的 `&scope=public_repo` 改为 `&scope=repo`。

### 3.3 设置两个密钥（不要写进代码）

每条命令单独执行，运行后会交互式提示 `Enter a secret value:`，**把对应值粘进去回车**（粘贴时不回显是正常的）。

```bash
# 填 Client ID（就是 OAuth App 页面上那串公开值）
npx wrangler secret put GITHUB_CLIENT_ID
# 提示后粘贴，例如 Ov23liW90aHanaMyMxPE

# 填 Client Secret（Generate a new client secret 生成的那个，敏感）
npx wrangler secret put GITHUB_CLIENT_SECRET
# 提示后粘贴那串只显示一次的 secret
```

> ⚠️ 不要把值直接拼在命令行后面（`wrangler secret put XXX 值` 会报错，且会让密钥进终端记录）。命令里只写 key，值在提示符后输入。
> 若担心已泄露，回 OAuth App 页 `Regenerate secret` 重新生成，再 put 一次即可。

> 🛑 **常见人为失误（已踩过）**：`secret put` 的**第一个参数是 key 名**，不是值。
> 错误示范：`wrangler secret put Ov23liW90aHanaMyMxPE` —— 这会把你的 Client ID 当成**密钥名**存进去，创建一个名为 `Ov23...` 的垃圾 secret，而真正的 `GITHUB_CLIENT_SECRET` 却没设。
> 正确做法：key 固定写 `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`，**值只在 `Enter a secret value:` 提示后粘贴**。
> 检查是否设对：`wrangler secret list` 应只看到两个名字 `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET`（不会出现以 Client ID 命名的项）。若有垃圾项，用 `wrangler secret delete <垃圾名>` 删掉。

### 3.4 部署

```bash
npx wrangler deploy
```

成功后会输出 Worker 地址，形如：
```
https://ruowen-decap-proxy.<你的子域>.workers.dev
```
记下这个地址（含 `https://`）。

> 可选：若想用自定义域名，编辑 `wrangler.toml` 取消注释 `routes` 那行并改成你的子域；同时把 OAuth App 的回调地址同步改为该域名下的 `/callback`。

---

## 4. 第三步：回填 config.yml 的 base_url

打开 `admin/config.yml`，把 `base_url` 改成真实 Worker 地址（`site_url` 用自定义域名）：

```yaml
backend:
  name: github
  repo: ruowen-tech/ruowen-tech.github.io
  branch: master          # GitHub Pages 发布源是 master（<user>.github.io 仓库只从 master 发布）
  base_url: https://ruowen-decap-proxy.spt-genius.workers.dev   # ← 已部署的真实 Worker 地址
  auth_endpoint: auth
  site_url: https://www.wonderingwall.com
```

> **分支注意**：本项目是 `<user>.github.io` 仓库，GitHub Pages **只从 `master` 发布**。Decap 会往 `branch` 指定的分支提交，所以这里必须写 `master`，否则后台改完线上不变。若你的发布源是别的分支，要么改这里，要么去仓库 **Settings → Pages** 把发布源设为对应分支。

---

## 5. 第四步：推送到仓库

确保 `admin/`、`content/` 下新增文件都已提交，并确认 `.gitignore` **没有**误忽略 `admin/worker/`（密钥走 wrangler secret，不会进仓库，可放心提交代码）：

```bash
git add admin/ content/ 
git commit -m "feat: 接入 Decap CMS + Cloudflare Worker OAuth 代理"
git push origin master
```

推送后 GitHub Pages 会自动重新构建发布。

---

## 6. 第五步：使用后台

1. 打开 `https://www.wonderingwall.com/admin/`
2. 点击「登录」→ 弹窗跳转到 GitHub → 授权该 OAuth App
3. 回到后台，左侧出现 **新闻动态 / 招聘职位** 两个集合
4. 新增 / 编辑 / 删除条目，点「Publish」保存
5. Decap 会把改动作为文件提交到 `content/news.json` / `content/jobs.json`
6. 仓库一变，GitHub Pages 重新发布，**全站访客立即看到**

---

## 7. 故障排查

| 现象 | 原因 / 处理 |
|------|------------|
| 后台打开但点登录无反应 / 报错 | `config.yml` 的 `base_url` 未改成真实 Worker 地址；或 Worker 未部署 |
| 跳转 GitHub 后报 `redirect_uri_mismatch` | OAuth App 的 **Authorization callback URL** 必须是 `<base_url>/callback` 完整路径（含 `/callback`）。裸域名会 mismatch。去 OAuth App 设置里改一致 |
| 授权后回弹窗报 `State mismatch` | 浏览器拦截了 Cookie / 跨站限制。确认 Worker 与站点均走 https，且未开过度严格的隐私拦截 |
| 登录成功但保存时报 404 / 无权限 | 登录的 GitHub 账号对该仓库无**写权限**；或 `branch` 写错（见第 4 步分支注意，应为 `master`） |
| Worker 部署报 `No account_id` | 未 `wrangler login` 或未关联 Cloudflare 账号 |
| `wrangler secret put` 报 `Unknown arguments` | 把值拼到了命令行（`pub` 之类也属拼错，正确是 `put` 且值单独输入） |
| `wrangler secret list` 出现以 Client ID 命名的 secret（如 `Ov23...`） | 误把密钥**值**当 key 执行了 `put`，真正的 `GITHUB_CLIENT_SECRET` 没设。删掉该垃圾项：`wrangler secret delete <垃圾名>`，再正确执行 `wrangler secret put GITHUB_CLIENT_SECRET` 并在提示后粘贴值 |
| 登录卡在 GitHub 授权后无反应 | 检查两个 secret 是否都设齐（`GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`）。缺 `GITHUB_CLIENT_SECRET` 时换 token 会静默失败 |

---

## 8. 安全与撤销

- **Client Secret 仅存于 Cloudflare Secrets，不进仓库、不进前端代码。**
- 前端只拿到 GitHub 颁发的**短期 access_token**（经 postMessage 回传），拿不到 OAuth App 的 Secret。
- 撤销登录能力：在 OAuth App 页删除该 App，或 `wrangler secret delete GITHUB_CLIENT_SECRET`。
- 轮换 Secret：OAuth App 页 `Regenerate secret` → 重新 `wrangler secret put GITHUB_CLIENT_SECRET`。

---

## 9. 相关文件

| 文件 | 作用 |
|------|------|
| `admin/config.yml` | Decap 配置：`github` 后端 + news/jobs 两个集合，指向 `content/*.json` |
| `admin/index.html` | Decap 后台入口页（从 CDN 加载 Decap） |
| `admin/worker/index.js` | Cloudflare Worker OAuth 代理（零依赖） |
| `admin/worker/wrangler.toml` | Worker 部署配置 |
| `content/news.json` | 新闻数据真源 |
| `content/jobs.json` | 招聘数据真源 |
| `assets/js/content.js` | 前端兜底种子 + 异步 loader（`SITE_DATA.loadNews/loadJobs`） |
