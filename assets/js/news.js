/* 新闻页渲染 (数据来自 content/news.json, 失败回退种子) */
(function () {
  "use strict";
  var grid = document.getElementById("newsGrid");
  var empty = document.getElementById("newsEmpty");
  var filterbar = document.getElementById("filterbar");
  var modal = document.getElementById("newsModal");
  var U = window.SITE_UTIL;
  var current = "全部";
  var ALL = [];

  function arrows() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function getCats(list) {
    var set = {}, out = [];
    list.forEach(function (n) { if (n.category && !set[n.category]) { set[n.category] = 1; out.push(n.category); } });
    return out;
  }

  function renderFilter(cats) {
    filterbar.innerHTML = cats.map(function (c) {
      return '<button data-cat="' + U.esc(c) + '" class="' + (c === current ? "active" : "") + '">' + U.esc(c) + "</button>";
    }).join("");
    Array.prototype.forEach.call(filterbar.querySelectorAll("button"), function (b) {
      b.addEventListener("click", function () {
        current = b.getAttribute("data-cat");
        renderFilter(cats);
        renderNews();
      });
    });
  }

  function renderNews() {
    var list = ALL;
    if (current !== "全部") list = list.filter(function (n) { return n.category === current; });
    if (!list.length) { grid.innerHTML = ""; empty.style.display = "block"; return; }
    empty.style.display = "none";
    grid.innerHTML = list.map(function (n) {
      return '' +
        '<article class="news-card reveal" data-id="' + U.esc(n.id) + '">' +
          '<div class="news-card__cover"><span>' + U.esc(n.emoji || "📰") + "</span></div>" +
          '<div class="news-card__body">' +
            '<div class="news-card__meta">' +
              '<span class="pill pill--cat">' + U.esc(n.category || "动态") + "</span>" +
              "<span>" + U.esc(U.fmtDate(n.date)) + "</span>" +
            "</div>" +
            "<h3>" + U.esc(n.title) + "</h3>" +
            "<p>" + U.esc(n.summary || "") + "</p>" +
            '<span class="news-card__more">阅读全文 ' + arrows() + "</span>" +
          "</div>" +
        "</article>";
    }).join("");
    Array.prototype.forEach.call(grid.querySelectorAll(".news-card"), function (card) {
      card.addEventListener("click", function () { openModal(card.getAttribute("data-id")); });
    });
    if (window.revealObserve) window.revealObserve(grid.querySelectorAll(".reveal"));
  }

  function openModal(id) {
    var n = ALL.filter(function (x) { return x.id === id; })[0];
    if (!n) return;
    document.getElementById("mCat").innerHTML = '<span class="pill pill--cat">' + U.esc(n.category || "动态") + "</span>";
    document.getElementById("mTitle").textContent = n.title;
    document.getElementById("mDate").textContent = U.fmtDate(n.date);
    document.getElementById("mBody").innerHTML = (n.body || n.summary || "").split("\n").map(function (p) {
      return "<p>" + U.esc(p) + "</p>";
    }).join("");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  modal.addEventListener("click", function (e) { if (e.target.hasAttribute("data-close")) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  window.SITE_DATA.loadNews().then(function (list) {
    ALL = list;
    renderFilter(["全部"].concat(getCats(list)));
    renderNews();
  });
})();
