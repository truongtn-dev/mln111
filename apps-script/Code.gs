/**
 * MLN111 Auth — Admin cấp tài khoản, KHÔNG cho đăng ký công khai
 * Chạy setup() rồi setupAdmin() một lần sau khi đổi ADMIN_EMAIL / ADMIN_PASSWORD
 */

const CONFIG = {
  SPREADSHEET_ID: '1kYKQmn2dS1uROZGn_E6qxpj7akt46VMNkqlf-DbTafU',
  QUESTIONS_FILE_ID: 'PASTE_DRIVE_FILE_ID_HERE',
  APP_SECRET: 'doi-chuoi-bi-mat-manh-2026',
  TOKEN_TTL_HOURS: 168,
  ADMIN_TOKEN_TTL_HOURS: 24,
  USERS_SHEET: 'Account',
  ADMIN_EMAIL: 'truongtn.dev@gmail.com',
  ADMIN_PASSWORD: 'AdminMLN111!',
  /** Mở 1 lần: .../exec?setup=KEY rồi xóa hoặc đổi KEY */
  BOOTSTRAP_KEY: 'MLN111Setup2026Truong',
};

var COL = {
  ID: 0, NAME: 1, EMAIL: 2, HASH: 3, SALT: 4,
  TOKEN: 5, TOKEN_EXPIRY: 6, CREATED: 7, ACTIVE: 8, ROLE: 9,
};

function getSpreadsheet() {
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  var id = String(CONFIG.SPREADSHEET_ID || '').trim();
  if (!id) throw new Error('Thiếu SPREADSHEET_ID');
  return SpreadsheetApp.openById(id);
}

function setup() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.USERS_SHEET);
  if (!sheet) sheet = ss.insertSheet(CONFIG.USERS_SHEET);
  sheet.clear();
  sheet.appendRow(['id', 'name', 'email', 'passwordHash', 'salt', 'token', 'tokenExpiry', 'createdAt', 'active', 'role']);
  sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
  return 'Setup OK — chạy tiếp setupAdmin()';
}

/** Tạo tài khoản admin (chạy 1 lần, đổi ADMIN_EMAIL / ADMIN_PASSWORD trước). */
function setupAdmin() {
  ensureSheetHeaders();
  var email = trim(CONFIG.ADMIN_EMAIL).toLowerCase();
  if (findRowByEmail(email)) return 'Admin đã tồn tại — chạy ensureAdmin() để reset mật khẩu';
  createAccountRow('Administrator', email, CONFIG.ADMIN_PASSWORD, 'admin');
  return 'Admin OK: ' + email + ' / mật khẩu: ' + CONFIG.ADMIN_PASSWORD;
}

/**
 * CHẠY HÀM NÀY nếu đăng nhập báo sai — không xóa dữ liệu học viên.
 * Tạo hoặc reset admin theo CONFIG.ADMIN_EMAIL / ADMIN_PASSWORD.
 */
function ensureAdmin() {
  ensureSheetHeaders();
  var email = trim(CONFIG.ADMIN_EMAIL).toLowerCase();
  var sheet = getUsersSheet();
  var found = findRowByEmail(email);

  if (found) {
    var salt = Utilities.getUuid();
    var hash = hashPassword(CONFIG.ADMIN_PASSWORD, salt);
    var r = found.index + 1;
    sheet.getRange(r, COL.HASH + 1).setValue(hash);
    sheet.getRange(r, COL.SALT + 1).setValue(salt);
    sheet.getRange(r, COL.ROLE + 1).setValue('admin');
    sheet.getRange(r, COL.ACTIVE + 1).setValue('TRUE');
    return 'Đã reset admin: ' + email + ' — mật khẩu: ' + CONFIG.ADMIN_PASSWORD;
  }

  createAccountRow('Administrator', email, CONFIG.ADMIN_PASSWORD, 'admin');
  return 'Đã tạo admin: ' + email + ' — mật khẩu: ' + CONFIG.ADMIN_PASSWORD;
}

function ensureSheetHeaders() {
  var sheet = getUsersSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['id', 'name', 'email', 'passwordHash', 'salt', 'token', 'tokenExpiry', 'createdAt', 'active', 'role']);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
    return;
  }
  var lastCol = sheet.getLastColumn();
  var h = sheet.getRange(1, 1, 1, Math.max(lastCol, 10)).getValues()[0];
  if (String(h[COL.ROLE] || '').toLowerCase() !== 'role') {
    sheet.getRange(1, COL.ROLE + 1).setValue('role');
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
  }
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    for (var i = 2; i <= lastRow; i++) {
      var roleCell = sheet.getRange(i, COL.ROLE + 1);
      if (!roleCell.getValue()) roleCell.setValue('user');
    }
  }
}

