// 假資料庫
let items = [
  { code: "A001", name: "螺絲刀", category: "工具", stock: 10, image: "images/tool1.jpg" },
  { code: "B002", name: "手套", category: "安全用品", stock: 5, image: "images/glove.jpg" },
];

// 頁面切換
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
}

// 找品項
function findItemByCode(code) {
  return items.find(item => item.code === code);
}

// 顯示備品列表
function renderItemList() {
  const itemList = document.getElementById("itemList");
  itemList.innerHTML = "";
  items.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.code}</td>
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td>${item.stock}</td>
      <td><img src="${item.image}" style="max-width:50px" /></td>
      <td><button onclick="editItem('${item.code}')">編集</button></td>
    `;
    itemList.appendChild(row);
  });

  document.getElementById("itemCount").textContent = items.length;
}

// 顯示訊息
function showMessage(message, success = true) {
  const noteLog = document.getElementById("noteLog");
  noteLog.innerHTML = `<p style="color: ${success ? 'green' : 'red'};">${message}</p>`;
}

// 入庫掃描成功
function onScanInSuccess(decodedText) {
  const item = findItemByCode(decodedText);
  document.getElementById("scanResult").textContent = decodedText;

  if (item) {
    document.getElementById("itemName").textContent = item.name;
    document.getElementById("itemStock").textContent = item.stock;
    document.getElementById("itemImage").src = item.image || "";
    document.getElementById("itemImageWrapper").style.display = item.image ? "block" : "none";
    document.getElementById("itemInfo").style.display = "block";
    document.getElementById("newItemForm").style.display = "none";
    showMessage("✅ 入庫掃描成功", true);
  } else {
    document.getElementById("itemInfo").style.display = "none";
    document.getElementById("newItemCode").value = decodedText;
    document.getElementById("newItemName").value = "";
    document.getElementById("newItemCategory").value = "";
    document.getElementById("newItemQty").value = 1;
    document.getElementById("newItemForm").style.display = "block";
    showMessage("❌ 找不到該備品編號，請新增備品", false);
  }
}

// 出庫掃描成功
function onScanOutSuccess(decodedText) {
  const item = findItemByCode(decodedText);
  document.getElementById("scanOutResult").textContent = decodedText;

  if (item) {
    document.getElementById("outItemName").textContent = item.name;
    document.getElementById("outItemStock").textContent = item.stock;
    document.getElementById("outItemCategory").value = item.category;
    document.getElementById("outItemStockInput").value = item.stock;
    document.getElementById("outItemInfo").style.display = "block";
    showOutMessage("✅ 出庫掃描成功", true);
  } else {
    document.getElementById("outItemInfo").style.display = "none";
    showOutMessage("❌ 找不到該備品編號", false);
  }
}

// 新增備品
function addNewItem() {
  const code = document.getElementById("newItemCode").value.trim();
  const name = document.getElementById("newItemName").value.trim();
  const category = document.getElementById("newItemCategory").value.trim();
  const qty = parseInt(document.getElementById("newItemQty").value, 10);

  if (!code || !name || !category || isNaN(qty) || qty <= 0) {
    alert("請填寫完整且正確的資料");
    return;
  }

  if (findItemByCode(code)) {
    alert("備品編號已存在");
    return;
  }

  items.push({ code, name, category, stock: qty, image: "" });
  renderItemList();

  document.getElementById("newItemForm").style.display = "none";

  // 顯示剛新增的品項入庫資訊
  document.getElementById("itemName").textContent = name;
  document.getElementById("itemStock").textContent = qty;
  document.getElementById("itemImageWrapper").style.display = "none";
  document.getElementById("itemInfo").style.display = "block";
  document.getElementById("scanResult").textContent = code;

  showMessage("✅ 新備品新增成功並入庫", true);
}

// 入庫數量更新
function addStock() {
  const code = document.getElementById("scanResult").textContent;
  const qty = parseInt(document.getElementById("stockInQty").value, 10);
  const note = document.getElementById("stockInNote").value.trim();

  const item = findItemByCode(code);
  if (!item || isNaN(qty) || qty <= 0) {
    showMessage("❌ 入庫失敗，請確認備品與數量", false);
    return;
  }

  item.stock += qty;
  document.getElementById("itemStock").textContent = item.stock;
  renderItemList();
  showMessage(`✅ 入庫成功，數量：${qty}，備註：${note || "無"}`);

  const record = {
    date: new Date().toLocaleDateString(),
    type: "入庫",
    category: item.category,
    code: item.code,
    name: item.name,
    qty,
    reason: note
  };
  sendToGoogleSheet(record);
}

// 出庫送出
function submitStockOut() {
  const code = document.getElementById("scanOutResult").textContent;
  const qty = parseInt(document.getElementById("stockOutQty").value, 10);
  const reason = document.getElementById("stockOutReason").value.trim();
  const newCategory = document.getElementById("outItemCategory").value;

  const item = findItemByCode(code);
  if (!item) {
    showOutMessage("❌ 出庫失敗，找不到備品", false);
    return;
  }
  if (isNaN(qty) || qty <= 0) {
    showOutMessage("❌ 出庫數量不正確", false);
    return;
  }
  if (item.stock < qty) {
    showOutMessage("❌ 出庫失敗，庫存不足", false);
    return;
  }

  item.stock -= qty;
  item.category = newCategory;

  document.getElementById("outItemStock").textContent = item.stock;
  renderItemList();
  logAction("出庫", item.name, qty, reason);
  showOutMessage("✅ 出庫成功", true);

  const record = {
    date: new Date().toLocaleDateString(),
    type: "出庫",
    category: item.category,
    code: item.code,
    name: item.name,
    qty,
    reason
  };
  sendToGoogleSheet(record);
}

function showOutMessage(msg, success = true) {
  const log = document.getElementById("outNoteLog");
  if (!log) return;
  log.innerHTML = `<p style="color:${success ? "green" : "red"};">${msg}</p>`;
}

// 簡單紀錄動作（可改為寫日誌）
function logAction(type, name, qty, reason) {
  console.log(`[${type}] 品項: ${name}, 數量: ${qty}, 理由: ${reason}`);
}

// 編輯功能
function editItem(code) {
  const item = findItemByCode(code);
  if (!item) return;
  document.getElementById("editCode").textContent = item.code;
  document.getElementById("editName").value = item.name;
  document.getElementById("editCategory").value = item.category;
  document.getElementById("editStock").value = item.stock;
  document.getElementById("editForm").style.display = "block";
}

function saveEdit() {
  const code = document.getElementById("editCode").textContent;
  const name = document.getElementById("editName").value.trim();
  const category = document.getElementById("editCategory").value.trim();
  const stock = parseInt(document.getElementById("editStock").value, 10);

  const item = findItemByCode(code);
  if (!item) return;

  if (!name || !category || isNaN(stock) || stock < 0) {
    alert("請填寫正確資料");
    return;
  }

  item.name = name;
  item.category = category;
  item.stock = stock;

  document.getElementById("editForm").style.display = "none";
  renderItemList();
}

// 取消編輯
function cancelEdit() {
  document.getElementById("editForm").style.display = "none";
}

// 傳送資料至 Google Sheets
function sendToGoogleSheet(data) {
  fetch("https://script.google.com/macros/s/AKfycbybqu_a48KL_UC99N3Ax_gxlOJDKGOuJ2-sNxPJP4vRJT8D4Hr_6wj0aSIxwGJPiAmDwQ/exec/exec", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" }
  })
  .then(res => res.json())
  .then(json => console.log("✅ 傳送成功", json))
  .catch(err => console.error("❌ 傳送失敗", err));
}

// 掃描器啟動示範 (Html5Qrcode)
let inScanner;
let outScanner;

function startInCamera() {
  if (inScanner) inScanner.stop();
  inScanner = new Html5Qrcode("reader");
  inScanner.start(
    { facingMode: { exact: "environment" } },
    { fps: 10, qrbox: 250 },
    (decodedText, decodedResult) => onScanInSuccess(decodedText)
  ).catch(err => alert("啟動入庫相機失敗:" + err));
}

function startOutCamera() {
  if (outScanner) outScanner.stop();
  outScanner = new Html5Qrcode("outReader");
  outScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    (decodedText, decodedResult) => onScanOutSuccess(decodedText)
  ).catch(err => alert("啟動出庫相機失敗:" + err));
}

// DOM 載入完成後初始
document.addEventListener("DOMContentLoaded", () => {
  renderItemList();
});
