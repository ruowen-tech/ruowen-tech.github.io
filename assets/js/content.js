/* =========================================================
   上海若紊科技有限公司 · 站点内容数据层 (Decap CMS 版)
   - 新闻/招聘真源为仓库文件 content/news.json / content/jobs.json
   - 前端运行时 fetch 这些文件渲染（改完提交即全站生效）
   - 若 fetch 失败（如本地直接打开 file://），回退到下方 SITE_CONTENT_SEED
   ========================================================= */

/* ---------- 兜底种子（仅在无法 fetch 仓库 JSON 时使用） ---------- */
window.SITE_CONTENT_SEED = {
  news: [
    {
      id: "n20260618",
      title: "若紊科技发布新一代 Ruowen Hub 2 智能家居中枢",
      date: "2026-06-18",
      category: "产品发布",
      emoji: "🏠",
      summary: "本地算力翻倍、隐私不出户，Ruowen Hub 2 带来更稳更快的全屋协同体验。",
      body: "6 月 18 日，上海若紊科技正式发布第二代智能家居中枢 Ruowen Hub 2。\n\n新品采用本地优先架构，算力较上一代提升约 2 倍，可同时调度超过 200 个智能设备，且在断网环境下仍能维持核心场景的稳定运行。\n\n我们坚持「隐私不出户」：所有语音与传感数据均在本地完成处理，仅在用户明确授权时才上传云端。Ruowen Hub 2 即日起开启预约。"
    },
    {
      id: "n20260510",
      title: "Ruowen Ring 智能指环通过睡眠监测认证",
      date: "2026-05-10",
      category: "公司动态",
      emoji: "💍",
      summary: "无感佩戴、医疗级精度，若紊在可穿戴健康感知上再进一步。",
      body: "近日，若紊科技 Ruowen Ring 智能指环通过第三方机构的睡眠监测精度认证，心率与睡眠分期结果与医疗级设备一致性超过 95%。\n\n轻至 4 克的无感佩戴，配合 7 天续航，让全天候健康感知成为可能。我们将持续打磨算法，把数据转化为真正可执行的建议。"
    },
    {
      id: "n20260422",
      title: "若紊与生态伙伴达成平台接入合作",
      date: "2026-04-22",
      category: "合作生态",
      emoji: "🔗",
      summary: "开放设备接入与场景引擎，让更多产品快速拥有智能联动能力。",
      body: "本周，若紊科技与多家智能硬件品牌达成平台接入合作。基于开放 API 与场景引擎，合作伙伴的既有产品可快速接入 Ruowen OS，实现跨品类的智能联动。\n\n我们相信，智能生活不该是孤岛。开放与协作，是把体验做厚的关键。"
    },
    {
      id: "n20260315",
      title: "若紊科技完成新一轮融资，加速智能生活布局",
      date: "2026-03-15",
      category: "公司动态",
      emoji: "🚀",
      summary: "资金将主要用于自研传感模组与场景算法的持续投入。",
      body: "上海若紊科技宣布完成新一轮融资，资金将主要用于芯片级传感模组、低功耗连接与场景化算法的持续研发。\n\n成立八年，若紊始终聚焦智能生活周边设备这一件事。本轮融资将帮助我们把产品体验做得更扎实，也把生态做得更开放。"
    },
    {
      id: "n20260208",
      title: "技术分享：我们如何把指环续航做到 7 天",
      date: "2026-02-08",
      category: "技术分享",
      emoji: "🔋",
      summary: "从传感采样到无线通信，一套系统级的低功耗工程方法论。",
      body: "可穿戴设备最难的不是功能，而是续航。本文分享若紊在 Ruowen Ring 上的低功耗实践：\n\n1）事件驱动采样，而非恒定轮询；\n2）自适应连接间隔，空闲时大幅降频；\n3）边缘预处理，只在必要时唤醒主芯片。\n\n系统级的功耗预算，才是长续航的真正答案。"
    }
  ],
  jobs: [
    { id: "j2026001", title: "嵌入式软件工程师", dept: "研发部", location: "上海", type: "全职", salary: "25-45K", desc: "负责智能硬件固件开发、低功耗调度与设备互联协议实现。", requirements: ["本科及以上学历，电子/计算机/自动化相关专业","精通 C/C++，熟悉 RTOS 与嵌入式 Linux","有 BLE / Wi-Fi / Zigbee 等至少一种连接协议经验","具备低功耗优化与量产经验者优先"] },
    { id: "j2026002", title: "硬件结构工程师", dept: "研发部", location: "上海", type: "全职", salary: "20-40K", desc: "负责智能周边设备的结构设计、堆叠与可制造性验证。", requirements: ["机械/材料/精密制造相关专业背景","熟练使用 Pro/E 或 SolidWorks 进行 3D 设计","熟悉注塑、冲压与防水密封工艺","有消费电子量产经验者优先"] },
    { id: "j2026003", title: "算法工程师（传感融合）", dept: "算法部", location: "上海", type: "全职", salary: "30-55K", desc: "研发多模态传感融合与时序建模算法，支撑场景化智能。", requirements: ["硕士及以上学历，信号处理/机器学习相关专业","熟悉时序模型与传感数据预处理","有可穿戴或环境感知算法落地经验","良好的工程化与跨团队协作能力"] },
    { id: "j2026004", title: "产品经理（智能硬件）", dept: "产品部", location: "上海", type: "全职", salary: "25-50K", desc: "负责智能生活周边设备的需求定义、体验设计与生命周期管理。", requirements: ["3 年以上硬件/ IoT 产品经验","具备从 0 到 1 的产品规划与落地能力","对用户体验有敏锐判断，能驱动跨团队协作","有智能硬件量产经验者优先"] },
    { id: "j2026005", title: "UI/UX 设计师", dept: "设计部", location: "上海", type: "全职", salary: "18-35K", desc: "负责 App、设备端界面与品牌视觉的设计与打磨。", requirements: ["扎实的视觉与交互设计能力","熟练使用 Figma / Sketch 等工具","有硬件配套 App 或 IoT 设计经验","注重细节与一致性的体验思维"] },
    { id: "j2026006", title: "海外渠道经理", dept: "市场部", location: "上海 / 远程", type: "全职", salary: "20-40K", desc: "拓展海外渠道与生态合作，推动智能硬件出海。", requirements: ["英语可作为工作语言","有消费电子/ IoT 海外渠道经验","具备跨文化沟通与谈判能力","能接受必要的出差"] }
  ]
};

