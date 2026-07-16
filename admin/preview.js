/* =========================================================
   上海若紊科技 · Decap CMS 预览模板（实时渲染，免等部署）
   - 必须在 decap-cms.js 之后加载（admin/index.html 已按顺序引入）
   - 编辑新闻/招聘时，右侧预览区即时渲染成与官网一致的卡片样式
   ========================================================= */
(function () {
  "use strict";
  var CMS = window.CMS;
  var React = window.React;
  if (!CMS || !React) {
    console.error("[preview] Decap CMS 或 React 未就绪，预览模板未注册");
    return;
  }
  var h = React.createElement;

  /* ---------- 自动日期控件 autoDate ----------
     新闻新建时自动设为今天（YYYY-MM-DD），不可手填，表单中由 CSS 隐藏。
     仅在值为空时写入今天；已有日期（旧数据）保持不变。 */
  function todayStr() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  var AutoDateControl = class extends React.Component {
    componentDidMount() {
      if (!this.props.value) this.props.onChange(todayStr());
    }
    render() {
      var v = this.props.value || todayStr();
      return h(
        "div",
        { className: "rw-autodate" },
        h("span", { className: "rw-autodate__val" }, v),
        h("span", { className: "rw-autodate__note" }, "（保存时自动设为今天，无需填写）")
      );
    }
  };
  if (CMS.registerWidget) {
    CMS.registerWidget(
      "autoDate",
      AutoDateControl,
      function (props) { return h("span", null, props.value || ""); }
    );
    console.log("[preview] 自动日期控件 autoDate 已注册");
  }

  /* ---------- 新闻预览 ---------- */
  function NewsPreview(props) {
    var data = props.entry.get("data");
    var items = data.get("items");
    if (!items) items = [];
    var cards = items.map(function (it, i) {
      var emoji = it.get("emoji") || "📰";
      var cover = it.get("cover");
      var coverNode = cover
        ? h("div", { className: "rw-card__cover rw-card__cover--img" }, h("img", { src: cover, alt: "" }))
        : h("div", { className: "rw-card__cover" }, h("span", null, emoji));
      return h(
        "article",
        { className: "rw-card", key: i },
        coverNode,
        h(
          "div",
          { className: "rw-card__body" },
          h(
            "div",
            { className: "rw-card__meta" },
            h("span", { className: "pill pill--cat" }, it.get("category") || "动态"),
            h("span", null, it.get("date") || "")
          ),
          h("h3", null, it.get("title") || "（未填标题）"),
          h("p", null, it.get("summary") || ""),
          h("span", { className: "rw-card__more" }, "阅读全文 →")
        )
      );
    });
    return h(
      "div",
      { className: "rw-preview" },
      h("div", { className: "rw-preview__hint" }, "实时预览 · 保存后约 1 分钟同步到官网。"),
      h("div", { className: "rw-grid" }, cards)
    );
  }

  /* ---------- 招聘预览 ---------- */
  function JobsPreview(props) {
    var data = props.entry.get("data");
    var items = data.get("items");
    if (!items) items = [];
    var jobs = items.map(function (j, i) {
      var reqs = j.get("requirements") || [];
      var reqNodes = reqs.map(function (r, k) {
        return h("li", { key: k }, r);
      });
      var tags = [
        j.get("dept") ? h("span", { className: "pill", key: "dept" }, j.get("dept")) : null,
        j.get("location") ? h("span", { className: "pill", key: "loc" }, j.get("location")) : null,
        j.get("type") ? h("span", { className: "pill", key: "type" }, j.get("type")) : null,
        j.get("salary") ? h("span", { className: "pill pill--sal", key: "sal" }, j.get("salary")) : null
      ].filter(Boolean);
      return h(
        "article",
        { className: "rw-job", key: i },
        h(
          "div",
          { className: "rw-job__head" },
          h("div", { className: "rw-job__title" }, j.get("title") || "（未填职位）"),
          tags.length ? h("div", { className: "rw-job__tags" }, tags) : null
        ),
        j.get("desc") ? h("p", { className: "rw-job__desc" }, j.get("desc")) : null,
        reqNodes.length ? h("ul", { className: "rw-job__req" }, reqNodes) : null
      );
    });
    return h(
      "div",
      { className: "rw-preview" },
      h("div", { className: "rw-preview__hint" }, "实时预览 · 保存后约 1 分钟同步到官网。"),
      jobs
    );
  }

  CMS.registerPreviewTemplate("news", NewsPreview);
  CMS.registerPreviewTemplate("news-data", NewsPreview);
  CMS.registerPreviewTemplate("jobs", JobsPreview);
  CMS.registerPreviewTemplate("jobs-data", JobsPreview);
  console.log("[preview] 新闻/招聘预览模板已注册");
})();
