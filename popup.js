// 日付の初期値を設定（明日と今日から1週間後）
window.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const oneWeekLater = new Date(today);
  oneWeekLater.setDate(today.getDate() + 7);
  
  // YYYY-MM-DD形式に変換
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  document.getElementById("start").value = formatDate(tomorrow);
  document.getElementById("end").value = formatDate(oneWeekLater);
  
  // Enterキーでコピーできるようにする
  const copyFunction = async () => {
    const start = document.getElementById("start").value;
    const end = document.getElementById("end").value;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;
    const margin = parseInt(document.getElementById("margin").value) || 0;
    const minFreeTime = parseInt(document.getElementById("minFreeTime").value) || 0;
    
    if (!start || !end) {
      alert("開始日と終了日を入力してください");
      return;
    }
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // デバッグモードを有効化
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => { window.DEBUG_CALENDAR = true; }
    });
    
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (s, e, st, et, m, minFt) => window.extractFreeSlots(s, e, st, et, m, minFt),
      args: [start, end, startTime, endTime, margin, minFreeTime]
    }).then(res => {
      const result = res[0].result;
      let text = "";
      let datesWithoutEvents = [];
      
      // 結果がオブジェクトの場合は新しい形式、文字列の場合は古い形式
      if (typeof result === "object" && result !== null) {
        text = result.text || "";
        datesWithoutEvents = result.datesWithoutEvents || [];
      } else {
        text = result || "";
      }
      
      if (text) {
        navigator.clipboard.writeText(text);
        let alertMessage = "コピーしました！\n\n" + text;
        
        // 予定が見つからなかった日付があれば追加
        if (datesWithoutEvents.length > 0) {
          const formatDate = (dateStr) => {
            const date = new Date(dateStr + "T00:00:00");
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const weekday = weekdays[date.getDay()];
            return `${month}/${day}(${weekday})`;
          };
          
          const formattedDates = datesWithoutEvents.map(formatDate).join("\n ");
          alertMessage += "\n\n⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️\n以下の日付は予定が見つかりませんでした\nコピー対象の日付をブラウザで表示してください\n" + formattedDates + "\n⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️";
        }
        
        alert(alertMessage);
      } else {
        alert("空き時間が見つかりませんでした。\nコンソール（F12）でデバッグ情報を確認してください。");
      }
    }).catch(err => {
      alert("エラーが発生しました: " + err.message);
    });
  };
  
  // コピーボタンのクリックイベント
  document.getElementById("copy").onclick = copyFunction;
  
  // Ctrl+Enter（MacではCmd+Enter）でコピーできるようにする
  document.addEventListener("keydown", (e) => {
    // Ctrl+Enter または Cmd+Enter（Mac）
    if ((e.ctrlKey || e.metaKey) && (e.key === "Enter" || e.keyCode === 13)) {
      e.preventDefault();
      e.stopPropagation();
      copyFunction();
    }
  });
});

// コピー関数はDOMContentLoaded内で定義されるため、ここでは削除

document.getElementById("debug").onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  try {
    // まず、content scriptが読み込まれているか確認
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (typeof window.debugCalendarStructure === 'function') {
          window.debugCalendarStructure();
          return "デバッグ情報をコンソールに出力しました。F12キーで開発者ツールを開いて確認してください。";
        } else {
          // content scriptが読み込まれていない可能性がある
          console.log("=== デバッグ: content scriptの状態確認 ===");
          console.log("window.extractFreeSlots:", typeof window.extractFreeSlots);
          console.log("window.debugCalendarStructure:", typeof window.debugCalendarStructure);
          return "デバッグ機能が見つかりませんでした。拡張機能を再読み込みしてください。";
        }
      }
    });
    alert(result[0].result);
  } catch (err) {
    alert("エラーが発生しました: " + err.message + "\n\nGoogle Calendarのページで実行してください。");
  }
};