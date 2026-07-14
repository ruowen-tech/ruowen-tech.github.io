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

  /* ---- Contact form (delivered via EmailJS) ---- */
  const form = document.getElementById("contactForm");
  if (form) {
    // ⚠️ 在 EmailJS 后台创建 Service / Template 后，把下面的三项替换为真实值：
    //   publicKey  → EmailJS 控制台 Account → General → API Keys → Public Key
    //   serviceId  → EmailJS 控制台 Email Services → 对应 Service 的 ID
    //   templateId → EmailJS 控制台 Email Templates → 对应 Template 的 ID
    const EMAILJS = {
      publicKey: "YOUR_PUBLIC_KEY",
      serviceId: "YOUR_SERVICE_ID",
      templateId: "YOUR_TEMPLATE_ID",
    };

    const status = document.getElementById("formStatus");
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = form.querySelector("#name");
      const phone = form.querySelector("#phone");
      const email = form.querySelector("#email");
      const topic = form.querySelector("#topic");
      const msg = form.querySelector("#message");

      let ok = true, errs = [];
      if (!name.value.trim()) { ok = false; errs.push("请填写您的称呼"); }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { ok = false; errs.push("请填写有效的邮箱地址"); }
      if (!msg.value.trim()) { ok = false; errs.push("请填写留言内容"); }
      if (!ok) {
        status.className = "form-status err";
        status.textContent = errs[0];
        return;
      }

      // 未配置密钥时给出友好提示，避免访客误以为发送成功
      if (!EMAILJS.publicKey || EMAILJS.publicKey.indexOf("YOUR_") === 0) {
        status.className = "form-status err";
        status.textContent = "表单发信服务尚未配置，请直接发邮件至 contact@wonderingwall.com。";
        return;
      }

      submitBtn.disabled = true;
      status.className = "form-status";
      status.textContent = "正在提交…";

      try {
        await emailjs.send(EMAILJS.serviceId, EMAILJS.templateId, {
          name: name.value.trim(),
          phone: phone.value.trim() || "（未填）",
          email: email.value.trim(),
          topic: topic.options[topic.selectedIndex].text,
          message: msg.value.trim(),
          reply_to: email.value.trim(),
        }, { publicKey: EMAILJS.publicKey });

        status.className = "form-status ok";
        status.textContent = "提交成功！我们的团队会在 1 个工作日内与您联系。";
        form.reset();
      } catch (err) {
        console.error("[contact] EmailJS send failed:", err);
        status.className = "form-status err";
        status.textContent = "提交失败，请稍后重试，或直接发邮件至 contact@wonderingwall.com。";
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
})();
