/* 招聘页渲染 (数据来自 content/jobs.json, 失败回退种子) — 支持多语言 */
(function () {
  "use strict";
  var listEl = document.getElementById("jobList");
  var emptyEl = document.getElementById("jobEmpty");
  var U = window.SITE_UTIL;
  var loaded = false;

  function t(key, fb) { return (window.I18N && window.I18N.t(key)) || fb; }

  function chevron() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function render(jobs) {
    if (!jobs.length) { listEl.innerHTML = ""; emptyEl.style.display = "block"; return; }
    emptyEl.style.display = "none";

    var tagFallback = {
      dept: t("recruit.tag_dept", "部门"),
      location: t("recruit.tag_location", "地点"),
      type: t("recruit.tag_type", "全职")
    };

    listEl.innerHTML = jobs.map(function (j) {
      var tags = [
        '<span class="pill pill--tag">' + U.esc(j.dept || tagFallback.dept) + "</span>",
        '<span class="pill pill--tag">' + U.esc(j.location || tagFallback.location) + "</span>",
        '<span class="pill pill--tag">' + U.esc(j.type || tagFallback.type) + "</span>",
        '<span class="pill pill--tag">' + U.esc((j.salary || "") + " K") + "</span>"
      ].join("");

      var reqs = (j.requirements || []).map(function (r) { return "<li>" + U.esc(r) + "</li>"; }).join("");

      return '' +
        '<div class="job reveal" data-id="' + U.esc(j.id) + '">' +
          '<div class="job__head">' +
            '<div class="job__main">' +
              '<div class="job__title">' + U.esc(j.title) + "</div>" +
              '<div class="job__tags">' + tags + "</div>" +
            "</div>" +
            '<div class="job__toggle">' + chevron() + "</div>" +
          "</div>" +
          '<div class="job__detail">' +
            '<div class="job__detail-inner">' +
              "<h4>" + U.esc(t("recruit.job_duties", "岗位职责")) + "</h4><p>" + U.esc(j.desc || "") + "</p>" +
              (reqs ? "<h4>" + U.esc(t("recruit.job_reqs", "任职要求")) + "</h4><ul>" + reqs + "</ul>" : "") +
              '<div class="job__apply"><a class="btn btn--primary btn--sm" href="mailto:hr@wonderingwall.com?subject=' +
                encodeURIComponent(t("recruit.job_apply", "投递简历") + "：" + j.title) + '">' + U.esc(t("recruit.job_apply", "投递简历")) + "</a></div>" +
            "</div>" +
          "</div>" +
        "</div>";
    }).join("");

    Array.prototype.forEach.call(listEl.querySelectorAll(".job"), function (job) {
      job.querySelector(".job__head").addEventListener("click", function () { job.classList.toggle("open"); });
    });
    if (window.revealObserve) window.revealObserve(listEl.querySelectorAll(".reveal"));
  }

  function renderAll(jobs) { render(jobs); }

  window.SITE_DATA.loadJobs().then(function (jobs) {
    loaded = true;
    renderAll(jobs);
  });

  // 语言切换时重新渲染（标签翻译）
  if (window.I18N) {
    window.I18N.onReady(function () {
      if (loaded) window.SITE_DATA.loadJobs().then(renderAll);
    });
  }
})();