function doGet(e) {
  try {
    var setupKey = e && e.parameter && e.parameter.setup;
    if (setupKey && setupKey === CONFIG.BOOTSTRAP_KEY) {
      return jsonResponse({
        ok: true,
        message: ensureAdmin(),
        adminEmail: CONFIG.ADMIN_EMAIL,
        next: 'Vào /admin để đăng nhập quản trị',
      });
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err.message || err) });
  }
  return jsonResponse({ ok: true, message: 'MLN111 Auth API — invite only' });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    switch (body.action) {
      case 'login':
        return jsonResponse(loginUser(body, 'user'));
      case 'adminLogin':
        return jsonResponse(adminLogin(body));
      case 'adminCreateUser':
        return jsonResponse(adminCreateUser(body));
      case 'adminListUsers':
        return jsonResponse(adminListUsers(body));
      case 'adminSetActive':
        return jsonResponse(adminSetActive(body));
      case 'getQuestions':
        return jsonResponse(getQuestions(body));
      case 'validate':
        return jsonResponse(validateToken(body.token, 'user'));
      case 'adminValidate':
        return jsonResponse(validateToken(body.token, 'admin'));
      default:
        return jsonResponse({ ok: false, error: 'Hành động không hợp lệ' });
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err.message || err) });
  }
}

function createAccountRow(name, email, password, role) {
  var sheet = getUsersSheet();
  var salt = Utilities.getUuid();
  var hash = hashPassword(String(password), salt);
  var id = Utilities.getUuid();
  var now = new Date().toISOString();
  sheet.appendRow([id, name, email.toLowerCase(), hash, salt, '', '', now, 'TRUE', role || 'user']);
  return { id: id, name: name, email: email.toLowerCase(), role: role || 'user' };
}

function loginUser(body, requiredRole) {
  var email = trim(body.email).toLowerCase();
  var password = String(body.password || '');
  if (!email || !password) return { ok: false, error: 'Vui lòng nhập email và mật khẩu' };

  var found = findRowByEmail(email);
  if (!found) {
    if (email === trim(CONFIG.ADMIN_EMAIL).toLowerCase()) {
      return {
        ok: false,
        error: 'Tài khoản admin chưa được tạo trên server. Chạy ensureAdmin() trong Apps Script.',
      };
    }
    return { ok: false, error: 'Email hoặc mật khẩu không đúng. Tài khoản phải do admin cấp.' };
  }

  var row = found.row;
  var i = found.index;
  var role = String(row[COL.ROLE] || 'user').toLowerCase();

  if (requiredRole === 'user' && role === 'admin') {
    return {
      ok: false,
      error: 'Đây là tài khoản quản trị — không đăng nhập ở form học viên.',
    };
  }
  if (requiredRole && role !== requiredRole) {
    return { ok: false, error: 'Không có quyền truy cập' };
  }
  if (String(row[COL.ACTIVE]).toUpperCase() !== 'TRUE') {
    return { ok: false, error: 'Tài khoản chưa được kích hoạt hoặc đã bị khóa' };
  }

  var hash = hashPassword(password, String(row[COL.SALT]));
  if (hash !== String(row[COL.HASH])) return { ok: false, error: 'Email hoặc mật khẩu không đúng' };

  var token = Utilities.getUuid() + Utilities.getUuid();
  var ttl = requiredRole === 'admin' ? CONFIG.ADMIN_TOKEN_TTL_HOURS : CONFIG.TOKEN_TTL_HOURS;
  var expiry = new Date(Date.now() + ttl * 3600000).toISOString();

  getUsersSheet().getRange(i + 1, COL.TOKEN + 1, 1, 2).setValues([[token, expiry]]);

  return {
    ok: true,
    token: token,
    user: { id: String(row[COL.ID]), name: String(row[COL.NAME]), email: String(row[COL.EMAIL]), role: role },
    expiresAt: expiry,
  };
}

function adminLogin(body) {
  return loginUser(body, 'admin');
}

function adminCreateUser(body) {
  var admin = findUserByToken(body.adminToken, 'admin');
  if (!admin) return { ok: false, error: 'Phiên admin hết hạn' };

  var name = trim(body.name);
  var email = trim(body.email).toLowerCase();
  var password = String(body.password || '');

  if (!name || name.length < 2) return { ok: false, error: 'Họ tên không hợp lệ' };
  if (!isValidEmail(email)) return { ok: false, error: 'Email không hợp lệ' };
  if (password.length < 6) return { ok: false, error: 'Mật khẩu tối thiểu 6 ký tự' };
  if (findRowByEmail(email)) return { ok: false, error: 'Email đã tồn tại' };

  var acc = createAccountRow(name, email, password, 'user');
  return {
    ok: true,
    message: 'Đã tạo tài khoản cho ' + name,
    user: acc,
    credentials: { email: email, password: password },
  };
}

