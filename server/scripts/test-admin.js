// Tests the admin module routes from start to finish, then deletes its test module.
// Start the server first (npm run dev), then in a second terminal:
//   node scripts/test-admin.js "YourAdminPassword"
import "dotenv/config";

const BASE = `http://localhost:${process.env.PORT || 4200}/api`;
const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/test-admin.js rlcadmin2026');
  process.exit(1);
}

let cookie = "";
let passed = 0;
let failed = 0;

// Sends one request and returns { status, data }.
// `as` sends a different login cookie (e.g. a teacher's) instead of the admin's.
async function call(method, path, body, { auth = true, as = cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body !== undefined && { "Content-Type": "application/json" }),
      ...(auth && as && { Cookie: as }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, res };
}

function check(label, ok, extra = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !extra ? "" : `  -> ${extra}`}`);
}

const testModule = {
  title: "  TEST Module (safe to delete)  ",
  level: "beginner",
  shortDescription: "Made by scripts/test-admin.js",
  durationMinutes: 20,
  components: [
    { name: "Arduino Uno", compartment: "A1", quantity: 1 },
    { name: "LED", compartment: "B2", quantity: 3 },
  ],
  steps: [
    { title: "Read this", type: "instruction", instruction: "Hello", code: "should be dropped" },
    { title: "Upload code", type: "arduino", codeTitle: "Blink", code: "void setup() {}\nvoid loop() {}" },
    { title: "Check it", type: "test", instruction: "Does it blink?" },
  ],
};

let id = null;
let teacherId = null;
try {
  // 1. Log in
  const login = await call("POST", "/auth/login", { username: process.env.ADMIN_USERNAME, password }, { auth: false });
  cookie = login.res.headers.get("set-cookie")?.split(";")[0] ?? "";
  check("log in", login.status === 200 && cookie !== "", `status ${login.status}: ${login.data?.error}`);
  if (!cookie) throw new Error("Cannot continue without logging in. Check the password.");

  // 2. Not logged in -> blocked
  const anon = await call("POST", "/admin/modules", testModule, { auth: false });
  check("creating without login is refused (401)", anon.status === 401, `status ${anon.status}`);

  // 3. Bad data -> 400 with every problem listed
  const bad = await call("POST", "/admin/modules", { title: " ", level: "expert", steps: [{ type: "dance" }] });
  check(
    "bad data is refused (400) with all problems listed",
    bad.status === 400 && /Title is required/.test(bad.data?.error) && /Level/.test(bad.data?.error) && /Step 1/.test(bad.data?.error),
    `status ${bad.status}: ${bad.data?.error}`,
  );

  // 4. Create
  const created = await call("POST", "/admin/modules", testModule);
  id = created.data?.id;
  check("create a draft module (201)", created.status === 201 && Boolean(id), `status ${created.status}: ${created.data?.error}`);

  // 5. Read it back
  const got = await call("GET", `/admin/modules/${id}`);
  const m = got.data;
  check("title was trimmed", m?.title === "TEST Module (safe to delete)", m?.title);
  check("new modules start as draft", m?.status === "draft", m?.status);
  check("2 components saved in order", m?.components?.map((c) => c.name).join() === "Arduino Uno,LED");
  check("3 steps numbered 1, 2, 3", m?.steps?.map((s) => s.number).join() === "1,2,3");
  check("code kept only on the Arduino step", m?.steps?.[0]?.code === null && m?.steps?.[1]?.codeTitle === "Blink");

  // 6. Students can't see a draft
  const hidden = await call("GET", `/modules/${id}`, undefined, { auth: false });
  check("students can't open the draft (404)", hidden.status === 404, `status ${hidden.status}`);

  // 7. Edit: rename, drop a component, reverse the steps
  const edited = {
    ...testModule,
    title: "TEST Module (edited)",
    components: testModule.components.slice(1),
    steps: [...testModule.steps].reverse(),
  };
  const put = await call("PUT", `/admin/modules/${id}`, edited);
  const after = (await call("GET", `/admin/modules/${id}`)).data;
  check("save changes (200)", put.status === 200, `status ${put.status}: ${put.data?.error}`);
  check("edit replaced title, components and step order",
    after?.title === "TEST Module (edited)" &&
    after?.components?.length === 1 &&
    after?.steps?.map((s) => `${s.number}:${s.title}`).join() === "1:Check it,2:Upload code,3:Read this");

  // 8. Publish -> students can see it
  const pub = await call("PATCH", `/admin/modules/${id}/status`, { status: "published" });
  const visible = await call("GET", `/modules/${id}`, undefined, { auth: false });
  check("publish, then students can open it", pub.status === 200 && visible.status === 200, `status ${visible.status}`);

  // 9. Archive -> hidden again
  await call("PATCH", `/admin/modules/${id}/status`, { status: "archived" });
  const archived = await call("GET", `/modules/${id}`, undefined, { auth: false });
  check("archive, then students can't open it (404)", archived.status === 404, `status ${archived.status}`);

  // 10. Wrong status / wrong id
  const badStatus = await call("PATCH", `/admin/modules/${id}/status`, { status: "deleted" });
  check("unknown status is refused (400)", badStatus.status === 400, `status ${badStatus.status}`);
  const badId = await call("GET", "/admin/modules/not-an-id");
  check("badly formed id gives 404, not a server error", badId.status === 404, `status ${badId.status}`);

  // 11. Uploads: a real 1x1 PNG picture and the smallest valid .glb header
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  const glb = Buffer.concat([Buffer.from("glTF"), Buffer.from([2, 0, 0, 0, 12, 0, 0, 0])]);
  const upload = async (bytes, kind, auth = true) => {
    const res = await fetch(`${BASE}/admin/uploads?kind=${kind}`, {
      method: "POST", body: bytes, headers: auth ? { Cookie: cookie } : {},
    });
    return { status: res.status, data: await res.json().catch(() => null) };
  };

  const pic = await upload(png, "image");
  check("upload a picture (201)", pic.status === 201 && Boolean(pic.data?.url), `status ${pic.status}: ${pic.data?.error}`);
  if (pic.data?.url) {
    const link = pic.data.url.startsWith("/") ? BASE.replace("/api", "") + pic.data.url : pic.data.url;
    const back = await fetch(link);
    const same = back.ok && Buffer.from(await back.arrayBuffer()).equals(png);
    check("the uploaded picture can be opened from its link", same, `${back.status} ${link}`);
  }
  const model = await upload(glb, "model");
  check("upload a .glb 3D model (201)", model.status === 201 && /\.glb$/.test(model.data?.url ?? ""), `status ${model.status}: ${model.data?.error}`);
  const textAsPicture = await upload(Buffer.from("this is not a picture, just text"), "image");
  check("a text file is refused as a picture (400)", textAsPicture.status === 400, `status ${textAsPicture.status}`);
  const modelAsPicture = await upload(glb, "image");
  check("a 3D model is refused in a picture field (400)", modelAsPicture.status === 400, `status ${modelAsPicture.status}`);
  const anonUpload = await upload(png, "image", false);
  check("uploading without login is refused (401)", anonUpload.status === 401, `status ${anonUpload.status}`);

  // 12. Links saved on a module: real uploads are kept, made-up links are refused
  const withMedia = { ...edited, coverImageUrl: pic.data?.url, steps: [{ ...edited.steps[0], imageUrl: pic.data?.url, modelUrl: model.data?.url }] };
  await call("PUT", `/admin/modules/${id}`, withMedia);
  const media = (await call("GET", `/admin/modules/${id}`)).data;
  check("cover, step picture and 3D model links are saved",
    media?.coverImageUrl === pic.data?.url && media?.steps?.[0]?.imageUrl === pic.data?.url && media?.steps?.[0]?.modelUrl === model.data?.url);
  const badLink = await call("PUT", `/admin/modules/${id}`, { ...withMedia, coverImageUrl: "javascript:alert(1)" });
  check("a made-up link is refused (400)", badLink.status === 400, `status ${badLink.status}`);

  // 13. Teacher accounts: only the admin makes them; a deleted teacher is locked out at once
  const teacherName = `test-teacher-${Date.now()}`;
  const made = await call("POST", "/admin/accounts", { displayName: "Test Teacher", username: teacherName, password: "teach1234" });
  teacherId = made.data?.id;
  check("admin creates a teacher account (201)", made.status === 201 && Boolean(teacherId), `status ${made.status}: ${made.data?.error}`);
  const twice = await call("POST", "/admin/accounts", { displayName: "Copy", username: teacherName.toUpperCase(), password: "teach1234" });
  check("the same username twice is refused (409)", twice.status === 409, `status ${twice.status}`);
  const takenByAdmin = await call("POST", "/admin/accounts", { displayName: "Fake", username: process.env.ADMIN_USERNAME, password: "teach1234" });
  check("the admin's username can't be used (409)", takenByAdmin.status === 409, `status ${takenByAdmin.status}`);
  const shortPass = await call("POST", "/admin/accounts", { displayName: "Short", username: "shorty", password: "123" });
  check("a short password is refused (400)", shortPass.status === 400, `status ${shortPass.status}`);
  const noSignup = await call("POST", "/admin/accounts", { displayName: "Student", username: "student1", password: "student123" }, { auth: false });
  check("signing up without a login is refused (401)", noSignup.status === 401, `status ${noSignup.status}`);

  const teacherLogin = await call("POST", "/auth/login", { username: teacherName, password: "teach1234" }, { auth: false });
  const teacher = teacherLogin.res.headers.get("set-cookie")?.split(";")[0] ?? "";
  check("the teacher can log in", teacherLogin.status === 200 && teacherLogin.data?.role === "teacher", `status ${teacherLogin.status}`);
  const teacherModules = await call("GET", "/admin/modules", undefined, { as: teacher });
  check("the teacher can manage modules", teacherModules.status === 200, `status ${teacherModules.status}`);
  const teacherAccounts = await call("GET", "/admin/accounts", undefined, { as: teacher });
  check("the teacher can't see accounts (403)", teacherAccounts.status === 403, `status ${teacherAccounts.status}`);

  await call("PUT", `/admin/accounts/${teacherId}/password`, { password: "newpass5678" });
  const oldPass = await call("POST", "/auth/login", { username: teacherName, password: "teach1234" }, { auth: false });
  const newPass = await call("POST", "/auth/login", { username: teacherName, password: "newpass5678" }, { auth: false });
  check("after a reset only the new password works", oldPass.status === 401 && newPass.status === 200, `old ${oldPass.status} / new ${newPass.status}`);

  await call("DELETE", `/admin/accounts/${teacherId}`);
  teacherId = null;
  const afterDelete = await call("GET", "/admin/modules", undefined, { as: teacher });
  check("a deleted teacher is locked out at once (401)", afterDelete.status === 401, `status ${afterDelete.status}`);

  // 14. Dashboard numbers
  const stats = await call("GET", "/admin/stats");
  check("dashboard numbers load (programs + top components)",
    stats.status === 200 && Number.isInteger(stats.data?.arduinoPrograms) && Array.isArray(stats.data?.topComponents),
    `status ${stats.status}`);
  const anonStats = await call("GET", "/admin/stats", undefined, { auth: false });
  check("dashboard numbers need a login (401)", anonStats.status === 401, `status ${anonStats.status}`);

  // 15. Delete
  const del = await call("DELETE", `/admin/modules/${id}`);
  const gone = await call("GET", `/admin/modules/${id}`);
  check("delete (204), then it's gone (404)", del.status === 204 && gone.status === 404, `status ${del.status} / ${gone.status}`);
  id = null;
} catch (err) {
  failed += 1;
  console.error("ERROR", err.message);
} finally {
  // Never leave the test module behind, even if a check failed halfway.
  if (id) await call("DELETE", `/admin/modules/${id}`);
  if (teacherId) await call("DELETE", `/admin/accounts/${teacherId}`);
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}