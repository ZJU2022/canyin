// 这个文件只负责画。
// 店的平面图、两条路的动画、一天的钱柜，都在这里。
// 保本碗数和那句结论从 /api/calc 来，算法在 internal/logic，这里不再算第二遍。

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function yuanText(n) {
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const body = abs >= 100 || Math.abs(abs - Math.round(abs)) < 0.001
    ? String(Math.round(abs))
    : abs.toFixed(1);
  return sign + body + " 元";
}

function earnLine(orders, profit) {
  if (profit >= 0) return "卖出 " + orders + " 碗，赚 " + yuanText(profit);
  return "卖出 " + orders + " 碗，亏 " + yuanText(-profit);
}

function partById(shop, id) {
  return (shop.parts || []).find((item) => item.id === id) || { id, name: id, lesson: "" };
}

// zone 画出可点的一块。selected 和这块的 id 相同，就涂成黄色。
function zone(id, selected, x, y, w, h, lines) {
  const on = id === selected ? " on" : "";
  const tspans = lines.map((line, i) =>
    `<tspan x="${x + w / 2}" dy="${i === 0 ? 0 : 22}">${esc(line)}</tspan>`,
  ).join("");
  const textY = y + h / 2 - (lines.length - 1) * 11;
  return `<g class="hot${on}" data-part="${id}">
    <rect class="face" x="${x}" y="${y}" width="${w}" height="${h}"></rect>
    <text x="${x + w / 2}" y="${textY}" text-anchor="middle">${tspans}</text>
  </g>`;
}

// shopPicture 是一家店的平面。上面三问，中间堂食和外卖，旁边钱柜。
function shopPicture(shop, selected) {
  const name = (id) => partById(shop, id).name;
  return `<svg class="stage" viewBox="0 0 960 620" role="img" aria-label="一家店的平面：定位、堂食、外卖、后厨和钱柜">
    <text x="20" y="28" font-size="14" fill="#666">点黄色这一块，下面会讲它。三问决定招牌，两个入口把钱送进钱柜。</text>
    ${zone("who", selected, 20, 44, 200, 78, [name("who")])}
    ${zone("guest", selected, 236, 44, 200, 78, [name("guest")])}
    ${zone("rival", selected, 452, 44, 208, 78, [name("rival")])}
    <path d="M120 122 V146 H340 V200" fill="none" stroke="#999" stroke-width="1.5"></path>
    <path d="M336 122 V146" fill="none" stroke="#999" stroke-width="1.5"></path>
    <path d="M556 122 V146 H340" fill="none" stroke="#999" stroke-width="1.5"></path>

    <rect x="20" y="168" width="640" height="360" fill="none" stroke="#1a1a1a" stroke-width="2"></rect>
    <text x="32" y="192" font-size="13" fill="#666">店</text>
    ${zone("dish", selected, 170, 200, 340, 64, [name("dish"), "只让人记住一道"])}
    ${zone("dine", selected, 40, 284, 280, 130, [name("dine"), "客人走进来", "一碗约留 3 元"])}
    ${zone("online", selected, 360, 284, 280, 130, [name("online"), "平台骑手来取", "活动时可能亏"])}
    ${zone("mom", selected, 40, 430, 200, 78, [name("mom"), "出品和速度"])}
    ${zone("you", selected, 260, 430, 380, 78, [name("you"), "战略、计划和每天的账"])}

    ${zone("ledger", selected, 700, 200, 240, 220, [name("ledger"), "毛利先填房租", "填满才算赚"])}
    <path d="M660 340 H700" fill="none" stroke="#2f6f4e" stroke-width="2"></path>
    <path d="M660 362 H700" fill="none" stroke="#c4473a" stroke-width="2" stroke-dasharray="4 4"></path>
    <text x="700" y="448" font-size="13" fill="#2f6f4e">实线：堂食留下的</text>
    <text x="700" y="470" font-size="13" fill="#c4473a">虚线：活动可能拿走的</text>
  </svg>`;
}

