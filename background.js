// キーボードショートカットでポップアップを開く
chrome.commands.onCommand.addListener((command) => {
  if (command === "open-popup") {
    // ポップアップを新しいウィンドウとして開く
    chrome.windows.create({
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 350,
      height: 400
    });
  }
});
