// Exercises the same API calls the React pages make, using the frontend's
// own request shapes, to confirm the two halves actually fit together.
const BASE = "http://127.0.0.1:8000";
let pass = 0, fail = 0;
const check = (ok, label) => { ok ? pass++ : fail++; console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`); };

async function req(path, { token, method = "GET", body } = {}) {
  const headers = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
}

console.log("\n=== SignInPage ===");
let r = await req("/api/auth/login", { method: "POST", body: { identifier: "faculty@iub.edu.bd", password: "FacultyTest123" } });
check(r.status === 200 && r.json.data.access_token, "sign in returns a token in data.access_token");
const facultyT = r.json.data.access_token;
check(r.json.data.role === "faculty", "role is present for the shell to switch on");

r = await req("/api/auth/login", { method: "POST", body: { identifier: "faculty@iub.edu.bd", password: "nope" } });
check(r.status === 401 && r.json.error?.message, "a failed sign in returns error.message the form can display");
check(!r.json.error.message.toLowerCase().includes("password"), "…and it doesn't say which field was wrong");

r = await req("/api/auth/login", { method: "POST", body: { identifier: "2000001", password: "AlumniTest123" } });
const alumniT = r.json.data.access_token;
check(r.status === 200, "an alumnus signs in with a Student ID");

r = await req("/api/auth/login", { method: "POST", body: { identifier: "admin@iub.edu.bd", password: "AdminTest123" } });
const adminT = r.json.data.access_token;

console.log("\n=== AuthProvider session restore ===");
r = await req("/api/auth/me", { token: facultyT });
check(r.status === 200 && r.json.data.role === "faculty", "/me restores the session on refresh");
r = await req("/api/auth/me", { token: "garbage" });
check(r.status === 401, "a bad token 401s so the client can clear it and redirect");

console.log("\n=== DirectoryPage ===");
r = await req("/api/alumni?page=1&page_size=25&sort_by=name&sort_order=asc", { token: facultyT });
check(r.status === 200, "the directory query the page builds succeeds");
const meta = r.json.meta, rows = r.json.data;
check(meta.total_records === 500 && meta.page_size === 25 && meta.total_pages === 20, "meta drives the pagination control (500 / 25 / 20)");
check(rows.length === 25, "a full page of rows comes back");

const row = rows[0];
const cols = ["student_id","alumni_id","name","degree","major","minor","graduation_year","company","employment_status"];
check(cols.every(c => c in row), "every column the table renders is present");
check(!("personal_email" in row) && !("phone" in row), "contact fields are absent from directory rows");
check(typeof row.name === "string" && row.name.includes(" "), "name arrives pre-joined for the avatar and cell");

r = await req("/api/alumni?degree=BBA&graduation_year=2025&page=1&page_size=25", { token: facultyT });
check(r.status === 200 && r.json.meta.total_records > 0, "filter combination works as the sidebar sends it");
r = await req("/api/alumni?name=rahman&page=1&page_size=25", { token: facultyT });
check(r.json.meta.total_records > 0, "debounced name search returns matches");
r = await req("/api/alumni?name=zzzznotreal&page=1&page_size=25", { token: facultyT });
check(r.status === 200 && r.json.data.length === 0, "a no-match search returns an empty page for the empty state");
r = await req("/api/alumni?page=1&page_size=25&sort_by=graduation_year&sort_order=desc", { token: facultyT });
check(r.status === 200, "clicking a sortable header is a valid query");
r = await req("/api/alumni", { token: alumniT });
check(r.status === 403, "an alumnus is refused the directory, so the tab is correctly hidden");

console.log("\n=== ProfilePage ===");
r = await req(`/api/alumni/${rows[0].student_id}`, { token: facultyT });
check(r.status === 200, "faculty opens a profile from a directory row");
const p = r.json.data;
check(p.contact_details_visible === false, "contact_details_visible is false for faculty");
check(p.personal_email === null && p.phone === null, "…and the values really are absent, not just flagged");
check(Array.isArray(p.employment_history), "employment_history is always an array");
check(p.academic === null || typeof p.academic.internship_completed === "boolean" || p.academic.internship_completed === null,
  "internship_completed is a boolean, not 'Yes'/'No'");

r = await req(`/api/alumni/${rows[0].student_id}`, { token: adminT });
check(r.json.data.contact_details_visible === true, "an admin sees contact_details_visible true");
check(r.json.data.personal_email !== null, "…and the email is populated");

r = await req("/api/alumni/2000001", { token: alumniT });
check(r.status === 200 && r.json.data.contact_details_visible === true, "an alumnus sees their own contact details on /me");
r = await req("/api/alumni/2100002", { token: alumniT });
check(r.status === 403, "an alumnus is refused another profile");
r = await req("/api/alumni/9999999", { token: adminT });
check(r.status === 404 && r.json.error?.message, "an unknown ID returns a displayable error");

// A profile with no employment history must render the empty branch.
let foundEmpty = false;
for (const c of rows.slice(0, 20)) {
  const pr = await req(`/api/alumni/${c.student_id}`, { token: adminT });
  if (pr.json.data.employment_history.length === 0) { foundEmpty = true; break; }
}
check(foundEmpty, "profiles with no previous roles exist and return []");

console.log("\n=== Error envelope ===");
r = await req("/api/alumni?page_size=999", { token: facultyT });
check(r.status === 400 && r.json.error?.code === "VALIDATION_ERROR", "validation errors use the {error:{code,message}} shape the client parses");
r = await req("/api/alumni");
check(r.status === 401 && r.json.error, "unauthenticated requests use the same envelope");

console.log(`\n${"=".repeat(50)}\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