function adminListUsers(body) {
  var admin = findUserByToken(body.adminToken, 'admin');
  if (!admin) return { ok: false, error: 'Phiên admin hết hạn' };

  var data = getUsersSheet().getDataRange().getValues();
  var users = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[COL.ROLE]).toLowerCase() === 'admin') continue;
    users.push({
      id: String(row[COL.ID]),
      name: String(row[COL.NAME]),
      email: String(row[COL.EMAIL]),
      active: String(row[COL.ACTIVE]).toUpperCase() === 'TRUE',
      createdAt: String(row[COL.CREATED]),
    });
  }
  return { ok: true, users: users, total: users.length };
}

function adminSetActive(body) {
  var admin = findUserByToken(body.adminToken, 'admin');
  if (!admin) return { ok: false, error: 'Phiên admin hết hạn' };

  var email = trim(body.email).toLowerCase();
  var active = body.active === true || String(body.active).toUpperCase() === 'TRUE';
  var found = findRowByEmail(email);
  if (!found) return { ok: false, error: 'Không tìm thấy user' };
  if (String(found.row[COL.ROLE]).toLowerCase() === 'admin') {
    return { ok: false, error: 'Không thể khóa admin' };
  }

  getUsersSheet().getRange(found.index + 1, COL.ACTIVE + 1).setValue(active ? 'TRUE' : 'FALSE');
  return { ok: true, email: email, active: active };
}

function validateToken(token, requiredRole) {
  if (!token) return { ok: false, error: 'Thiếu token' };
  var user = findUserByToken(token, requiredRole);
  if (!user) return { ok: false, error: 'Phiên đăng nhập hết hạn' };
  return { ok: true, user: user };
}

/** Chạy trong Editor để kiểm tra file câu hỏi trên Drive đã đúng chưa. */
function testQuestionsFile() {
  var r = getQuestions({ token: '__test__' });
  if (r.error && r.error.indexOf('Unauthorized') >= 0) {
    var id = CONFIG.QUESTIONS_FILE_ID;
    if (!id || id.indexOf('PASTE') >= 0) return 'Chưa cấu hình QUESTIONS_FILE_ID';
    try {
      var file = DriveApp.getFileById(id);
      var qs = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
      return 'OK: ' + file.getName() + ' — ' + qs.length + ' câu hỏi';
    } catch (e) {
      return 'Lỗi: ' + e.message;
    }
  }
  return JSON.stringify(r);
}

function getQuestions(body) {
  var user = findUserByToken(body.token, 'user');
  if (!user) return { ok: false, error: 'Unauthorized — vui lòng đăng nhập lại' };

  if (!CONFIG.QUESTIONS_FILE_ID || CONFIG.QUESTIONS_FILE_ID.indexOf('PASTE') >= 0) {
    return {
      ok: false,
      error: 'Server chưa cấu hình QUESTIONS_FILE_ID. Upload data/questions.json lên Drive, dán ID file vào CONFIG, deploy lại.',
    };
  }

  try {
    var file = DriveApp.getFileById(CONFIG.QUESTIONS_FILE_ID);
    var content = file.getBlob().getDataAsString('UTF-8');
    var questions = JSON.parse(content);
    return { ok: true, questions: questions, count: questions.length };
  } catch (e) {
    return { ok: false, error: 'Không đọc được file câu hỏi: ' + e.message };
  }
}

function findRowByEmail(email) {
  var data = getUsersSheet().getDataRange().getValues();
  var target = email.toLowerCase();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][COL.EMAIL]).toLowerCase() === target) {
      return { index: i, row: data[i] };
    }
  }
  return null;
}

function findUserByToken(token, requiredRole) {
  var data = getUsersSheet().getDataRange().getValues();
  var now = Date.now();

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[COL.TOKEN]) !== token) continue;
    var expiry = new Date(String(row[COL.TOKEN_EXPIRY])).getTime();
    if (isNaN(expiry) || expiry < now) return null;

    var role = String(row[COL.ROLE] || 'user').toLowerCase();
    if (requiredRole && role !== requiredRole) return null;
    if (String(row[COL.ACTIVE]).toUpperCase() !== 'TRUE') return null;

    return {
      id: String(row[COL.ID]),
      name: String(row[COL.NAME]),
      email: String(row[COL.EMAIL]),
      role: role,
    };
  }
  return null;
}

function getUsersSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.USERS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.USERS_SHEET);
  }
  return sheet;
}

function hashPassword(password, salt) {
  var raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + salt + CONFIG.APP_SECRET
  );
  return raw.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function trim(s) {
  return String(s || '').trim();
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
