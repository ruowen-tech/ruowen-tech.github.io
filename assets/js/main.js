/* =========================================================
   上海若紊科技有限公司 · 企业官网 — interactions
   ========================================================= */
(function () {
  "use strict";

  /* ---- Navbar: scrolled state + mobile toggle ---- */
  const nav = document.querySelector(".nav");
  const toggle = document.querySelector(".nav__toggle");
  const onScroll = () => {
    if (window.scrollY > 24) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (toggle) {
    toggle.addEventListener("click", () => nav.classList.toggle("open"));
    document.querySelectorAll(".nav__links a").forEach((a) =>
      a.addEventListener("click", () => nav.classList.remove("open"))
    );
  }

  /* ---- Active nav link based on current page ---- */
  const page = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav__links a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === page || (page === "index.html" && href === "./")) a.classList.add("active");
  });

  /* ---- Scroll reveal ---- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* ---- Animated stat counters ---- */
  const counters = document.querySelectorAll("[data-count]");
  const runCount = (el) => {
    const target = parseFloat(el.getAttribute("data-count"));
    const dec = (el.getAttribute("data-dec") || "0").indexOf("1") > -1 ? 1 : 0;
    const dur = 1400;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = (target * eased).toFixed(dec);
      el.textContent = dec ? val : Math.round(val).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ("IntersectionObserver" in window && counters.length) {
    const co = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { runCount(e.target); co.unobserve(e.target); } }),
      { threshold: 0.5 }
    );
    counters.forEach((c) => co.observe(c));
  } else {
    counters.forEach((c) => (c.textContent = c.getAttribute("data-count")));
  }

  /* ---- Footer year ---- */
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---- Contact form (delivered via Cloudflare Worker + Resend) ---- */
  const form = document.getElementById("contactForm");
  if (form) {
    const status = document.getElementById("formStatus");
    const submitBtn = form.querySelector('button[type="submit"]');
    // 多语言回退：优先用 i18n 字典，未加载时回退中文
    const T = (k, fb) => (window.I18N && window.I18N.t(k)) || fb;
    // 后端发信地址：我们自己的 Cloudflare Worker（自定义域名 decap.wonderingwall.com，国内直连）
    const ENDPOINT = "https://decap.wonderingwall.com/api/contact";

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = form.querySelector("#name");
      const phone = form.querySelector("#phone");
      const email = form.querySelector("#email");
      const topic = form.querySelector("#topic");
      const msg = form.querySelector("#message");

      let ok = true, errs = [];
      if (!name.value.trim()) { ok = false; errs.push(T("contact.status_required_name", "请填写您的称呼")); }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { ok = false; errs.push(T("contact.status_invalid_email", "请填写有效的邮箱地址")); }
      if (!msg.value.trim()) { ok = false; errs.push(T("contact.status_required_msg", "请填写留言内容")); }
      if (!ok) {
        status.className = "form-status err";
        status.textContent = errs[0];
        return;
      }

      submitBtn.disabled = true;
      status.className = "form-status";
      status.textContent = T("contact.status_sending", "正在提交…");

      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.value.trim(),
            phone: phone.value.trim(),
            email: email.value.trim(),
            topic: topic.options[topic.selectedIndex].text,
            message: msg.value.trim(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          status.className = "form-status ok";
          status.textContent = T("contact.status_ok", "提交成功！我们的团队会在 1 个工作日内与您联系。");
          form.reset();
        } else {
          throw new Error(data.error || "send failed");
        }
      } catch (err) {
        console.error("[contact] submit failed:", err);
        status.className = "form-status err";
        status.textContent = T("contact.status_fail", "提交失败，请稍后重试，或直接发邮件至 contact@wonderingwall.com。");
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
})();
