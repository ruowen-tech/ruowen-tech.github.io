// =========================================================
// 上海若紊科技 · Decap CMS GitHub OAuth 代理 (Cloudflare Worker)
// 零依赖，可直接部署到 Cloudflare Workers 免费层。
//
// 协议（Decap github 后端要求）：
//   1. 后台弹窗打开 <base_url>/auth（部分版本直接打开 <base_url> 根路径）
//   2. 本 Worker 把浏览器 302 重定向到 GitHub 授权页
//   3. GitHub 回调 <base_url>/callback?code=...&state=...
//   4. 本 Worker 用 code 换取 access_token，再以 postMessage 把 token 回传给后台弹窗
//
// 部署需要以下 Secret（不要写进代码）：
//   GITHUB_CLIENT_ID     - GitHub OAuth App 的 Client ID
//   GITHUB_CLIENT_SECRET - GitHub OAuth App 的 Client Secret
//   RESEND_API_KEY       - Resend API Key（联系表单发信用，免费档 3000/月）
// 见 wrangler.toml 与 ../DEPLOY.md 步骤。
//
// 路由总览：
//   /                → 302 跳 GitHub 授权页（Decap 登录入口）
//   /auth            → 同上
//   /callback        → GitHub OAuth 回调，换 token 并回传后台
//   /api/contact     → 联系表单发信（POST JSON，经 Resend 发到 contact@wonderingwall.com）
//   /healthz         → 健康检查
// =========================================================

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // 归一化路径：去掉尾部斜杠，根路径记为 "/"
    const path = url.pathname.replace(/\/+$/, "") || "/";
    console.log("[oauth] path=", url.pathname, "-> normalized:", path);

    // ---- 路由 1：登录入口（根路径 / /auth / /auth/ 都重定向到 GitHub 授权页）----
    if (path === "/" || path === "/auth") {
      const state = crypto.randomUUID();
      const redirectUri = `${url.origin}/callback`;
      const githubAuthUrl =
        "https://github.com/login/oauth/authorize" +
        `?client_id=${encodeURIComponent(env.GITHUB_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        "&scope=public_repo" +
        `&state=${state}`;
      console.log("[oauth] redirect -> github, redirect_uri=", redirectUri);
      return new Response("Redirecting to GitHub...", {
        status: 302,
        headers: {
          Location: githubAuthUrl,
          "Set-Cookie":
            `gh_oauth_state=${state}; HttpOnly; Secure; Path=/; Max-Age=600; SameSite=Lax`,
        },
      });
    }

    // ---- 路由 2：OAuth 回调，换 token 并回传后台 ----
    if (path === "/callback") {
      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");
      const cookies = request.headers.get("Cookie") || "";
      const savedState = cookies.match(/gh_oauth_state=([^;]+)/)?.[1];

      if (!code) {
        return new Response("Missing code", { status: 400 });
      }
      if (!returnedState || returnedState !== savedState) {
        return new Response(
          "State mismatch — possible CSRF attack. Authorization denied.",
          { status: 403 }
        );
      }

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: `${url.origin}/callback`,
        }),
      });
      const data = await tokenRes.json();
      if (!data.access_token) {
        return new Response("GitHub authorization failed", { status: 401 });
      }

      // 通过 postMessage 把 token 交还给 Decap 后台弹窗
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Authorizing</title></head>
<body><script>
(function () {
  function receiveMessage(e) {
    window.opener.postMessage(
      'authorization:github:success:' + JSON.stringify({
        token: ${JSON.stringify(data.access_token)},
        provider: "github"
      }),
      e.origin
    );
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script></body></html>`;

      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "Set-Cookie": "gh_oauth_state=; HttpOnly; Secure; Path=/; Max-Age=0",
        },
      });
    }

    // ---- 路由 3：联系表单发信（Resend，免费档 3000/月，Key 存 Secret）----
    if (path === "/api/contact") {
      const cors = {
        "Access-Control-Allow-Origin": "https://www.wonderingwall.com",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      };
      // 浏览器跨域预检
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors });
      }
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers: cors });
      }
      let payload;
      try {
        payload = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }),
          { status: 400, headers: { ...cors, "content-type": "application/json" } });
      }
      const name = String(payload.name || "").trim();
      const email = String(payload.email || "").trim();
      const phone = String(payload.phone || "").trim();
      const topic = String(payload.topic || "").trim();
      const message = String(payload.message || "").trim();
      if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) {
        return new Response(JSON.stringify({ ok: false, error: "Missing required fields" }),
          { status: 400, headers: { ...cors, "content-type": "application/json" } });
      }

      const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6">
  <h2 style="margin:0 0 12px">新的合作咨询</h2>
  <p><strong>称呼：</strong>${escapeHtml(name)}</p>
  <p><strong>邮箱：</strong>${escapeHtml(email)}</p>
  <p><strong>电话：</strong>${escapeHtml(phone || "（未填）")}</p>
  <p><strong>咨询类型：</strong>${escapeHtml(topic || "（未填）")}</p>
  <p><strong>需求描述：</strong></p>
  <blockquote style="border-left:3px solid #4f7cff;margin:0;padding:8px 12px;background:#f5f7ff">${escapeHtml(message)}</blockquote>
</div>`;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "若紊科技 <contact@wonderingwall.com>",
            to: ["contact@wonderingwall.com"],
            reply_to: email,
            subject: `合作咨询 - ${name}`,
            html,
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error("[contact] Resend failed:", res.status, errText);
          return new Response(JSON.stringify({ ok: false, error: "Send failed" }),
            { status: 502, headers: { ...cors, "content-type": "application/json" } });
        }
        return new Response(JSON.stringify({ ok: true }),
          { status: 200, headers: { ...cors, "content-type": "application/json" } });
      } catch (e) {
        console.error("[contact] Resend exception:", e);
        return new Response(JSON.stringify({ ok: false, error: "Server error" }),
          { status: 502, headers: { ...cors, "content-type": "application/json" } });
      }
    }

    // ---- 健康检查（移动到了 /healthz，避免与登录入口冲突）----
    if (path === "/healthz") {
      return new Response("Decap OAuth proxy is running.", { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  },
};
