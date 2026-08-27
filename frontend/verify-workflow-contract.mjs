// Walks the full submission lifecycle using the exact request shapes the
// UpdateInfoPage, MySubmissionsPage, and VerificationPage build.
const BASE = "http://127.0.0.1:8000";
let pass = 0, fail = 0;
const check = (ok, label) => { ok ? pass++ : fail++; console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`); };

async function req(path, { token, method = "GET", body } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
}
const login = async (id, pw) => (await req("/api/auth/login", { method: "POST", body: { identifier: id, password: pw } })).json.data.access_token;

const alumniT = await login("2000001", "AlumniTest123");
const adminT = await login("admin@iub.edu.bd", "AdminTest123");
const facultyT = await login("faculty@iub.edu.bd", "FacultyTest123");

console.log("\n=== UpdateInfoPage: prefill source ===");
let r = await req("/api/alumni/2000001", { token: alumniT });
const p = r.json.data;
check(p.personal_email !== null, "the form can prefill contact fields from the profile");
check(p.current_employment !== null, "…and employment fields");
check(p.academic !== null, "…and academic fields");
check(typeof p.academic.internship_completed === "boolean", "internship prefills as a boolean for the Yes/No select");

console.log("\n=== UpdateInfoPage: send only what changed ===");
r = await req("/api/submissions", { token: alumniT, method: "POST",
  body: { submission_type: "contact", proposed_changes: { phone: "+8801755500011" } } });
check(r.status === 201, "a contact change is accepted");
const sub = r.json.data;
const subId = sub.submission_id;
check(sub.status === "Pending", "it comes back Pending");
check(sub.current_values && "phone" in sub.current_values, "current_values is populated for the comparison");
check(sub.proposed_values.phone === "+8801755500011", "proposed_values carries the new value");
check(Object.keys(sub.proposed_values).length === 1, "only the changed field was sent, not the whole form");

console.log("\n=== UpdateInfoPage: field-level errors ===");
r = await req("/api/submissions", { token: alumniT, method: "POST",
  body: { submission_type: "academic", proposed_changes: { cgpa: 5.5 } } });
check(r.status === 400 && r.json.error.field === "cgpa", "an invalid CGPA names the field so the input can be highlighted");
check(typeof r.json.error.message === "string" && r.json.error.message.length > 0, "…with a message the form can show beneath it");
r = await req("/api/submissions", { token: alumniT, method: "POST",
  body: { submission_type: "employment", proposed_changes: { employment_status: "Employed", company: "" } } });
check(r.status === 400 && r.json.error.field === "company", "Employed with a blank employer names 'company'");

console.log("\n=== UpdateInfoPage: append form ===");
r = await req("/api/submissions", { token: alumniT, method: "POST",
  body: { submission_type: "employment_history", proposed_changes: { company: "Old Co", job_title: "Analyst", start_year: 2019, end_year: 2021 } } });
const histId = r.json.data.submission_id;
check(r.status === 201, "a previous role can be added");
check(r.json.data.current_values === null, "an append has no current_values — the single-column view is correct");

console.log("\n=== VerificationPage: the queue ===");
r = await req("/api/submissions?status=Pending&page=1&page_size=25", { token: adminT });
check(r.status === 200 && r.json.meta, "the Pending tab query returns rows plus meta");
check(r.json.data.length >= 2, "both submissions are waiting");
const row = r.json.data[0];
check(["submission_id","student_id","submission_type","status","submitted_at","current_values","proposed_values"].every(k => k in row),
  "every field the queue table and panel render is present");
r = await req("/api/submissions?status=Approved&page=1&page_size=25", { token: adminT });
check(r.status === 200 && r.json.data.length === 0, "an empty tab returns [] for the empty state");
r = await req("/api/submissions", { token: facultyT });
check(r.status === 403, "faculty are refused the queue, matching the hidden tab");

console.log("\n=== VerificationPage: send back ===");
r = await req(`/api/submissions/${subId}/request-correction`, { token: adminT, method: "PUT", body: { comments: "" } });
check(r.status === 400, "an empty comment is refused — the panel requires one first");
r = await req(`/api/submissions/${subId}/request-correction`, { token: adminT, method: "PUT",
  body: { comments: "Add the country code." } });
check(r.status === 200 && r.json.data.status === "Correction Required", "sending back works");
check(r.json.data.review_note === "Add the country code.", "the comment is stored for the alumnus");

console.log("\n=== MySubmissionsPage: the round trip ===");
r = await req("/api/submissions?page_size=100", { token: alumniT });
const mine = r.json.data;
check(mine.every(s => s.student_id === "2000001"), "an alumnus sees only their own");
const back = mine.find(s => s.submission_id === subId);
check(back.status === "Correction Required" && back.review_note, "the returned submission carries the comment inline");

r = await req(`/api/submissions/${subId}`, { token: alumniT, method: "PUT",
  body: { proposed_changes: { phone: "+880 1755 500011" } } });
check(r.status === 200 && r.json.data.status === "Pending", "editing and resending returns it to Pending");
check(r.json.data.review_note === null, "the old comment is cleared so it doesn't look unresolved");

console.log("\n=== VerificationPage: approve ===");
const before = (await req("/api/alumni/2000001", { token: adminT })).json.data.phone;
r = await req(`/api/submissions/${subId}/approve`, { token: adminT, method: "PUT", body: { note: "Confirmed." } });
check(r.status === 200 && r.json.data.status === "Approved", "approving works");
const after = (await req("/api/alumni/2000001", { token: adminT })).json.data.phone;
check(after === "+880 1755 500011" && after !== before, "the record now shows the approved value");
r = await req(`/api/submissions/${subId}/approve`, { token: adminT, method: "PUT", body: {} });
check(r.status === 409 && r.json.error.message, "re-approving gives a displayable conflict message");

console.log("\n=== VerificationPage: reject ===");
r = await req(`/api/submissions/${histId}/reject`, { token: adminT, method: "PUT", body: { reason: "Dates overlap an existing role." } });
check(r.status === 200 && r.json.data.status === "Rejected", "rejecting works");
r = await req("/api/submissions?page_size=100", { token: alumniT });
const rejected = r.json.data.find(s => s.submission_id === histId);
check(rejected.review_note === "Dates overlap an existing role.", "the alumnus can read why it was rejected");

r = await req(`/api/submissions/${histId}`, { token: alumniT, method: "PUT", body: { proposed_changes: { company: "X" } } });
check(r.status === 409, "a rejected submission can't be edited — the card correctly shows no button");

console.log("\n=== Role boundaries the UI relies on ===");
r = await req("/api/submissions", { token: adminT, method: "POST", body: { submission_type: "contact", proposed_changes: { phone: "1" } } });
check(r.status === 403, "an admin can't submit through the alumni form");
r = await req(`/api/submissions/${subId}/approve`, { token: alumniT, method: "PUT", body: {} });
check(r.status === 403, "an alumnus can't approve their own");

console.log(`\n${"=".repeat(52)}\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