/* ---------- 公共工具 ---------- */
window.SITE_UTIL = {
  esc: function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  },
  textToHtml: function (s) {
    return window.SITE_UTIL.esc(s).replace(/\n/g, "<br>");
  },
  fmtDate: function (s) {
    if (!s) return "";
    var p = String(s).split("-");
    return p.length === 3 ? p[0] + "年" + p[1] + "月" + p[2] + "日" : s;
  }
};

/* ---------- 异步数据加载器：优先读取仓库 JSON，失败回退种子 ---------- */
window.SITE_DATA = {
  async loadNews() {
    try {
      const r = await fetch("content/news.json", { cache: "no-store" });
      if (!r.ok) throw new Error("http " + r.status);
      const d = await r.json();
      const items = Array.isArray(d.items) ? d.items : [];
      return items.slice().sort(function (a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      });
    } catch (e) {
      const seed = (window.SITE_CONTENT_SEED && window.SITE_CONTENT_SEED.news) || [];
      return seed.slice().sort(function (a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      });
    }
  },
  async loadJobs() {
    try {
      const r = await fetch("content/jobs.json", { cache: "no-store" });
      if (!r.ok) throw new Error("http " + r.status);
      const d = await r.json();
      return Array.isArray(d.items) ? d.items : [];
    } catch (e) {
      return (window.SITE_CONTENT_SEED && window.SITE_CONTENT_SEED.jobs) || [];
    }
  }
};
