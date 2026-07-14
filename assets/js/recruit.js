/* 招聘页渲染 (数据来自 content/jobs.json, 失败回退种子) */
(function () {
  "use strict";
  var listEl = document.getElementById("jobList");
  var emptyEl = document.getElementById("jobEmpty");
  var U = window.SITE_UTIL;

  function chevron() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function render(jobs) {
    if (!jobs.length) { listEl.innerHTML = ""; emptyEl.style.display = "block"; return; }
    emptyEl.style.display = "none";

    listEl.innerHTML = jobs.map(function (j) {
      var tags = [
        '<span class="pill pill--tag">' + U.esc(j.dept || "部门") + "</span>",
        '<span class="pill pill--tag">' + U.esc(j.location || "地点") + "</span>",
        '<span class="pill pill--tag">' + U.esc(j.type || "全职") + "</span>",
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
              "<h4>岗位职责</h4><p>" + U.esc(j.desc || "") + "</p>" +
              (reqs ? "<h4>任职要求</h4><ul>" + reqs + "</ul>" : "") +
              '<div class="job__apply"><a class="btn btn--primary btn--sm" href="mailto:hr@wonderingwall.com?subject=' +
                encodeURIComponent("应聘：" + j.title) + '">投递简历</a></div>' +
            "</div>" +
          "</div>" +
        "</div>";
    }).join("");

    Array.prototype.forEach.call(listEl.querySelectorAll(".job"), function (job) {
      job.querySelector(".job__head").addEventListener("click", function () { job.classList.toggle("open"); });
    });
    if (window.revealObserve) window.revealObserve(listEl.querySelectorAll(".reveal"));
  }

  window.SITE_DATA.loadJobs().then(render);
})();
