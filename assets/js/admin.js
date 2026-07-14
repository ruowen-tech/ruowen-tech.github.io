/* 内容管理后台逻辑 */
(function () {
  "use strict";
  var U = window.SITE_UTIL;
  var C = window.SITE_CONTENT;
  var ADMIN_PWD = "ruowen2026";           // 演示用密码，可按需修改
  var SESSION_KEY = "ruowen_admin_session";

  var loginScreen = document.getElementById("loginScreen");
  var adminShell = document.getElementById("adminShell");
  var pwdInput = document.getElementById("pwd");
  var loginErr = document.getElementById("loginErr");

  /* ---------- 登录 / 登出 ---------- */
  function enter() {
    loginScreen.style.display = "none";
    adminShell.classList.add("in");
    renderNews();
    renderJobs();
  }
  function tryLogin() {
    if (pwdInput.value === ADMIN_PWD) {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch (e) {}
      loginErr.style.display = "none";
      enter();
    } else {
      loginErr.textContent = "密码错误，请重试。";
      loginErr.style.display = "block";
    }
  }
  document.getElementById("loginBtn").addEventListener("click", tryLogin);
  pwdInput.addEventListener("keydown", function (e) { if (e.key === "Enter") tryLogin(); });
  document.getElementById("logoutBtn").addEventListener("click", function () {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    adminShell.classList.remove("in");
    loginScreen.style.display = "grid";
    pwdInput.value = "";
  });

  /* ---------- Tabs ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".admin-nav button"), function (btn) {
    btn.addEventListener("click", function () {
      var tab = btn.getAttribute("data-tab");
      document.querySelectorAll(".admin-nav button").forEach(function (b) { b.classList.toggle("active", b === btn); });
      document.getElementById("panel-news").classList.toggle("in", tab === "news");
      document.getElementById("panel-jobs").classList.toggle("in", tab === "jobs");
    });
  });

  /* ---------- News ---------- */
  var newsEditor = document.getElementById("newsEditor");
  var newsTbody = document.getElementById("newsTbody");
  var editingNewsId = null;

  function renderNews() {
    var list = C.getNews();
    newsTbody.innerHTML = list.map(function (n) {
      return "<tr>" +
        '<td><div class="t-title">' + U.esc(n.title) + "</div></td>" +
        '<td>' + U.esc(n.category || "—") + "</td>" +
        '<td>' + U.esc(n.date || "—") + "</td>" +
        '<td><div class="admin-actions">' +
          '<button class="btn-mini" data-edit="' + U.esc(n.id) + '">编辑</button>' +
          '<button class="btn-mini danger" data-del="' + U.esc(n.id) + '">删除</button>' +
        "</div></td>" +
      "</tr>";
    }).join("") || '<tr><td colspan="4" style="text-align:center;color:var(--slate-500)">暂无新闻</td></tr>';

    Array.prototype.forEach.call(newsTbody.querySelectorAll("[data-edit]"), function (b) {
      b.addEventListener("click", function () { openNewsEditor(b.getAttribute("data-edit")); });
    });
    Array.prototype.forEach.call(newsTbody.querySelectorAll("[data-del]"), function (b) {
      b.addEventListener("click", function () {
        if (confirm("确定删除这条新闻？")) { C.deleteNews(b.getAttribute("data-del")); renderNews(); }
      });
    });
  }

  function openNewsEditor(id) {
    editingNewsId = id || null;
    document.getElementById("newsEditorTitle").textContent = id ? "编辑新闻" : "新建新闻";
    if (id) {
      var n = C.getNews().filter(function (x) { return x.id === id; })[0] || {};
      document.getElementById("n_title").value = n.title || "";
      document.getElementById("n_date").value = n.date || "";
      document.getElementById("n_category").value = n.category || "";
      document.getElementById("n_emoji").value = n.emoji || "";
      document.getElementById("n_summary").value = n.summary || "";
      document.getElementById("n_body").value = n.body || "";
    } else {
      ["n_title","n_date","n_category","n_emoji","n_summary","n_body"].forEach(function (k) { document.getElementById(k).value = ""; });
      document.getElementById("n_date").value = new Date().toISOString().slice(0, 10);
    }
    newsEditor.style.display = "block";
    newsEditor.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  document.getElementById("newsNew").addEventListener("click", function () { openNewsEditor(null); });
  document.getElementById("newsCancel").addEventListener("click", function () { newsEditor.style.display = "none"; editingNewsId = null; });
  document.getElementById("newsSave").addEventListener("click", function () {
    var title = document.getElementById("n_title").value.trim();
    var date = document.getElementById("n_date").value.trim();
    if (!title || !date) { alert("请填写标题与日期（YYYY-MM-DD）。"); return; }
    var item = {
      title: title,
      date: date,
      category: document.getElementById("n_category").value.trim() || "动态",
      emoji: document.getElementById("n_emoji").value.trim(),
      summary: document.getElementById("n_summary").value.trim(),
      body: document.getElementById("n_body").value
    };
    if (editingNewsId) { item.id = editingNewsId; C.updateNews(item); }
    else { C.addNews(item); }
    newsEditor.style.display = "none";
    editingNewsId = null;
    renderNews();
  });

  /* ---------- Jobs ---------- */
  var jobsEditor = document.getElementById("jobsEditor");
  var jobsTbody = document.getElementById("jobsTbody");
  var reqsBox = document.getElementById("j_reqs");
  var editingJobId = null;

  function addReqInput(val) {
    var wrap = document.createElement("div");
    wrap.className = "req-item";
    wrap.innerHTML = '<input type="text" placeholder="任职要求……"><button class="btn-mini danger" type="button">×</button>';
    wrap.querySelector("input").value = val || "";
    wrap.querySelector("button").addEventListener("click", function () { wrap.remove(); });
    reqsBox.appendChild(wrap);
  }

  function renderJobs() {
    var list = C.getJobs();
    jobsTbody.innerHTML = list.map(function (j) {
      return "<tr>" +
        '<td><div class="t-title">' + U.esc(j.title) + "</div></td>" +
        '<td>' + U.esc(j.dept || "—") + "</td>" +
        '<td>' + U.esc(j.location || "—") + "</td>" +
        '<td><div class="admin-actions">' +
          '<button class="btn-mini" data-edit="' + U.esc(j.id) + '">编辑</button>' +
          '<button class="btn-mini danger" data-del="' + U.esc(j.id) + '">删除</button>' +
        "</div></td>" +
      "</tr>";
    }).join("") || '<tr><td colspan="4" style="text-align:center;color:var(--slate-500)">暂无岗位</td></tr>';

    Array.prototype.forEach.call(jobsTbody.querySelectorAll("[data-edit]"), function (b) {
      b.addEventListener("click", function () { openJobsEditor(b.getAttribute("data-edit")); });
    });
    Array.prototype.forEach.call(jobsTbody.querySelectorAll("[data-del]"), function (b) {
      b.addEventListener("click", function () {
        if (confirm("确定删除这个岗位？")) { C.deleteJob(b.getAttribute("data-del")); renderJobs(); }
      });
    });
  }

  function openJobsEditor(id) {
    editingJobId = id || null;
    document.getElementById("jobsEditorTitle").textContent = id ? "编辑岗位" : "新建岗位";
    reqsBox.innerHTML = "";
    if (id) {
      var j = C.getJobs().filter(function (x) { return x.id === id; })[0] || {};
      document.getElementById("j_title").value = j.title || "";
      document.getElementById("j_dept").value = j.dept || "";
      document.getElementById("j_location").value = j.location || "";
      document.getElementById("j_type").value = j.type || "";
      document.getElementById("j_salary").value = j.salary || "";
      document.getElementById("j_desc").value = j.desc || "";
      (j.requirements || []).forEach(function (r) { addReqInput(r); });
    } else {
      ["j_title","j_dept","j_location","j_type","j_salary","j_desc"].forEach(function (k) { document.getElementById(k).value = ""; });
      addReqInput("");
    }
    jobsEditor.style.display = "block";
    jobsEditor.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  document.getElementById("jobsNew").addEventListener("click", function () { openJobsEditor(null); });
  document.getElementById("jobsCancel").addEventListener("click", function () { jobsEditor.style.display = "none"; editingJobId = null; });
  document.getElementById("j_addReq").addEventListener("click", function () { addReqInput(""); });

  document.getElementById("jobsSave").addEventListener("click", function () {
    var title = document.getElementById("j_title").value.trim();
    if (!title) { alert("请填写岗位名称。"); return; }
    var reqs = Array.prototype.slice.call(reqsBox.querySelectorAll("input"))
      .map(function (i) { return i.value.trim(); }).filter(Boolean);
    var item = {
      title: title,
      dept: document.getElementById("j_dept").value.trim() || "—",
      location: document.getElementById("j_location").value.trim() || "—",
      type: document.getElementById("j_type").value.trim() || "全职",
      salary: document.getElementById("j_salary").value.trim(),
      desc: document.getElementById("j_desc").value,
      requirements: reqs
    };
    if (editingJobId) { item.id = editingJobId; C.updateJob(item); }
    else { C.addJob(item); }
    jobsEditor.style.display = "none";
    editingJobId = null;
    renderJobs();
  });

  /* ---------- Export / Reset ---------- */
  document.getElementById("exportBtn").addEventListener("click", function () {
    var text = C.exportJS();
    var blob = new Blob([text], { type: "text/javascript;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "content.js";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    alert("已导出 content.js。\n请将其替换仓库中的 assets/js/content.js 并提交，修改即可对所有访客生效。");
  });

  document.getElementById("resetBtn").addEventListener("click", function () {
    if (confirm("确定将所有新闻与招聘恢复为示例数据？当前浏览器中的修改将丢失。")) {
      C.reset(); renderNews(); renderJobs();
      alert("已重置为示例数据。");
    }
  });

  /* ---------- 初始状态 ---------- */
  var authed = false;
  try { authed = sessionStorage.getItem(SESSION_KEY) === "1"; } catch (e) {}
  if (authed) enter();
})();
