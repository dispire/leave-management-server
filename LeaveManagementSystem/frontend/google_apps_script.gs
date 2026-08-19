/**
 * 🏥 원내 모바일 재고 관리 시스템 - Google Apps Script (GAS) Backend Database Script
 * 
 * [설치 및 배포 방법]
 * 1. 구글 드라이브(https://drive.google.com)에서 새로운 'Google 스프레드시트'를 만듭니다.
 * 2. 상단 메뉴 [확장 프로그램] -> [Apps Script]를 클릭합니다.
 * 3. 기존 코드를 모두 지우고 본 파일의 전체 코드를 복사하여 붙여넣습니다.
 * 4. 우측 상단 [배포] -> [새 배포] 클릭:
 *    - 유형 선택: 웹 앱 (Web App)
 *    - 다음 사용자 권한으로 실행: 나 (Me)
 *    - 액세스 권한 있는 사용자: 모든 사용자 (Anyone)  <-- 중요!
 * 5. 배포 완료 후 발급된 '웹 앱 URL' (https://script.google.com/macros/s/.../exec)을 복사하여
 *    재고 관리 앱의 [설정] -> [Google Drive 연동] URL 입력란에 붙여넣으면 완료됩니다!
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets(ss);

  var action = e.parameter.action || "readAll";
  var result = {};

  if (action === "readAll") {
    result = {
      status: "success",
      company: getSheetData(ss.getSheetByName("Company"))[0] || null,
      products: getSheetData(ss.getSheetByName("Products")),
      users: getSheetData(ss.getSheetByName("Users")),
      history: getSheetData(ss.getSheetByName("History"))
    };
  } else if (action === "ping") {
    result = { status: "success", message: "Google Apps Script DB Connection OK!" };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets(ss);

  var postData = {};
  try {
    postData = JSON.parse(e.postData.contents);
  } catch (err) {
    postData = {};
  }

  var action = postData.action || "saveAll";
  var result = { status: "success" };

  if (action === "saveAll") {
    if (postData.company) setSheetData(ss.getSheetByName("Company"), [postData.company]);
    if (postData.products) setSheetData(ss.getSheetByName("Products"), postData.products);
    if (postData.users) setSheetData(ss.getSheetByName("Users"), postData.users);
    if (postData.history) setSheetData(ss.getSheetByName("History"), postData.history);
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════
// 스프레드시트 헬퍼 함수
// ═══════════════════════════════════════════════════════════════
function ensureSheets(ss) {
  var sheets = ["Company", "Products", "Users", "History"];
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i];
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      if (name === "Company") sheet.appendRow(["name", "code", "bizNo", "ceo", "phone", "email", "address", "updatedAt"]);
      if (name === "Products") sheet.appendRow(["id", "code", "name", "category", "qty", "minQty", "unit", "price", "location", "updatedAt"]);
      if (name === "Users") sheet.appendRow(["id", "empNo", "name", "email", "password", "phone", "department", "position", "role", "status", "createdAt"]);
      if (name === "History") sheet.appendRow(["id", "productCode", "productName", "type", "qty", "department", "by", "date", "note"]);
    }
  }
}

function getSheetData(sheet) {
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  var headers = values[0];
  var list = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var obj = {};
    var isEmpty = true;
    for (var c = 0; c < headers.length; c++) {
      var key = headers[c];
      var val = row[c];
      if (val !== "") isEmpty = false;
      obj[key] = val;
    }
    if (!isEmpty) list.push(obj);
  }
  return list;
}

function setSheetData(sheet, dataList) {
  if (!sheet || !Array.isArray(dataList)) return;
  sheet.clearContents();
  
  if (dataList.length === 0) return;
  
  var keys = Object.keys(dataList[0]);
  sheet.appendRow(keys);
  
  for (var i = 0; i < dataList.length; i++) {
    var item = dataList[i];
    var row = [];
    for (var k = 0; k < keys.length; k++) {
      row.push(item[keys[k]] !== undefined ? item[keys[k]] : "");
    }
    sheet.appendRow(row);
  }
}
