// テスト用のユーティリティ関数
// 注意: これは実際のGoogle CalendarのDOM構造を模擬するためのテストです

// テストケース1: 予定が1つある場合の期待結果
const testCase1 = {
  description: "予定が1つある場合",
  input: {
    startDate: "2024-01-15",
    endDate: "2024-01-15",
    startTime: "08:00",
    endTime: "20:00",
    margin: 0
  },
  expected: [
    "2024-01-15 08:00 - 10:00",
    "2024-01-15 11:00 - 20:00"
  ],
  events: [
    { date: "2024-01-15", start: "10:00", end: "11:00" }
  ]
};

// テストケース2: 予定が複数ある場合の期待結果
const testCase2 = {
  description: "予定が複数ある場合",
  input: {
    startDate: "2024-01-15",
    endDate: "2024-01-15",
    startTime: "08:00",
    endTime: "20:00",
    margin: 0
  },
  expected: [
    "2024-01-15 08:00 - 09:00",
    "2024-01-15 10:00 - 14:00",
    "2024-01-15 15:00 - 20:00"
  ],
  events: [
    { date: "2024-01-15", start: "09:00", end: "10:00" },
    { date: "2024-01-15", start: "14:00", end: "15:00" }
  ]
};

// テストケース3: マージンがある場合の期待結果
const testCase3 = {
  description: "マージンが30分ある場合",
  input: {
    startDate: "2024-01-15",
    endDate: "2024-01-15",
    startTime: "08:00",
    endTime: "20:00",
    margin: 30
  },
  expected: [
    "2024-01-15 08:00 - 09:30",
    "2024-01-15 11:30 - 20:00"
  ],
  events: [
    { date: "2024-01-15", start: "10:00", end: "11:00" }
  ]
};

// テストケース4: 予定がない場合の期待結果
const testCase4 = {
  description: "予定がない場合",
  input: {
    startDate: "2024-01-15",
    endDate: "2024-01-15",
    startTime: "08:00",
    endTime: "20:00",
    margin: 0
  },
  expected: [
    "2024-01-15 08:00 - 20:00"
  ],
  events: []
};

console.log("=== テストケース定義 ===");
console.log("テストケース1:", testCase1.description);
console.log("テストケース2:", testCase2.description);
console.log("テストケース3:", testCase3.description);
console.log("テストケース4:", testCase4.description);
console.log("\n注意: 実際のテストはGoogle Calendar上で実行してください。");
console.log("デバッグボタンを使用してDOM構造を確認し、予定が正しく取得できているか確認してください。");

// Node.js環境で実行可能にする
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testCase1, testCase2, testCase3, testCase4 };
}
