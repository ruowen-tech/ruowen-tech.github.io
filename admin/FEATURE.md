# 后台内容管理系统（Decap CMS）功能说明

> 配套文档：`DEPLOY.md`（部署操作手册）。本文档记录功能设计、架构与踩坑记录。

## 1. 功能概述

为「上海若紊科技有限公司」官网提供可视化内容后台，用于管理两类内容：

- **新闻动态** → `content/news.json`
- **招聘信息** → `content/jobs.json`

运营人员无需接触 Git，登录后台即可增删改，保存后 Decap CMS 自动向仓库提交，GitHub Pages 重新构建即生效。

## 2. 架构

```
GitHub Pages (master 分支, 自定义域名 www.wonderingwall.com)
├── 公开站点      index/about/products/contact/news/recruit.html
├── 内容真源      content/news.json, content/jobs.json
└── 后台          admin/index.html  +  admin/config.yml   (Decap CMS 前端)
                        │
                        │ 登录鉴权（github 后端需要服务端 OAuth 回调）
                        ▼
            Cloudflare Worker OAuth 代理  (ruowen-decap-proxy)
                        │
                        │ 自定义域名 decap.wonderingwall.com（国内直连）
                        ▼
                  GitHub OAuth App「若紊科技 Decap CMS」
```

- **Decap CMS 前端**：`admin/index.html`（从 unpkg CDN 加载 3.3.3），自动读取同目录 `config.yml`。
- **数据存储**：两个 `files` 集合分别指向 `content/news.json`、`content/jobs.json`。
- **登录鉴权**：Decap 的 `github` 后端要求服务端完成 OAuth 回调，因此必须有一个中间代理。

## 3. 登录鉴权方案（关键决策）

### 为什么需要代理

Decap CMS 的 `github` 后端在登录时需要一个**服务端 OAuth 回调端点**来完成 `code → token` 交换，浏览器端的纯静态页面做不了。原官方方案是 Netlify Identity + Git Gateway，但该服务已于 **2025-02-28 废弃**，故改用 **Cloudflare Worker 自建 OAuth 代理**。

### 代理工作流程

1. 后台点 "Login with GitHub" → 弹窗打开 `base_url` 的 `auth_endpoint`。
2. Worker `/auth` 302 跳 GitHub 授权页（带 `client_id` + `redirect_uri=<base_url>/callback`）。
3. 用户授权后 GitHub 回调 `/callback`，Worker 用 `client_secret` 换 `access_token`。
4. Worker 通过 `postMessage` 把 token 回传给 Decap 弹窗，登录完成。

### 域名选择（踩过坑，见第 4 节）

- 代理最初部署在 `*.workers.dev`（Cloudflare 免费子域），但**国内直连不可达**。
- 最终迁到自定义域名 **`decap.wonderingwall.com`**（DNS 迁到 Cloudflare 后绑定），国内直连可用。

## 4. 已知问题与解决

### 问题 1：`*.workers.dev` 国内不可达 → 登录弹空白页

- **现象**：点击 "Login with GitHub" 后弹出空白页，不跳转。
- **根因**：Decap 弹窗加载 `ruowen-decap-proxy.spt-genius.workers.dev`，而该域名在大陆直连超时（翻墙才通），弹窗加载失败即停空白。
- **解决**：把 `wonderingwall.com` 的 DNS 迁到 Cloudflare，给 Worker 绑定自定义域名 `decap.wonderingwall.com`，`config.yml` 的 `base_url` 改为该域名。

### 问题 2：Worker 误绑全域名 → 官网整站宕机

- **现象**：`www.wonderingwall.com`、`wonderingwall.com`、内页全部跳 GitHub 登录页，官网打不开。
- **根因**：在 Cloudflare 给 Worker 加了匹配根域名全量的路由（如 `wonderingwall.com/*`、`*.wonderingwall.com/*` 或漏写 `*` 的 `wonderingwall.com/`），流量被 Worker 全部截走。
- **解决**：
  - Cloudflare 区 → **Workers Routes** 删除所有指向 `ruowen-decap-proxy` 的路由（尤其全量/根路径路由）。
  - Worker → **Settings → Domains & Routes** 仅保留自定义域名 `decap.wonderingwall.com`。
  - DNS 确认 `www → CNAME → ruowen-tech.github.io`（GitHub Pages）已恢复。
- **经验**：OAuth 代理只应通过**自定义子域**生效，绝不能把路由挂到根域名或 `www`。

### 问题 3：根路径 `/` 残留路由

- **现象**：内页、admin、子域均正常，唯独首页 `/` 仍跳 GitHub。
- **根因**：存在一条只匹配根路径（漏写 `/*`）的 Worker Route。
- **解决**：删除该根路径路由即可，无需动其他配置。

### 问题 4：后台入口公开暴露

- **现象**：导航栏与页脚均有「后台管理」链接，任何人可见。
- **解决**：移除 6 个公开页面的导航栏与页脚链接（共 12 处），后台仅保留可凭 URL 直接访问（隐藏而非删除）。
- **进一步加固建议**：在 `decap.wonderingwall.com` 前加 **Cloudflare Access**（指定账号/邮箱才能进），避免固定路径被猜到。

