/**
 * Google Apps Script — Forum & Tugas (Deployment Terpisah) untuk dasbor-kuis
 *
 * DEPLOYMENT TERPISAH dari lib/code.v5.gs untuk menghindari limit quota Apps
 * Script gratis. Sheet-nya pun TERPISAH dari sheet dashboard utama:
 *   - "Forum Log"  → komentar bertingkat + likes (dipakai <ruang-diskusi>)
 *   - "Tugas Log"  → submissions tugas mandiri (dipakai <kirim-tugas>)
 *
 * Ada pun pencatatan aktivitas (rekap discussion/assignment di Rangkuman)
 * tetap lewat aksi `logActivity` pada deployment utama (lib/codev5.gs), yang
 * dipicu komponen melalui event `dasbor-kuis-log`.
 *
 * ENDPOINT: Deploy sebagai Web App
 *   - Execute as: Me
 *   - Who has access: Anyone
 *   - URL: https://script.google.com/macros/s/XXXXX/exec
 *
 * PENTING: pasang skrip ini sebagai project TERIKAT spreadsheet target
 * (bisa spreadsheet yang sama atau spreadsheet cadangan terpisah). Semua
 * aksi ramah CORS: GET (query params) untuk baca maupun tulis dasar —
 * <kirim-tugas> mengirim saveAssignment via GET agar terhindar dari
 * CORS preflight; POST (JSON) tetap didukung untuk <ruang-diskusi>.
 */

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action || "").toLowerCase();
  try {
    switch (action) {
      case "getforumcomments":
        return response(getForumComments(e.parameter));
      case "getforumactivityhistory":
        return response(getForumActivityHistory(e.parameter));
      // FIX: <kirim-tugas> memakai GET + query params (action=saveAssignment).
      // Tanpa case ini, tugas tidak pernah tertulis ke sheet "Tugas Log".
      // Aksi dicocokkan case-insensitive agar saveAssignment == saveassignment.
      case "saveassignment":
        return response(saveAssignment(e.parameter));
      case "saveforumcomment":
        return response(saveForumComment(parameterToData(e.parameter)));
      case "deleteforumcomment":
        return response(deleteForumComment(e.parameter));
      case "ping":
        return response({
          status: "ok",
          message: "Forum service is running",
          timestamp: new Date().toISOString(),
        });
      default:
        return response({
          status: "error",
          message: "Unknown GET action: " + action + ". Jika endpoint baru, pastikan script sudah di-redeploy (Deploy > Manage deployments > New version).",
        });
    }
  } catch (error) {
    return response({ status: "error", message: error.toString() });
  }
}

function doPost(e) {
  try {
    let data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (_) {
        return response({ status: "error", message: "Invalid JSON payload" });
      }
    }
    if (e.parameter) {
      data = { ...data, ...e.parameter };
    }

    // FIX: Validasi input dasar
    if (!data.action) {
      return response({ status: "error", message: "Action is required" });
    }

    switch (String(data.action).toLowerCase()) {
      case "saveforumcomment":
        return response(saveForumComment(data));
      case "deleteforumcomment":
        return response(deleteForumComment(data));
      case "saveassignment":
        return response(saveAssignment(data));
      default:
        return response({ status: "error", message: "Unknown POST action: " + data.action });
    }
  } catch (error) {
    return response({ status: "error", message: error.toString() });
  }
}

function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Ubah query params GET menjadi bentuk data POST. Semua nilai dari
// e.parameter berupa string, jadi koersikan boolean isLiked dengan benar
// (string "false" tetap truthy bila dibiarkan).
function parameterToData(p) {
  p = p || {};
  return {
    ...p,
    isLiked: p.isLiked !== undefined ? String(p.isLiked).toLowerCase() === "true" : undefined,
  };
}

// ============================================
// FORUM CRUD — Sheet: "Forum Log"
// ============================================
function getForumSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Forum Log");
  const headers = [
    "Timestamp", "CommentID", "ParentID", "UserName", "StudentID",
    "Text", "Sheet", "Action", "Likes", "kdMateri", "NIS", "Absen", "Kelas",
  ];

  if (!sheet) {
    sheet = ss.insertSheet("Forum Log");
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold").setBackground("#6750a4").setFontColor("white");
    return sheet;
  }

  // FIX: Migrasi header jika sheet lama hanya punya 8/9 kolom (belum ada
  // "Likes", "kdMateri", atau metadata NIS/Absen/Kelas)
  const currentColCount = sheet.getLastColumn();
  if (currentColCount < headers.length) {
    const existingHeaders = sheet.getRange(1, 1, 1, currentColCount).getValues()[0];
    const missingCols = headers.filter((h) => !existingHeaders.includes(h));
    if (missingCols.length > 0) {
      sheet.getRange(1, currentColCount + 1, 1, missingCols.length).setValues([missingCols]);
      // Isi default 0 untuk kolom Likes yang baru
      if (sheet.getLastRow() > 1) {
        const likesColIdx = headers.indexOf("Likes") + 1;
        sheet.getRange(2, likesColIdx, sheet.getLastRow() - 1, 1).setValue(0);
      }
    }
  }

  return sheet;
}

