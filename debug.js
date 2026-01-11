// Google CalendarのDOM構造を調査するためのデバッグ関数
window.debugCalendarStructure = () => {
  console.log("=== Google Calendar DOM構造の調査 ===");
  
  // 様々なセレクターを試行
  const selectors = [
    "[data-eventid]",
    "[role='button'][aria-label*=':']",
    "[data-eventchip]",
    ".YvxTzc",
    ".Xi2kCe",
    "[jsaction*='event']",
    "[data-event-time]",
    "[aria-label*='–']",
    "[aria-label*='-']",
    "[aria-label*='〜']"
  ];
  
  const results = {};
  
  selectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        results[selector] = {
          count: elements.length,
          sample: Array.from(elements.slice(0, 3)).map(el => ({
            ariaLabel: el.getAttribute("aria-label"),
            textContent: el.textContent?.substring(0, 50),
            className: el.className,
            dataAttributes: Array.from(el.attributes)
              .filter(attr => attr.name.startsWith("data-"))
              .map(attr => `${attr.name}="${attr.value}"`),
            parent: el.parentElement?.tagName,
            closestDataDate: el.closest("[data-date]")?.getAttribute("data-date")
          }))
        };
      }
    } catch (e) {
      results[selector] = { error: e.message };
    }
  });
  
  console.log("調査結果:", results);
  
  // カレンダーのグリッド構造を調査
  console.log("\n=== カレンダーグリッド構造 ===");
  const gridSelectors = [
    "[data-date]",
    "[role='gridcell']",
    "[data-day]",
    "table[role='grid']",
    "[jsname]"
  ];
  
  gridSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`${selector}: ${elements.length}個見つかりました`);
      if (elements.length <= 5) {
        Array.from(elements).forEach((el, i) => {
          console.log(`  [${i}]`, {
            date: el.getAttribute("data-date") || el.getAttribute("data-day"),
            text: el.textContent?.substring(0, 30),
            children: el.children.length
          });
        });
      }
    }
  });
  
  return results;
};

// 予定要素を探す関数
window.findEventElements = () => {
  console.log("=== 予定要素の検索 ===");
  
  // すべての要素を走査して、時間パターンを含むものを探す
  const allElements = document.querySelectorAll("*");
  const timePattern = /\d{1,2}:\d{2}\s*[–-〜]\s*\d{1,2}:\d{2}/;
  
  const candidates = [];
  
  allElements.forEach(el => {
    const ariaLabel = el.getAttribute("aria-label");
    const textContent = el.textContent;
    
    if (ariaLabel && timePattern.test(ariaLabel)) {
      candidates.push({
        element: el,
        ariaLabel: ariaLabel,
        textContent: textContent?.substring(0, 50),
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        parent: el.parentElement?.tagName,
        closestDataDate: el.closest("[data-date]")?.getAttribute("data-date"),
        path: getElementPath(el)
      });
    } else if (textContent && timePattern.test(textContent) && textContent.length < 100) {
      candidates.push({
        element: el,
        ariaLabel: ariaLabel,
        textContent: textContent?.substring(0, 50),
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        parent: el.parentElement?.tagName,
        closestDataDate: el.closest("[data-date]")?.getAttribute("data-date"),
        path: getElementPath(el)
      });
    }
  });
  
  console.log(`候補要素: ${candidates.length}個見つかりました`);
  candidates.slice(0, 10).forEach((c, i) => {
    console.log(`[${i}]`, c);
  });
  
  return candidates;
};

// 要素のパスを取得
function getElementPath(el) {
  const path = [];
  while (el && el !== document.body) {
    let selector = el.tagName.toLowerCase();
    if (el.id) {
      selector += `#${el.id}`;
    } else if (el.className) {
      const classes = el.className.split(" ").filter(c => c).slice(0, 2).join(".");
      if (classes) selector += `.${classes}`;
    }
    path.unshift(selector);
    el = el.parentElement;
  }
  return path.join(" > ");
}