// twoPaths 用两个移动的点，表示同一碗饭走堂食或走外卖。
function twoPaths() {
  return `<svg id="paths" class="stage" viewBox="0 0 860 250" role="img" aria-label="同一碗饭的两条路">
    <rect x="24" y="36" width="110" height="52" fill="#fff" stroke="#1a1a1a"></rect>
    <text x="79" y="68" text-anchor="middle" font-size="16">客人</text>
    <rect x="250" y="36" width="150" height="52" fill="#c5e0d0" stroke="#2f6f4e"></rect>
    <text x="325" y="68" text-anchor="middle" font-size="16">走进堂食</text>
    <rect x="560" y="36" width="250" height="52" fill="#c5e0d0" stroke="#2f6f4e"></rect>
    <text x="685" y="68" text-anchor="middle" font-size="16">钱柜留下约 3 元</text>
    <line x1="79" y1="96" x2="685" y2="96" stroke="#2f6f4e" stroke-width="2"></line>
    <circle r="7" cy="96" fill="#2f6f4e">
      <animate attributeName="cx" values="79;79;325;325;685;685;79" keyTimes="0;0.08;0.28;0.4;0.62;0.78;1" dur="8s" repeatCount="indefinite"></animate>
    </circle>

    <rect x="24" y="140" width="110" height="52" fill="#fff" stroke="#1a1a1a"></rect>
    <text x="79" y="172" text-anchor="middle" font-size="16">客人</text>
    <rect x="230" y="140" width="190" height="52" fill="#f3c1b8" stroke="#c4473a"></rect>
    <text x="325" y="172" text-anchor="middle" font-size="16">外卖，要参加活动</text>
    <rect x="560" y="140" width="250" height="52" fill="#f3c1b8" stroke="#c4473a"></rect>
    <text x="685" y="172" text-anchor="middle" font-size="16">留下 1 元，或被拿走</text>
    <line x1="79" y1="200" x2="420" y2="200" stroke="#c4473a" stroke-width="2"></line>
    <line x1="420" y1="200" x2="685" y2="200" stroke="#c4473a" stroke-width="2" stroke-dasharray="5 4"></line>
    <circle r="7" cy="200" fill="#c4473a">
      <animate attributeName="cx" values="79;79;325;325;685;685;79" keyTimes="0;0.08;0.28;0.4;0.62;0.78;1" dur="8s" repeatCount="indefinite"></animate>
    </circle>
  </svg>`;
}

// 把一句长话按字数切开，避免画到图的外面。
function svgLines(text, x, y, size, maxChars, fill) {
  const chars = [...String(text)];
  const lines = [];
  for (let i = 0; i < chars.length; i += maxChars) lines.push(chars.slice(i, i + maxChars).join(""));
  return lines.map((line, i) =>
    `<text x="${x}" y="${y + i * (size + 8)}" font-size="${size}" fill="${fill}">${esc(line)}</text>`,
  ).join("");
}

