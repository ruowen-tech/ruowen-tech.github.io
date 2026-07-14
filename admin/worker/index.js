// =========================================================
// 上海若紊科技 · Decap CMS GitHub OAuth 代理 (Cloudflare Worker)
// 零依赖，可直接部署到 Cloudflare Workers 免费层。
//
// 协议（Decap github 后端要求）：
//   1. 后台弹窗打开 <base_url>/auth
//   2. 本 Worker 把浏览器 302 重定向到 GitHub 授权页
//   3. GitHub 回调 <base_url>/callback?code=...&state=...
//   4. 本 Worker 用 code 换取 access_token，再以 postMessage 把 token 回传给后台弹窗
//
// 部署需要两个 Secret（不要写进代码）：
//   GITHUB_CLIENT_ID     - GitHub OAuth App 的 Client ID
//   GITHUB_CLIENT_SECRET - GitHub OAuth App 的 Client Secret
// 见 wrangler.toml 与 README 步骤。
// =========================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ---- 路由 1：登录入口，重定向到 GitHub 授权页 ----
    if (url.pathname === "/auth") {
      const state = crypto.randomUUID();
      const redirectUri = `${url.origin}/callback`;
      const githubAuthUrl =
        "https://github.com/login/oauth/authorize" +
        `?client_id=${encodeURIComponent(env.GITHUB_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        "&scope=public_repo" +
        `&state=${state}`;
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
    if (url.pathname === "/callback") {
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

    // ---- 健康检查 ----
    return new Response("Decap OAuth proxy is running.", { status: 200 });
  },
};