## 5. 关键配置现状

| 项 | 值 |
|---|---|
| 仓库 | `ruowen-tech/ruowen-tech.github.io` |
| 发布分支 | `master` |
| 站点域名 | `www.wonderingwall.com`（CNAME → GitHub Pages） |
| 后台地址 | `https://www.wonderingwall.com/admin/`（入口已隐藏） |
| Decap `base_url` | `https://decap.wonderingwall.com` |
| OAuth 代理 Worker | `ruowen-decap-proxy`（Cloudflare） |
| 代理自定义域名 | `decap.wonderingwall.com` |
| GitHub OAuth App | 「若紊科技 Decap CMS」 |
| OAuth 回调地址 | `https://decap.wonderingwall.com/callback` |
| 联系邮箱 | `contact@wonderingwall.com`（Cloudflare Email Routing 转发至运营者个人收件箱） |
| 合作热线 | `+86 21 5000 0000`（已注释隐藏，待启用） |

## 6. 访问入口

- **公开站点**：`https://www.wonderingwall.com/`
- **内容后台**：`https://www.wonderingwall.com/admin/`（入口已隐藏，凭 URL 访问；登录走 `decap.wonderingwall.com` 代理，国内直连无需翻墙）

## 7. 联系邮箱配置 ✅ 已完成

- **联系邮箱**：统一为 `contact@wonderingwall.com`。
  - 此前误用 `contact@ruowen-tech.com`，但该域名无 DNS / 收信能力，实际收不到信；已全面改回自有域名 `wonderingwall.com`。
- **收信方案**：Cloudflare **Email Routing**（DNS 已迁 Cloudflare），将 `contact@wonderingwall.com` 转发至运营者个人收件箱。免费、国内可达、无需额外邮件服务商。
- **改动范围**：`index / about / products / news / contact` 共 5 个页面、9 处邮箱链接与 meta 描述，已全部替换并校验无残留（提交 `e38ce4d`）。
- **完成确认**：需向 `contact@wonderingwall.com` 发一封测试信，确认能进个人收件箱（检查 Cloudflare Email Routing 地址状态为 Active、目标邮箱已完成验证、MX/TXT 记录未被旧阿里云记录覆盖）。

## 8. 联系表单真实发信（EmailJS）✅ 已实现，待填密钥

### 背景（一个被发现的 bug）

`contact.html` 的「提交咨询」表单（`#contactForm`）原本是**纯前端假表单**：`assets/js/main.js` 只做字段校验后直接把提示框写成"提交成功"并 `form.reset()`，**全程没有任何发信动作**。访客填写的姓名/电话/邮箱/需求在浏览器里被清空丢弃，运营者**收不到任何网页提交的咨询**——且这跟 Cloudflare Email Routing 无关（路由只对直接发到该邮箱的邮件生效，表单没用它）。

### 修复方案：EmailJS（纯前端，零成本）

- `contact.html` 引入 EmailJS SDK（`@emailjs/browser@4`，jsDelivr CDN，位于 `main.js` 之前）。
- `main.js` 表单处理改为：`emailjs.send(serviceId, templateId, {name, phone, email, topic, message, reply_to}, {publicKey})`。
  - 成功 → 显示"提交成功！我们的团队会在 1 个工作日内与您联系。"并清空表单。
  - 失败 → 显示"提交失败…或直接发邮件至 contact@wonderingwall.com"。
  - 未填密钥时 → 显示"表单发信服务尚未配置，请直接发邮件至 contact@wonderingwall.com"（避免访客误以为发送成功）。
- 发信目标：`contact@wonderingwall.com`（经 Cloudflare Email Routing 转运营者个人邮箱）。`reply_to` 设为访客邮箱，便于直接回复。

### 运营者需要做的（一次性，控制台操作）

1. 注册 [EmailJS](https://www.emailjs.com/) 免费账号（200 封/月）。
2. **Email Services** 添加一个服务（如 Gmail / Outlook，或用 EmailJS 默认 Host），记下 `Service ID`。
3. **Email Templates** 新建模板，收件人填 `contact@wonderingwall.com`，正文可用变量：`{{name}}`、`{{phone}}`、`{{email}}`、`{{topic}}`、`{{message}}`，记下 `Template ID`。
4. **Account → General → API Keys** 复制 `Public Key`。
5. 把这三个值填入 `assets/js/main.js` 顶部的 `EMAILJS = { publicKey, serviceId, templateId }`（替换 `YOUR_*` 占位符）。
6. 提交推送后，在 `https://www.wonderingwall.com/contact.html` 实测：填表提交应显示"提交成功"，运营者个人邮箱收到咨询邮件。

- 提交记录：`e4074a4`（contact.html + main.js）。
- ⚠️ 密钥是公开前端可用的 Public Key，仅限发信、不可读邮件；若需更高安全，可改用 Cloudflare Worker 中转（见第 3 节代理思路）。