// moneyPicture 画两样东西：堂食一碗怎么切开，以及这一天的毛利有没有漫过固定开支。
function moneyPicture(input, calc) {
  if (!calc) return `<p class="small">正在算这一天…</p>`;
  const price = Math.max(input.price, 0);
  const keep = input.offline_keep;
  const food = Math.max(calc.food, 0);
  const barX = 40;
  const barW = 640;
  let foodW = 0;
  let keepW = 0;
  if (price > 0 && keep >= 0) {
    foodW = Math.min(barW, (food / price) * barW);
    keepW = Math.max(0, barW - foodW);
  } else if (price > 0) {
    foodW = barW;
  }
  const keepLabelX = Math.min(barX + foodW + 8, barX + barW - 120);

  const fixed = Math.max(calc.fixed, 0);
  const gross = calc.day_gross;
  // 留出一截空白，固定开支的横线就不会贴在箱子边上。
  const top = Math.max(fixed, gross, 1) * 1.2;
  const tankX = 40;
  const tankY = 150;
  const tankW = 160;
  const tankH = 220;
  const bottom = tankY + tankH;
  const fillH = gross > 0 ? (gross / top) * tankH : 0;
  const fillY = bottom - fillH;
  const lineY = bottom - (fixed / top) * tankH;
  const water = calc.covered ? "#c5e0d0" : "#f3c1b8";
  const waterStroke = calc.covered ? "#2f6f4e" : "#c4473a";
  const verdict = calc.covered ? "水面高过横线：这一天盖住了固定开支" : "水面在横线下面：这一天还没盖住";

  const channels = calc.channels || [];
  const maxAbs = Math.max(1, ...channels.map((item) => Math.abs(item.gross)));
  const bars = channels.map((item, index) => {
    const y = 500 + index * 36;
    const width = Math.max(4, (Math.abs(item.gross) / maxAbs) * 220);
    const color = item.id === "dine" ? "#2f6f4e" : item.id === "promo" ? "#c4473a" : "#8a6a32";
    return `<text x="40" y="${y}" font-size="15" fill="#333">${esc(item.name)} ${item.orders} 碗</text>
      <rect x="280" y="${y - 12}" width="${width.toFixed(1)}" height="14" fill="${color}"></rect>
      <text x="520" y="${y}" font-size="15" fill="#333">${esc(yuanText(item.gross))}</text>`;
  }).join("");

  const side = [
    svgLines(calc.formula, 250, 168, 15, 34, "#1a1a1a"),
    `<text x="250" y="230" font-size="15" fill="#333">${esc(earnLine(input.orders, calc.day_profit))}</text>`,
    `<text x="250" y="258" font-size="15" fill="#333">按 30 天都营业，月结果约 ${esc(yuanText(calc.month_profit))}</text>`,
    svgLines(verdict, 250, 292, 15, 22, waterStroke),
  ].join("");

  return `<svg class="stage" viewBox="0 0 760 620" role="img" aria-label="堂食一碗的切开，以及这一天毛利和固定开支">
    <text x="40" y="28" font-size="16" font-weight="700">堂食的一碗</text>
    <rect x="${barX}" y="44" width="${barW}" height="36" fill="#f3f3f3" stroke="#ccc"></rect>
    <rect x="${barX}" y="44" width="${foodW.toFixed(1)}" height="36" fill="#e4ddd4" stroke="#5c4038"></rect>
    <rect x="${(barX + foodW).toFixed(1)}" y="44" width="${keepW.toFixed(1)}" height="36" fill="#c5e0d0" stroke="#2f6f4e"></rect>
    <text x="40" y="102" font-size="15" fill="#5c4038">食材 ${esc(yuanText(calc.food))}</text>
    <text x="${keepLabelX.toFixed(1)}" y="102" font-size="15" fill="#2f6f4e">留下 ${esc(yuanText(keep))}</text>

    <text x="40" y="138" font-size="16" font-weight="700">这一天的钱柜</text>
    <rect x="${tankX}" y="${tankY}" width="${tankW}" height="${tankH}" fill="#fff" stroke="#1a1a1a" stroke-width="2"></rect>
    <rect x="${tankX}" y="${fillY.toFixed(1)}" width="${tankW}" height="${fillH.toFixed(1)}" fill="${water}" stroke="${waterStroke}"></rect>
    <line x1="${tankX - 6}" y1="${lineY.toFixed(1)}" x2="${tankX + tankW + 6}" y2="${lineY.toFixed(1)}" stroke="#8a6a32" stroke-width="2" stroke-dasharray="6 4"></line>
    <text x="${tankX + 8}" y="${Math.max(tankY + 18, lineY - 8).toFixed(1)}" font-size="13" fill="#8a6a32">固定开支 ${esc(yuanText(calc.fixed))}</text>
    <text x="${tankX + 8}" y="${Math.min(bottom - 12, fillY + 20).toFixed(1)}" font-size="13" fill="${waterStroke}">毛利 ${esc(yuanText(gross))}</text>
    ${side}

    <text x="40" y="470" font-size="15" fill="#555">三种入口的毛利。绿色加进钱柜，红色从钱柜拿走。</text>
    ${bars}
  </svg>`;
}
