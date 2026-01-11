window.extractFreeSlots = (startDate, endDate, startTime, endTime, marginMinutes, minFreeTimeMinutes) => {
  // 時間を分に変換する関数
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  // 分を時間文字列に変換する関数（0パディングなし）
  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${String(mins).padStart(2, '0')}`;
  };
  
  // 日付をフォーマットする関数（M/D(曜日)形式）
  const formatDate = (dateStr) => {
    const date = new Date(dateStr + "T00:00:00");
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekday = weekdays[date.getDay()];
    return `${month}/${day}(${weekday})`;
  };
  
  const parseDate = d => new Date(d + "T00:00:00");
  // 探索範囲を1日進める（予定の日付が1日加算されているため）
  const s = parseDate(startDate);
  s.setDate(s.getDate() + 1);
  const e = parseDate(endDate);
  e.setDate(e.getDate() + 1);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const margin = marginMinutes || 0;
  const minFreeTime = minFreeTimeMinutes || 0;
  
  // 時間パターン（様々な形式に対応：–, -, 〜, ~, ～）
  const timePattern = /(\d{1,2}):(\d{2})\s*[–\-〜~～]\s*(\d{1,2}):(\d{2})/;
  
  let busy = [];
  const processedElements = new Set(); // 重複を防ぐ
  
  // 予定を取得する関数（複数の方法を試行）
  const findEventElements = () => {
    const candidates = [];
    const seenElements = new Set(); // 重複を防ぐ
    
    // 方法1: data-eventchip や data-eventid を持つ要素を優先的に探す（最も確実）
    const eventSelectors = [
      "[data-eventchip]",
      "[data-eventid]",
      "[role='button'][data-eventid]"
    ];
    
    for (const selector of eventSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          // これらの要素は予定要素の可能性が高い
          elements.forEach(el => {
            if (seenElements.has(el)) return;
            const textContent = el.textContent || "";
            const ariaLabel = el.getAttribute("aria-label") || "";
            // 時間パターンが含まれているか確認（textContentまたはaria-label）
            if (timePattern.test(textContent) || timePattern.test(ariaLabel)) {
              candidates.push(el);
              seenElements.add(el);
            }
          });
          if (candidates.length > 0) {
            console.log(`方法1で ${candidates.length} 個の予定要素を見つけました（セレクター: ${selector}）`);
            break;
          }
        }
      } catch (e) {
        // セレクターが無効な場合はスキップ
      }
    }
    
    // 方法2: aria-labelに時間パターンを含む要素を探す
    if (candidates.length === 0) {
      const allElements = document.querySelectorAll("*");
      allElements.forEach(el => {
        if (seenElements.has(el)) return;
        const ariaLabel = el.getAttribute("aria-label") || "";
        if (ariaLabel && timePattern.test(ariaLabel)) {
          candidates.push(el);
          seenElements.add(el);
        }
      });
      if (candidates.length > 0) {
        console.log(`方法2で ${candidates.length} 個の予定要素を見つけました`);
      }
    }
    
    // 方法3: テキストコンテンツに時間パターンを含む要素を探す
    if (candidates.length === 0) {
      const allElements = document.querySelectorAll("*");
      allElements.forEach(el => {
        if (seenElements.has(el)) return;
        const textContent = el.textContent || "";
        // 時間パターンを含み、適切な長さのテキストを持つ要素
        if (timePattern.test(textContent) && textContent.length < 500 && textContent.length > 5) {
          // 親要素が既に候補に含まれている場合はスキップ（重複を避ける）
          let isDuplicate = false;
          let parent = el.parentElement;
          for (let i = 0; i < 3 && parent; i++) {
            if (candidates.includes(parent)) {
              isDuplicate = true;
              break;
            }
            parent = parent.parentElement;
          }
          if (!isDuplicate) {
            candidates.push(el);
            seenElements.add(el);
          }
        }
      });
      if (candidates.length > 0) {
        console.log(`方法3で ${candidates.length} 個の予定要素を見つけました`);
      }
    }
    
    return candidates;
  };
  
  const foundEvents = findEventElements();
  
  // 予定を抽出
  foundEvents.forEach(ev => {
    // 重複チェック
    if (processedElements.has(ev)) return;
    processedElements.add(ev);
    
    const ariaLabel = ev.getAttribute("aria-label") || "";
    const textContent = ev.textContent || "";
    const label = ariaLabel || textContent;
    
    if (!label) return;
    
    // 時間パターンを抽出
    const match = label.match(timePattern);
    if (!match) return;
    
    const startH = String(match[1]).padStart(2, '0');
    const startM = String(match[2]).padStart(2, '0');
    const endH = String(match[3]).padStart(2, '0');
    const endM = String(match[4]).padStart(2, '0');
    const st = `${startH}:${startM}`;
    const et = `${endH}:${endM}`;
    
    // 日付を取得（複数の方法を試行）
    let day = null;
    let daySource = null; // デバッグ用：どの方法で日付を取得したか
    
    // 日付文字列を正規化する関数
    const normalizeDate = (dateStr) => {
      if (!dateStr) return null;
      
      // YYYY-MM-DD形式
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }
      
      // YYYYMMDD形式
      const dateMatch = dateStr.match(/(\d{4})(\d{2})(\d{2})/);
      if (dateMatch) {
        return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      }
      
      return null;
    };
    
    // グリッドセルを探す（デバッグ用に保持）
    let gridCell = null;
    let current = ev;
    for (let i = 0; i < 30 && current && current !== document.body; i++) {
      if (current.getAttribute("data-date") || 
          current.getAttribute("data-day") ||
          current.getAttribute("role") === "gridcell" ||
          current.tagName === "TD") {
        gridCell = current;
        break;
      }
      current = current.parentElement;
    }
    if (!gridCell) {
      gridCell = ev.closest("[data-date], [data-day], [role='gridcell'], td");
    }
    
    // 方法1: textContentから日付を推測（最も確実 - ユーザーの報告ではこれが正しい値を返している）
    const fullText = ev.textContent || "";
    // "2026年 1月 11日" や "2024年1月15日" のような形式
    const dateMatch = fullText.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
    if (dateMatch) {
      const year = dateMatch[1];
      const month = String(dateMatch[2]).padStart(2, '0');
      const date = String(dateMatch[3]).padStart(2, '0');
      day = `${year}-${month}-${date}`;
      daySource = "textContent (年 月 日形式)";
    } else {
      // "2024/1/15" や "2024-1-15" のような形式
      const dateMatch2 = fullText.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
      if (dateMatch2) {
        const year = dateMatch2[1];
        const month = String(dateMatch2[2]).padStart(2, '0');
        const date = String(dateMatch2[3]).padStart(2, '0');
        day = `${year}-${month}-${date}`;
        daySource = "textContent (YYYY/MM/DD形式)";
      }
    }
    
    // 方法2: aria-labelから日付を推測
    if (!day) {
      const fullLabel = ev.getAttribute("aria-label") || "";
      const dateMatch = fullLabel.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})/);
      if (dateMatch) {
        const year = dateMatch[1];
        const month = String(dateMatch[2]).padStart(2, '0');
        const date = String(dateMatch[3]).padStart(2, '0');
        day = `${year}-${month}-${date}`;
        daySource = "aria-label";
      }
    }
    
    // 方法3: カレンダーグリッドセルから日付を取得
    if (!day && gridCell) {
      day = normalizeDate(
        gridCell.getAttribute("data-date") || 
        gridCell.getAttribute("data-day")
      );
      if (day) {
        daySource = "gridCell (data-date/data-day)";
      } else {
        // グリッドセルに日付がない場合、親要素から探す
        let parent = gridCell.parentElement;
        for (let i = 0; i < 10 && parent; i++) {
          day = normalizeDate(
            parent.getAttribute("data-date") || 
            parent.getAttribute("data-day")
          );
          if (day) {
            daySource = "gridCell parent";
            break;
          }
          parent = parent.parentElement;
        }
      }
    }
    
    // 方法4: 要素自体と親要素からdata-date属性を探す
    if (!day) {
      current = ev;
      for (let i = 0; i < 30 && current && current !== document.body; i++) {
        day = normalizeDate(
          current.getAttribute("data-date") || 
          current.getAttribute("data-day") ||
          current.getAttribute("data-day-key") ||
          current.getAttribute("data-date-key")
        );
        if (day) {
          daySource = "element attribute";
          break;
        }
        current = current.parentElement;
      }
    }
    
    // 方法5: 予定要素の位置から日付を推測
    if (!day) {
      const rect = ev.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const elementAtPoint = document.elementFromPoint(centerX, centerY);
      if (elementAtPoint) {
        let checkEl = elementAtPoint;
        for (let i = 0; i < 20 && checkEl; i++) {
          day = normalizeDate(
            checkEl.getAttribute("data-date") || 
            checkEl.getAttribute("data-day")
          );
          if (day) {
            daySource = "elementFromPoint";
            break;
          }
          checkEl = checkEl.parentElement;
        }
      }
    }
    
    // 方法6: 周辺の要素から日付を探す
    if (!day) {
      const parent = ev.parentElement;
      if (parent) {
        const siblings = Array.from(parent.parentElement?.children || []);
        const evIndex = siblings.indexOf(parent);
        for (let offset = -2; offset <= 2; offset++) {
          const sibling = siblings[evIndex + offset];
          if (sibling) {
            day = normalizeDate(
              sibling.getAttribute("data-date") || 
              sibling.getAttribute("data-day")
            );
            if (day) {
              daySource = "sibling element";
              break;
            }
          }
        }
      }
    }
    
    // デバッグ: 日付抽出の詳細を記録
    const debugInfo = {
      textContent: textContent.substring(0, 150),
      ariaLabel: ariaLabel.substring(0, 100),
      extractedTime: `${st} - ${et}`,
      foundDate: day,
      daySource: daySource,
      gridCellDate: gridCell ? normalizeDate(gridCell.getAttribute("data-date") || gridCell.getAttribute("data-day")) : null,
      gridCellElement: gridCell ? gridCell.tagName + (gridCell.className ? "." + gridCell.className.split(" ")[0] : "") : null
    };
    
    if (!day) {
      console.warn("⚠️ 日付が見つかりませんでした:", debugInfo);
      return;
    }
    
    const dayDate = new Date(day + "T00:00:00");
    if (isNaN(dayDate.getTime())) {
      console.warn("⚠️ 無効な日付:", day, debugInfo);
      return;
    }
    
    // 日付を1日進める（textContentの日付が1日ずれているため）
    dayDate.setDate(dayDate.getDate() + 1);
    
    // 日付範囲チェック
    const dayStr = dayDate.toISOString().split("T")[0];
    if (dayStr < startDate || dayStr > endDate) {
      console.log(`日付範囲外の予定をスキップ: ${dayStr} (範囲: ${startDate} ～ ${endDate})`);
      return;
    }
    
    debugInfo.finalDate = dayStr;
    console.log("✅ 予定を抽出:", {
      date: dayStr,
      time: `${st} - ${et}`,
      debug: debugInfo
    });
    
    busy.push({
      date: dayStr,
      start: st,
      end: et
    });
  });
  
  // デバッグ情報（常に表示）
  console.log("=== 予定抽出デバッグ情報 ===");
  console.log("検索した要素数:", foundEvents.length);
  console.log("見つかった予定:", busy);
  console.log("日付範囲:", startDate, "～", endDate);
  console.log("時間範囲:", startTime, "～", endTime);
  console.log("マージン:", margin, "分");
  
  // 日付ごとに予定をグループ化して表示
  const busyByDate = {};
  busy.forEach(b => {
    if (!busyByDate[b.date]) {
      busyByDate[b.date] = [];
    }
    busyByDate[b.date].push(`${b.start}~${b.end}`);
  });
  console.log("日付ごとの予定:");
  Object.keys(busyByDate).sort().forEach(date => {
    console.log(`  ${date}: ${busyByDate[date].join(", ")}`);
  });
  
  if (foundEvents.length > 0) {
    console.log("予定要素の詳細（最初の10個）:");
    foundEvents.slice(0, 10).forEach((ev, i) => {
      const textContent = ev.textContent || "";
      const ariaLabel = ev.getAttribute("aria-label") || "";
      console.log(`[${i}]`, {
        tagName: ev.tagName,
        className: ev.className?.substring(0, 50),
        dataEventchip: ev.getAttribute("data-eventchip"),
        dataEventid: ev.getAttribute("data-eventid")?.substring(0, 30),
        ariaLabel: ariaLabel.substring(0, 100),
        textContent: textContent.substring(0, 150),
        closestDataDate: ev.closest("[data-date]")?.getAttribute("data-date"),
        hasTimePattern: timePattern.test(textContent) || timePattern.test(ariaLabel)
      });
    });
  } else {
    console.log("⚠️ 予定要素が見つかりませんでした");
    console.log("data-eventchip要素:", document.querySelectorAll("[data-eventchip]").length, "個");
    console.log("data-eventid要素:", document.querySelectorAll("[data-eventid]").length, "個");
  }
  
  // 空き時間を計算（日付ごとにグループ化）
  const resultByDate = {}; // { "2026-01-11": ["08:00 - 10:00", "12:00 - 20:00"], ... }
  const datesWithoutEvents = []; // 予定が見つからなかった日付のリスト
  
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const dayStr = d.toISOString().split("T")[0];
    const dayBusy = busy.filter(b => b.date === dayStr);
    
    // 予定が見つからなかった日付を記録
    if (dayBusy.length === 0) {
      datesWithoutEvents.push(dayStr);
    }
    
    // マージンを考慮して予定時間を拡張
    const busyWithMargin = dayBusy.map(b => {
      const startMins = timeToMinutes(b.start) - margin;
      const endMins = timeToMinutes(b.end) + margin;
      return {
        start: Math.max(0, startMins),
        end: Math.min(24 * 60, endMins)
      };
    });
    
    // 予定を開始時間でソート
    busyWithMargin.sort((a, b) => a.start - b.start);
    
    // マージを処理（重複する予定を結合）
    const merged = [];
    for (const b of busyWithMargin) {
      if (merged.length === 0) {
        merged.push({ ...b });
      } else {
        const last = merged[merged.length - 1];
        if (b.start <= last.end) {
          last.end = Math.max(last.end, b.end);
        } else {
          merged.push({ ...b });
        }
      }
    }
    
    // 指定された時間範囲内の空き時間を計算
    let current = startMinutes;
    const freeSlots = []; // この日の空き時間リスト
    
    // デバッグ: この日の予定情報
    if (dayBusy.length > 0) {
      console.log(`\n[${dayStr}] 予定処理:`);
      console.log(`  元の予定:`, dayBusy.map(b => `${b.start}~${b.end}`).join(", "));
      console.log(`  マージン適用後:`, busyWithMargin.map(b => `${minutesToTime(b.start)}~${minutesToTime(b.end)}`).join(", "));
      console.log(`  マージ後:`, merged.map(b => `${minutesToTime(b.start)}~${minutesToTime(b.end)}`).join(", "));
    }
    
    // 予定がない場合は、指定された時間範囲全体が空き時間
    if (merged.length === 0) {
      const freeDuration = endMinutes - startMinutes;
      // 最小空き時間以上の場合は追加（閾値を含む）
      if (freeDuration >= minFreeTime) {
        freeSlots.push(`${minutesToTime(startMinutes)}~${minutesToTime(endMinutes)}`);
      } else {
        console.log(`  [${dayStr}] 空き時間をスキップ: ${minutesToTime(startMinutes)}~${minutesToTime(endMinutes)} (${freeDuration}分 < ${minFreeTime}分)`);
      }
    } else {
      // 予定がある場合
      merged.forEach((b, index) => {
        // 予定の開始時刻が現在の時刻より後で、かつ指定された時間範囲内にある場合
        if (b.start > current && current < endMinutes) {
          const freeStart = Math.max(current, startMinutes);
          const freeEnd = Math.min(b.start, endMinutes);
          if (freeStart < freeEnd) {
            // 空き時間の長さを計算（分）
            const freeDuration = freeEnd - freeStart;
            // 最小空き時間以上の場合は追加（閾値を含む）
            if (freeDuration >= minFreeTime) {
              const freeSlot = `${minutesToTime(freeStart)}~${minutesToTime(freeEnd)}`;
              freeSlots.push(freeSlot);
              console.log(`  [${dayStr}] 空き時間追加: ${freeSlot} (${freeDuration}分, 予定前: current=${minutesToTime(current)}, 予定開始=${minutesToTime(b.start)})`);
            } else {
              console.log(`  [${dayStr}] 空き時間をスキップ: ${minutesToTime(freeStart)}~${minutesToTime(freeEnd)} (${freeDuration}分 < ${minFreeTime}分)`);
            }
          }
        }
        // 現在の時刻を予定の終了時刻に更新（ただし、予定の終了時刻が現在の時刻より前の場合は更新しない）
        const oldCurrent = current;
        current = Math.max(current, b.end);
        console.log(`  [${dayStr}] 予定[${index}]: ${minutesToTime(b.start)}~${minutesToTime(b.end)}, current: ${minutesToTime(oldCurrent)} → ${minutesToTime(current)}`);
      });
      
      // 最後の予定から終了時刻までの空き時間
      if (current < endMinutes) {
        const freeStart = Math.max(current, startMinutes);
        const freeEnd = endMinutes;
        if (freeStart < freeEnd) {
          // 空き時間の長さを計算（分）
          const freeDuration = freeEnd - freeStart;
          // 最小空き時間以上の場合は追加（閾値を含む）
          if (freeDuration >= minFreeTime) {
            const freeSlot = `${minutesToTime(freeStart)}~${minutesToTime(freeEnd)}`;
            freeSlots.push(freeSlot);
            console.log(`  [${dayStr}] 空き時間追加: ${freeSlot} (${freeDuration}分, 最後の予定後)`);
          } else {
            console.log(`  [${dayStr}] 空き時間をスキップ: ${minutesToTime(freeStart)}~${minutesToTime(freeEnd)} (${freeDuration}分 < ${minFreeTime}分)`);
          }
        }
      }
    }
    
    // 空き時間がある場合のみ、日付ごとに保存
    if (freeSlots.length > 0) {
      resultByDate[dayStr] = freeSlots;
    }
  }
  
  // 日付ごとに結果を整形（同じ日付の空き時間をカンマ区切りで結合）
  const result = [];
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const dayStr = d.toISOString().split("T")[0];
    if (resultByDate[dayStr] && resultByDate[dayStr].length > 0) {
      const formattedDate = formatDate(dayStr);
      result.push(`${formattedDate} ${resultByDate[dayStr].join(", ")}`);
    }
  }
  
  // 結果テキストと予定が見つからなかった日付のリストを返す
  return {
    text: result.length > 0 ? result.join("\n") : "",
    datesWithoutEvents: datesWithoutEvents
  };
};

  // デバッグ機能: Google CalendarのDOM構造を調査
window.debugCalendarStructure = () => {
  console.log("=== Google Calendar DOM構造の調査 ===");
  
  const timePattern = /(\d{1,2}):(\d{2})\s*[–\-〜~～]\s*(\d{1,2}):(\d{2})/;
  
  // data-eventchip や data-eventid を持つ要素を探す
  const eventElements = document.querySelectorAll("[data-eventchip], [data-eventid]");
  console.log(`data-eventchip/data-eventid を持つ要素: ${eventElements.length}個`);
  
  const candidates = [];
  
  eventElements.forEach((el, i) => {
    const textContent = el.textContent || "";
    const ariaLabel = el.getAttribute("aria-label") || "";
    const hasTimePattern = timePattern.test(textContent) || timePattern.test(ariaLabel);
    
    if (hasTimePattern || i < 10) { // 最初の10個は必ず表示
      candidates.push({
        index: i,
        tagName: el.tagName,
        className: el.className?.substring(0, 50),
        dataEventchip: el.getAttribute("data-eventchip"),
        dataEventid: el.getAttribute("data-eventid")?.substring(0, 30),
        ariaLabel: ariaLabel.substring(0, 100),
        textContent: textContent.substring(0, 200),
        hasTimePattern: hasTimePattern,
        closestDataDate: el.closest("[data-date]")?.getAttribute("data-date"),
        parent: el.parentElement?.tagName
      });
    }
  });
  
  console.log(`\n予定要素の詳細（最初の20個）:`);
  candidates.slice(0, 20).forEach((c, i) => {
    console.log(`[${i}]`, c);
  });
  
  // 時間パターンを含むすべての要素を探す
  const allElements = document.querySelectorAll("*");
  const timePatternElements = [];
  allElements.forEach(el => {
    const ariaLabel = el.getAttribute("aria-label") || "";
    const textContent = el.textContent || "";
    
    if ((ariaLabel && timePattern.test(ariaLabel)) || 
        (textContent && timePattern.test(textContent) && textContent.length < 500)) {
      timePatternElements.push({
        tagName: el.tagName,
        className: el.className?.substring(0, 50),
        ariaLabel: ariaLabel.substring(0, 100),
        textContent: textContent.substring(0, 150),
        closestDataDate: el.closest("[data-date]")?.getAttribute("data-date")
      });
    }
  });
  
  console.log(`\n時間パターンを含む要素: ${timePatternElements.length}個`);
  timePatternElements.slice(0, 10).forEach((c, i) => {
    console.log(`[${i}]`, c);
  });
  
  // カレンダーグリッド構造を調査
  const gridCells = document.querySelectorAll("[data-date], [data-day], [role='gridcell']");
  console.log(`\nカレンダーグリッドセル: ${gridCells.length}個`);
  
  return {
    eventElementsCount: eventElements.length,
    candidates: candidates.slice(0, 20),
    timePatternElementsCount: timePatternElements.length,
    gridCellsCount: gridCells.length
  };
};