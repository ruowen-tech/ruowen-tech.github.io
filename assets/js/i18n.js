/* =========================================================
   上海若紊科技有限公司 · 多语言切换引擎 (共享)
   - 读取 localStorage 中的语言偏好（默认 zh）
   - 加载 assets/data/{lang}.json（路径可由 window.RW_I18N_BASE 覆盖，子目录页面用）
   - 翻译所有 [data-i18n] / [data-i18n-html] / [data-i18n-placeholder]
   - 在页尾 #langSwitch（<select>）中渲染语言选择器，并记忆选择
   - 语言切换后派发 window 事件 "i18n:ready"，供动态渲染脚本（新闻/招聘/软件）重新渲染
   ========================================================= */
(function () {
  "use strict";

  // 支持的语言（单一数据源）：新增语言只需在此追加一项（code/label/flag），并新建 assets/data/{code}.json
  var LANGS = [
    { code: "zh", label: "中文",    flag: "🇨🇳" },
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "ja", label: "日本語",   flag: "🇯🇵" }
  ];
  var STORAGE_KEY = "rw_lang";
  var BASE = (typeof window.RW_I18N_BASE === "string") ? window.RW_I18N_BASE : "assets/data/";
  var HTML_LANG = { zh: "zh-CN", en: "en", ja: "ja" };

  var current = localStorage.getItem(STORAGE_KEY) || "zh";
  if (LANGS.indexOf(LANGS.filter(function (l) { return l.code === current; })[0]) === -1) current = "zh";
  var cache = {};
  var ready = false;

  function resolve(obj, path) {
    if (!obj) return undefined;
    var parts = String(path).split(".");
    var o = obj;
    for (var i = 0; i < parts.length; i++) {
      if (o == null) return undefined;
      o = o[parts[i]];
    }
    return o;
  }

  function apply(dict) {
    if (!dict) return;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var val = resolve(dict, el.getAttribute("data-i18n"));
      if (val != null) el.textContent = val;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var val = resolve(dict, el.getAttribute("data-i18n-html"));
      if (val != null) el.innerHTML = val;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var val = resolve(dict, el.getAttribute("data-i18n-placeholder"));
      if (val != null) el.setAttribute("placeholder", val);
    });
    // 同步下拉选择器当前值
    var sel = document.getElementById("langSwitch");
    if (sel) sel.value = current;
    document.documentElement.setAttribute("lang", HTML_LANG[current] || current);
  }

  function load(code) {
    if (cache[code]) return Promise.resolve(cache[code]);
    return fetch(BASE + code + ".json", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) { cache[code] = d; return d; })
      .catch(function (e) {
        console.warn("[i18n] 加载语言包失败:", code, e);
        return cache[code] || {};
      });
  }

  function setLang(code) {
    current = code;
    localStorage.setItem(STORAGE_KEY, code);
    return load(code).then(function (dict) {
      apply(dict);
      ready = true;
      window.dispatchEvent(new CustomEvent("i18n:ready", { detail: { lang: current, dict: dict } }));
    });
  }

  // 在 #langSwitch（页尾下拉框）中渲染语言选项；由 LANGS 驱动，天然支持扩充
  function renderSelector() {
    var sel = document.getElementById("langSwitch");
    if (!sel) return;
    sel.innerHTML = LANGS.map(function (l) {
      return '<option value="' + l.code + '">' + l.flag + "  " + l.label + "</option>";
    }).join("");
    sel.value = current;
    sel.addEventListener("change", function () { setLang(sel.value); });
  }

  // 供动态渲染脚本调用
  window.I18N = {
    get lang() { return current; },
    get ready() { return ready; },
    t: function (key) { return resolve(cache[current], key); },
    setLang: setLang,
    onReady: function (cb) {
      if (ready) cb({ lang: current, dict: cache[current] });
      else window.addEventListener("i18n:ready", function (e) { cb(e.detail); }, { once: true });
    }
  };

  function init() {
    renderSelector();
    load(current).then(function (dict) {
      apply(dict);
      ready = true;
      window.dispatchEvent(new CustomEvent("i18n:ready", { detail: { lang: current, dict: dict } }));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
