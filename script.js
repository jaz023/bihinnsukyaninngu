// 頁面切換
function showPage(pageId) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });
  document.getElementById(pageId).classList.add("active");
}

// 假資料庫
let items = [
  { code: "A001", name: "螺絲刀", category: "工具", stock: 10, image: "images/tool1.jpg" },
  { code: "B002", name: "手套", category: "安全用品", stock: 5, image: "images/glove.jpg" },
];

// 顯示備品列表
function renderItemList() {
  const itemList = document.getElementById("itemList");
  itemList.innerHTML = "";
  items.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.code}</td>
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td>${item.stock}</td>
      <td><img src="${item.image}" style="max-width:50px"/></td>
      <td><button onclick="editItem('${item.code}')">編集</button></td>
    `;
    itemList.appendChild(row);
  });

  document.getElementById("itemCount").textContent = items.length;
}

function showMessage(message, success = true) {
  const noteLog = document.getElementById("noteLog");
  noteLog.innerHTML = `<p style="color: ${success ? 'green' : 'red'};">${message}</p>`;
}

function findItemByCode(code) {
  return items.find((item) => item.code === code);
}

// 入庫掃描成功
function onScanSuccess(decodedText) {
  const item = findItemByCode(decodedText);
  document.getElementById("scanResult").textContent = decodedText;

  if (item) {
    document.getElementById("itemName").textContent = item.name;
    document.getElementById("itemStock").textContent = item.stock;
    document.getElementById("itemImage").src = item.image;
    document.getElementById("itemImageWrapper").style.display = "block";
    document.getElementById("itemInfo").style.display = "block";
    showMessage("✅ 掃描成功", true);
  } else {
    document.getElementById("itemInfo").style.display = "none";
    showMessage("❌ 找不到該備品編號：" + decodedText, false);
  }
}

// 出庫掃描成功
function onOutScanSuccess(decodedText) {
  const item = findItemByCode(decodedText);
  document.getElementById("scanOutResult").textContent = decodedText;

  if (item) {
    document.getElementById("outItemName").textContent = item.name;
    document.getElementById("outItemStock").textContent = item.stock;
    document.getElementById("outItemInfo").style.display = "block";
  } else {
    document.getElementById("outItemInfo").style.display = "none";
    alert("找不到備品：" + decodedText);
  }
}

// 啟動相機
let inScanner;
let outScanner;

function startCamera() {
  if (inScanner) inScanner.stop();
  inScanner = new Html5Qrcode("reader");
  inScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    (decodedText, decodedResult) => {
      console.log("掃描成功:", decodedText);
      onScanSuccess(decodedText);
    }
  ).catch(err => {
    console.error("啟動失敗:", err);
    alert("啟動相機失敗，請確認權限與裝置");
  });
}

function startOutCamera() {
  if (outScanner) outScanner.stop();
  outScanner = new Html5Qrcode("outReader");
  outScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    onOutScanSuccess
  ).catch(err => console.error(err));
}


// 入庫送出
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
  showMessage(`✅ 入庫成功！數量：${qty}，備註：${note || "無"}`);

  const record = {
    date: new Date().toLocaleDateString("ja-JP"),
    type: "入庫",
    category: item.category,
    code: item.code,
    name: item.name,
    qty: qty,
    reason: note
  };
  sendToGoogleSheet(record);
}

// 出庫送出
function submitStockOut() {
  const code = document.getElementById("scanOutResult").textContent;
  const qty = parseInt(document.getElementById("stockOutQty").value);
  const reason = document.getElementById("stockOutReason").value;
  const newCategory = document.getElementById("editCategoryOut").value;
  const newStock = parseInt(document.getElementById("editStockOut").value);

  const item = findItemByCode(code);
if (!item || isNaN(qty) || qty <= 0 || newStock < qty) {
  showOutMessage("❌ 出庫失敗，數量不足或輸入錯誤", false);
  return;
}

  item.stock = newStock - qty;
  item.category = newCategory;
  document.getElementById("outItemStock").textContent = items[code].stock;
  logAction("出庫", items[code].name, qty, reason);
  showOutMessage("✅ 出庫成功！", true);
}

function showOutMessage(msg, success = true) {
  const log = document.getElementById("outNoteLog");
  if (!log) return;
  log.innerHTML = `<p style="color:${success ? 'green' : 'red'}">${msg}</p>`;
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
  const name = document.getElementById("editName").value;
  const category = document.getElementById("editCategory").value;
  const stock = parseInt(document.getElementById("editStock").value, 10);
  const item = findItemByCode(code);
  if (!item) return;
  item.name = name;
  item.category = category;
  item.stock = stock;
  document.getElementById("editForm").style.display = "none";
  renderItemList();
}

function cancelEdit() {
  document.getElementById("editForm").style.display = "none";
}

function updateItemCount() {
  const count = Object.keys(items).length;
  const total = Object.values(items).reduce((sum, item) => sum + item.stock, 0);
  document.getElementById("itemCount").textContent = count;
  document.getElementById("totalStockCount").textContent = total;
}

document.addEventListener("DOMContentLoaded", renderItemList);
