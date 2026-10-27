// 这个文件负责翻页，并把表单交给接口。
// 图在 picture.js。保本算法在服务器的 internal/logic。

const app = document.getElementById("app");
const state = {
  tab: "shop",
  shop: null,
  selected: "dine",
  input: null,
  calc: null,
  error: "",
  paused: false,
};

const FIELDS = [
  ["price", "客单价（元）", "你的假设是 10"],
  ["offline_keep", "堂食一碗留下（元）", "扣掉食材后的毛利"],
  ["online_keep", "外卖不活动留下（元）", "你的假设约 1"],
  ["promo_keep", "外卖参加活动留下（元）", "亏就填负数"],
  ["offline_pct", "堂食占比（%）", "剩下的都算外卖"],
  ["promo_pct", "外卖里参加活动的比例（%）", "平台单常常要参加"],
  ["rent_month", "月租（元）", "6000 是例子，换成真实门面"],
  ["daily_extra", "一天水电燃气耗材（元）", "教学例子 100"],
  ["daily_wage", "一天人工（元）", "0 表示暂不领工资"],
  ["orders", "假设这一天卖出（碗）", "算出这些碗赚多少"],
];

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers["Content-Type"] = "application/json";
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

function readInput(form) {
  const input = {};
  for (const [key] of FIELDS) {
    const raw = form.elements[key].value.trim();
    if (raw === "" || raw === "-" || raw === ".") return null;
    const value = Number(raw);
    if (!Number.isFinite(value)) return null;
    input[key] = key === "orders" ? Math.round(value) : value;
  }
  return input;
}

function fieldHTML(key, label, hint, value) {
  return `<label for="${key}">${esc(label)}</label>
    <input id="${key}" name="${key}" type="number" step="any" value="${esc(value)}" />
    <p class="hint">${esc(hint)}</p>`;
}

function render() {
  if (!state.shop) {
    app.innerHTML = "<p>正在打开这家店…</p>";
    return;
  }
  if (state.tab === "shop") app.innerHTML = renderShop();
  if (state.tab === "money") app.innerHTML = renderMoney();
  if (state.tab === "before") app.innerHTML = renderBefore();
  if (state.tab === "base") app.innerHTML = renderBase();
  if (state.tab === "product") app.innerHTML = renderProduct();
  applyPause();
}

function renderShop() {
  const shop = state.shop;
  const part = partById(shop, state.selected);
  const people = shop.people.map((item) => `<p><b>${esc(item.name)}。</b>${esc(item.role)}</p>`).join("");
  return `<h1>基础模型</h1>
    <p>${esc(shop.intro)}</p>
    ${shopPicture(shop, state.selected)}
    <div class="box">
      <h2>${esc(part.name)}</h2>
      <p class="say">${esc(part.lesson)}</p>
    </div>
    <h2>同一碗饭的两条路</h2>
    <p>绿点走进堂食，钱留在店里。红点走外卖，中间要经过活动。两条线同时在走。</p>
    ${twoPaths()}
    <div class="actions"><button type="button" id="anim-toggle">${state.paused ? "继续播放" : "暂停，看清这一帧"}</button></div>
    <h2>两个人</h2>
    ${people}`;
}

function renderMoney() {
  const input = state.input;
  const groups = [
    [0, 4, "一碗留下多少"],
    [4, 6, "客人从哪进"],
    [6, 9, "没有客人也会发生的开支"],
    [9, 10, "用来试算的一天"],
  ];
  const form = groups.map(([from, to, title]) => {
    const fields = FIELDS.slice(from, to).map(([key, label, hint]) =>
      fieldHTML(key, label, hint, input[key]),
    ).join("");
    return `<h2>${title}</h2>${fields}`;
  }).join("");
  return `<h1>算账器</h1>
    <p>改左边的数字，右边的图跟着变。保本那句话由规则算出来。</p>
    <div class="rules"><strong>公式</strong>保本碗数 = 一天固定开支 ÷ 平均一碗留下的钱。固定开支 = 月租 ÷ 30 + 水电耗材 + 人工。</div>
    ${state.error ? `<div class="box warn">${esc(state.error)}</div>` : ""}
    <div class="money-layout">
      <form id="money-form">${form}</form>
      <div>
        <div id="picture">${moneyPicture(input, state.calc)}</div>
        <div id="lesson">${lessonHTML()}</div>
      </div>
    </div>`;
}

function lessonHTML() {
  const calc = state.calc;
  if (!calc) return "";
  const tone = calc.covered ? "ok" : "warn";
  const notes = (calc.notes || []).map((item) => `<p>${esc(item)}</p>`).join("");
  return `<div class="box ${tone}"><p class="say">${esc(calc.message)}</p>${notes}</div>`;
}

