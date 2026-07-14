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

  /* ---- Contact form (client-side only) ---- */
  const form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const status = document.getElementById("formStatus");
      const name = form.querySelector("#name");
      const email = form.querySelector("#email");
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
      status.className = "form-status ok";
      status.textContent = "提交成功！我们的团队会在 1 个工作日内与您联系。";
      form.reset();
    });
  }
})();