function saveForumComment(data) {
  const sheet = getForumSheet_();

  // FIX: Validasi input
  if (!data.text && data.actionType !== "like") {
    return { status: "error", message: "Text is required" };
  }

  const commentId = String(data.id || Date.now());
  const parentId = data.parentId ? String(data.parentId) : "main";
  const action = data.actionType || "post";

  // Edit existing comment
  if (action === "edit") {
    const allData = sheet.getDataRange().getValues();
    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][1]) === commentId) {
        sheet.getRange(i + 1, 6).setValue(data.text || "");
        return { status: "ok", message: "Komentar diperbarui", id: commentId };
      }
    }
    return { status: "error", message: "Komentar tidak ditemukan" };
  }

  // Like toggle
  if (action === "like") {
    const allData = sheet.getDataRange().getValues();
    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][1]) === commentId) {
        const currentLikes = parseInt(allData[i][8]) || 0;
        const newLikes = data.isLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1);
        sheet.getRange(i + 1, 9).setValue(newLikes);
        return { status: "ok", likes: newLikes, id: commentId };
      }
    }
    return { status: "error", message: "Komentar tidak ditemukan" };
  }

  // New comment
  sheet.appendRow([
    new Date(), commentId, parentId,
    data.user || "Anonymous", data.studentId || "",
    data.text || "", data.sheet || "", "post", 0, data.kdMateri || "",
    data.nis || "", data.absen || "", data.kelas || "",
  ]);

  return {
    status: "ok",
    message: "Komentar tersimpan",
    id: commentId,
    data: {
      id: parseInt(commentId) || commentId,
      parentId: data.parentId || null,
      user: data.user || "Anonymous",
      studentId: data.studentId || "",
      text: data.text || "",
      time: new Date().toISOString(),
      likes: 0,
      isLiked: false,
      kelas: data.kelas || "",
    },
  };
}

function getForumComments(params) {
  const sheet = getForumSheet_();
  if (sheet.getLastRow() <= 1) return { status: "ok", comments: [] };
  const kdMateri = (params && params.kdMateri) || "";

  const data = sheet.getDataRange().getValues();
  const comments = [];
  for (let i = 1; i < data.length; i++) {
    const act = String(data[i][7] || "post").trim();
    if (act === "like") continue;
    if (kdMateri && String(data[i][9] || "").trim().toLowerCase() !== kdMateri.toLowerCase()) continue;
    comments.push({
      id: parseInt(data[i][1]) || 0,
      parentId: data[i][2] === "main" ? null : parseInt(data[i][2]) || null,
      user: String(data[i][3] || ""),
      studentId: String(data[i][4] || ""),
      text: String(data[i][5] || ""),
      sheet: String(data[i][6] || ""),
      time: data[i][0] ? new Date(data[i][0]).toISOString() : "",
      likes: parseInt(data[i][8]) || 0,
      isLiked: false,
      pinned: false,
      kelas: String(data[i][12] || ""),
    });
  }

  // Lookup real names from Users sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usersSheet = ss.getSheetByName("Users");
  if (usersSheet && usersSheet.getLastRow() > 1) {
    const ud = usersSheet.getDataRange().getValues();
    const nameMap = {};
    for (let i = 1; i < ud.length; i++) {
      nameMap[String(ud[i][0])] = String(ud[i][2]);
    }
    comments.forEach((c) => {
      if (c.studentId && nameMap[c.studentId]) c.user = nameMap[c.studentId];
    });
  }

  // FIX: Urutan "Terbaru"/"Terlama"/"Terbaik" kini didukung backend
  // (param `sort` dikirim <ruang-diskusi> saat memuat komentar).
  const sort = String((params && params.sort) || "best").toLowerCase();
  comments.sort((a, b) => {
    if (sort === "newest") return new Date(b.time) - new Date(a.time);
    if (sort === "oldest") return new Date(a.time) - new Date(b.time);
    return (b.likes || 0) - (a.likes || 0);
  });

  return { status: "ok", comments: comments };
}