function renderBefore() {
  const shop = state.shop;
  const flow = shop.gates.map((gate) =>
    `<div class="card"><h3>${esc(gate.name)}</h3><p>${esc(gate.pass)}</p></div>`,
  );
  const arrows = flow.flatMap((card, index) => index === 0 ? [card] : [`<div class="arrow">→</div>`, card]);
  const questions = shop.questions.map((item) =>
    `<tr><td>${esc(item.ask)}</td><td>${esc(item.need)}</td><td>${esc(item.miss)}</td></tr>`,
  ).join("");
  const customers = shop.customers.map((item) =>
    `<tr><td>${esc(item.who)}</td><td>${esc(item.care)}</td><td>${esc(item.place)}</td><td>${esc(item.price)}</td></tr>`,
  ).join("");
  const pits = shop.pits.map((item) =>
    `<tr><td>${esc(item.name)}</td><td>${esc(item.look)}</td><td>${esc(item.avoid)}</td></tr>`,
  ).join("");
  return `<h1>三个必答</h1>
    <p class="say">店能不能赚钱，在签字租房之前就算得出来。三道门按这个顺序过。</p>
    <div class="flow">${arrows.join("")}<div class="arrow">→</div><div class="card"><h3>才租</h3><p>三道都过了，再签。</p></div></div>
    <h2>三个问题</h2>
    <table>
      <thead><tr><th>问题</th><th>要答到什么程度</th><th>答含糊会怎样</th></tr></thead>
      <tbody>${questions}</tbody>
    </table>
    <h2>客群决定位置和价格</h2>
    <p>单价 10 元，对上表里的第三行。先选定一种人，门面和菜价跟着他们走。</p>
    <table>
      <thead><tr><th>主客群</th><th>他们先看什么</th><th>门面</th><th>价格</th></tr></thead>
      <tbody>${customers}</tbody>
    </table>
    <h2>10 元的饭和租金</h2>
    <div class="box">${esc(shop.rent_story)}</div>
    <h2>三种容易掉进去的做法</h2>
    <table>
      <thead><tr><th>做法</th><th>长什么样</th><th>一家店怎么避开</th></tr></thead>
      <tbody>${pits}</tbody>
    </table>`;
}

function renderBase() {
  return `<h1>商业模式</h1>
    <p class="say">店周围就算有 5000 人，赚的也只是留下来的那 200 人。他们每个工作日来吃 1 顿，这顿留下的钱才是利润。</p>
    ${basePicture()}
    <div class="box">
      <p class="say">分支一和分支二，都要等这 200 人真的每个工作日来了再做。分支三会把当天的人数做大：多出来的是慕名和打卡，来一次就走。当天 500 人里面，每天都会来的还是那 200 人。</p>
    </div>`;
}

function renderProduct() {
  return `<h1>核心产品设计</h1>
    <p class="say">核心产品是一道菜。客人用这道菜记住这家店。给谁吃、妈妈做不做得稳、这碗扣掉食材后还留不留得下钱，三件一起过，它才算设计完。</p>
    ${productPicture()}
    <div class="box">
      <p class="say">现在还没有这道菜，就一道一道试。记得住、做得稳、留得下，三道都过再把它写成核心。有一道不过就换下一道。服务和宣传不能代替这道菜。商业模式里那 200 人每个工作日来吃的，就是它。</p>
    </div>`;
}

function applyPause() {
  document.querySelectorAll("#app svg").forEach((svg) => {
    if (state.paused) svg.pauseAnimations();
    else svg.unpauseAnimations();
  });
}

function showTab(name) {
  state.tab = ["money", "before", "base", "product"].includes(name) ? name : "shop";
  document.querySelectorAll(".tabs button").forEach((btn) => {
    const on = btn.dataset.tab === state.tab;
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  if (location.hash !== "#" + state.tab) history.replaceState(null, "", "#" + state.tab);
  render();
  if (state.tab === "money") refreshCalc();
  window.scrollTo(0, 0);
}

let calcTimer = 0;
let calcSeq = 0;

async function refreshCalc() {
  const seq = ++calcSeq;
  const form = document.getElementById("money-form");
  const input = form ? readInput(form) : state.input;
  if (!input) {
    state.error = "请把每一格都填成数字。亏钱的活动填负数，例如 -1。";
    const box = document.getElementById("lesson");
    if (box) box.innerHTML = `<div class="box warn"><p>${esc(state.error)}</p></div>`;
    return;
  }
  try {
    const calc = await api("/api/calc", { method: "POST", body: JSON.stringify(input) });
    if (seq !== calcSeq) return;
    state.input = input;
    state.calc = calc;
    state.error = "";
  } catch (error) {
    if (seq !== calcSeq) return;
    state.error = error.message;
    state.calc = null;
  }
  const picture = document.getElementById("picture");
  const lesson = document.getElementById("lesson");
  if (picture && lesson && state.tab === "money") {
    picture.innerHTML = state.error && !state.calc
      ? ""
      : moneyPicture(state.input, state.calc);
    lesson.innerHTML = state.error && !state.calc
      ? `<div class="box warn"><p>${esc(state.error)}</p></div>`
      : lessonHTML();
    return;
  }
  if (state.tab === "money") render();
}

document.querySelector(".tabs").addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;
  showTab(btn.dataset.tab);
});

app.addEventListener("click", (event) => {
  const toggle = event.target.closest("#anim-toggle");
  if (toggle) {
    state.paused = !state.paused;
    applyPause();
    toggle.textContent = state.paused ? "继续播放" : "暂停，看清这一帧";
    return;
  }
  const part = event.target.closest("[data-part]");
  if (!part || state.tab !== "shop") return;
  state.selected = part.getAttribute("data-part");
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
});

app.addEventListener("input", (event) => {
  if (!event.target.closest("#money-form")) return;
  window.clearTimeout(calcTimer);
  calcTimer = window.setTimeout(() => {
    refreshCalc().catch((error) => {
      state.error = error.message;
    });
  }, 200);
});

window.addEventListener("hashchange", () => {
  showTab(location.hash.replace("#", ""));
});

api("/api/shop").then((shop) => {
  state.shop = shop;
  state.input = shop.defaults;
  const opening = location.hash.replace("#", "");
  showTab(opening);
}).catch((error) => {
  app.innerHTML = `<p>${esc(error.message)}。先在项目目录运行 go run ./cmd/server，再打开这个地址。</p>`;
});