function getForumActivityHistory(params) {
  const sheet = getForumSheet_();
  if (sheet.getLastRow() <= 1) return { status: "ok", history: [] };
  const studentId = (params && params.studentId) || "";
  const kdMateri = (params && params.kdMateri) || "";
  const days = parseInt((params && params.days) || 28);
  // FIX: endDate harus AKHIR hari ini, bukan tengah malam — sebelumnya semua
  // komentar hari ini selalu terbuang (centang forum hilang setelah di-refresh).
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const data = sheet.getDataRange().getValues();
  const dateMap = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const action = String(row[7] || "post").trim();
    if (action === "like" || action === "edit") continue;
    if (studentId && String(row[4] || "").trim() !== studentId) continue;
    if (kdMateri && String(row[9] || "").trim() !== kdMateri) continue;
    const rowDate = row[0];
    let rowDateObj;
    if (rowDate instanceof Date) rowDateObj = rowDate;
    else if (typeof rowDate === "string") rowDateObj = new Date(rowDate);
    else continue;
    if (isNaN(rowDateObj.getTime()) || rowDateObj < startDate || rowDateObj > endDate) continue;
    const dateStr = Utilities.formatDate(rowDateObj, Session.getScriptTimeZone(), "yyyy-MM-dd");
    dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
  }

  const history = Object.keys(dateMap).map((date) => ({ date: date, count: dateMap[date] }));
  return { status: "ok", history: history };
}

function deleteForumComment(data) {
  const sheet = getForumSheet_();
  const commentId = String(data.id || "");
  if (!commentId) return { status: "error", message: "Comment ID is required" };

  const allData = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  for (let i = allData.length - 1; i >= 1; i--) {
    if (String(allData[i][1]) === commentId || String(allData[i][2]) === commentId) {
      rowsToDelete.push(i + 1);
    }
  }
  rowsToDelete.forEach((row) => sheet.deleteRow(row));

  return rowsToDelete.length > 0
    ? { status: "ok", message: `${rowsToDelete.length} komentar dihapus` }
    : { status: "error", message: "Komentar tidak ditemukan" };
}

// ============================================
// TUGAS — Sheet: "Tugas Log"
// ============================================
function getTugasSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Tugas Log");
  const headers = [
    "Timestamp", "StudentID", "Nama", "Sheet", "Title", "Content", "Link",
    "kdMateri", "NIS", "Absen", "Kelas",
  ];

  if (!sheet) {
    sheet = ss.insertSheet("Tugas Log");
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold").setBackground("#6750a4").setFontColor("white");
    return sheet;
  }

  // FIX: Migrasi header jika kolom kurang (NIS/Absen/Kelas baru)
  const currentColCount = sheet.getLastColumn();
  if (currentColCount < headers.length) {
    const existingHeaders = sheet.getRange(1, 1, 1, currentColCount).getValues()[0];
    const missingCols = headers.filter((h) => !existingHeaders.includes(h));
    if (missingCols.length > 0) {
      sheet.getRange(1, currentColCount + 1, 1, missingCols.length).setValues([missingCols]);
    }
  }

  return sheet;
}

function saveAssignment(data) {
  const sheet = getTugasSheet_();

  // FIX: Validasi input
  if (!data.studentId) return { status: "error", message: "StudentID is required" };
  if (!data.title) return { status: "error", message: "Title is required" };
  if (!data.content && !data.link) return { status: "error", message: "Content or Link is required" };

  // Upsert: update jika student+sheet+title sudah ada
  if (sheet.getLastRow() > 1) {
    const allData = sheet.getDataRange().getValues();
    for (let i = 1; i < allData.length; i++) {
      if (
        String(allData[i][1]) === String(data.studentId || "") &&
        String(allData[i][3]) === String(data.sheet || "") &&
        String(allData[i][4]) === String(data.title || "")
      ) {
        sheet.getRange(i + 1, 6).setValue(data.content || "");
        sheet.getRange(i + 1, 7).setValue(data.link || "");
        sheet.getRange(i + 1, 8).setValue(data.kdMateri || "");
        sheet.getRange(i + 1, 9).setValue(data.nis || "");
        sheet.getRange(i + 1, 10).setValue(data.absen || "");
        sheet.getRange(i + 1, 11).setValue(data.kelas || "");
        sheet.getRange(i + 1, 1).setValue(new Date());
        return { status: "ok", message: "Tugas diperbarui" };
      }
    }
  }

  sheet.appendRow([
    new Date(), data.studentId || "", data.name || "",
    data.sheet || "", data.title || "", data.content || "", data.link || "",
    data.kdMateri || "", data.nis || "", data.absen || "", data.kelas || "",
  ]);
  return { status: "ok", message: "Tugas tersimpan" };
}

// --- TESTING ---
function testForum() {
  const result = saveForumComment({
    user: "Test User",
    studentId: "STD-TEST",
    text: "Test comment",
    sheet: "Pertemuan 1",
  });
  Logger.log(result);
}

function testAssignment() {
  const result = saveAssignment({
    studentId: "STD-TEST",
    name: "Test User",
    sheet: "Pertemuan 1",
    title: "Tugas 1",
    content: "Test content",
  });
  Logger.log(result);
}