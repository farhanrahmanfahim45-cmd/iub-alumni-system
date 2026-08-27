// Checks the dashboard, data-quality and accounts pages against the shapes
// they actually destructure — every chart key, every KPI field.
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
const adminT = await login("admin@iub.edu.bd", "AdminTest123");
const facultyT = await login("faculty@iub.edu.bd", "FacultyTest123");
const alumniT = await login("2000001", "AlumniTest123");

console.log("\n=== OverviewDashboardPage ===");
let r = await req("/api/dashboard/overview", { token: facultyT });
check(r.status === 200, "faculty can load the academic dashboard");
const o = r.json.data;
for (const k of ["total_alumni","ib_majors","ib_minors","average_cgpa","internship_completion_rate"])
  check(k in o.kpis, `kpis.${k} is present for its KPI card`);
check(o.kpis.internship_completion_rate <= 1, "the completion rate is a 0–1 proportion the bar can use");
check(o.kpis.average_cgpa <= 4, "average CGPA is on the 4.00 scale the bar divides by");

const OCHARTS = { alumni_by_graduation_year:["year","count"], degree_distribution:["degree","count"],
  major_distribution:["major","count"], minor_distribution:["minor","count"],
  cgpa_distribution:["bucket","count"], internship_completion:["status","count"],
  academic_honors:["honor","count"] };
for (const [key, [labelKey, valueKey]] of Object.entries(OCHARTS)) {
  const rows = o.charts[key];
  check(Array.isArray(rows), `charts.${key} exists`);
  if (rows?.length) check(labelKey in rows[0] && valueKey in rows[0],
    `…with the '${labelKey}'/'${valueKey}' keys the component reads`);
}
check(o.charts.internship_completion.length <= 2, "internship_completion is binary — the donut is the right choice");
check(o.charts.employment_by_industry === undefined, "no career data leaks into the academic dashboard");
check(o.charts.minor_distribution.every(rr => rr.minor !== null), "minor_distribution has no null category to render");

console.log("\n=== Filters move the whole page ===");
r = await req("/api/dashboard/overview?degree=BBA", { token: adminT });
const bba = r.json.data;
check(bba.kpis.total_alumni < o.kpis.total_alumni, "a filter narrows the KPI");
check(bba.charts.degree_distribution.every(rr => rr.degree === "BBA"), "…and the charts, not just the KPIs");
r = await req("/api/dashboard/overview?degree=BBA&graduation_year=2025", { token: adminT });
check(r.status === 200, "two filters combine");
r = await req("/api/dashboard/overview?major=NoSuchMajor", { token: adminT });
check(r.status === 200 && r.json.data.kpis.total_alumni === 0, "an empty result is a 200 with zero, for the no-data panel");
check(r.json.data.kpis.average_cgpa === null, "…and a null average rather than NaN");

console.log("\n=== CareerDashboardPage ===");
r = await req("/api/dashboard/career?top_n=10", { token: facultyT });
check(r.status === 200, "the career dashboard loads");
const c = r.json.data;
for (const k of ["total_alumni","employed","seeking_employment","further_studies","self_employed","employment_rate"])
  check(k in c.kpis, `kpis.${k} is present`);
const CCHARTS = { employment_by_industry:["industry","count"], top_employers:["company","count"],
  employment_by_job_function:["job_function","count"], employment_by_country:["country","count"],
  career_snapshot:["status","count"], career_progression:["roles_held","alumni"],
  employment_by_graduation_year:["year","total"] };
for (const [key, [labelKey, valueKey]] of Object.entries(CCHARTS)) {
  const rows = c.charts[key];
  check(Array.isArray(rows), `charts.${key} exists`);
  if (rows?.length) check(labelKey in rows[0] && valueKey in rows[0],
    `…with '${labelKey}'/'${valueKey}'`);
}
check(c.charts.employment_by_graduation_year[0] && "employed" in c.charts.employment_by_graduation_year[0],
  "the cohort trend carries both series the line chart draws");
check(c.charts.top_employers.length <= 10, "top_n=10 is respected");
check(c.charts.career_progression.every(rr => Number(rr.roles_held) >= 1), "roles_held is at least 1, so the label reads correctly");
check(c.charts.employment_by_industry.length > 6, "industries exceed what a pie could show — the bar list is right");

console.log("\n=== Dashboard access ===");
check((await req("/api/dashboard/overview", { token: alumniT })).status === 403, "alumni are refused — the tab is correctly hidden");
check((await req("/api/dashboard/career", { token: alumniT })).status === 403, "…both dashboards");
check((await req("/api/dashboard/data-quality", { token: facultyT })).status === 403, "faculty are refused data quality");

console.log("\n=== DataQualityPage ===");
r = await req("/api/dashboard/data-quality", { token: adminT });
check(r.status === 200, "admin loads data quality");
const dq = r.json.data;
for (const k of ["pending_verification","incomplete_profiles","missing_employment_info","missing_cgpa",
                 "potential_duplicates","bba_without_internship","unclaimed_profiles","deactivated_records"])
  check(k in dq && typeof dq[k] === "number", `${k} is a number for its tile`);

console.log("\n=== UsersPage ===");
r = await req("/api/users?status=active&page=1&page_size=25", { token: adminT });
check(r.status === 200 && r.json.meta, "the Active tab query returns rows plus meta");
const u = r.json.data[0];
check(["user_id","role","email","full_name","status","student_id","created_at","last_login_at"].every(k => k in u),
  "every column the table renders is present");
check(!("password_hash" in u), "no password hash is returned");
r = await req("/api/users?status=pending_verification", { token: adminT });
check(r.status === 200 && Array.isArray(r.json.data), "the Awaiting-approval tab works");

// Approve/deactivate round trip, as the row buttons do it.
await req("/api/users", { token: adminT, method: "POST",
  body: { full_name: "Temp Faculty", email: "temp.faculty@iub.edu.bd", role: "faculty", password: "TempPassword123" } });
r = await req("/api/users?status=active&page_size=100", { token: adminT });
const temp = r.json.data.find(x => x.email === "temp.faculty@iub.edu.bd");
check(!!temp, "the create panel adds a staff account");
r = await req(`/api/users/${temp.user_id}`, { token: adminT, method: "PUT", body: { status: "deactivated" } });
check(r.status === 200 && r.json.data.status === "deactivated", "the Deactivate button works");
r = await req(`/api/users/${temp.user_id}`, { token: adminT, method: "PUT", body: { status: "active" } });
check(r.status === 200 && r.json.data.status === "active", "…and Reactivate");

const me = (await req("/api/auth/me", { token: adminT })).json.data;
r = await req(`/api/users/${me.user_id}`, { token: adminT, method: "PUT", body: { status: "deactivated" } });
check(r.status === 409, "an admin can't deactivate themselves — the row shows 'You' instead of a button");
r = await req("/api/users", { token: adminT, method: "POST",
  body: { full_name: "Dup", email: "temp.faculty@iub.edu.bd", role: "faculty", password: "TempPassword123" } });
check(r.status === 409 && r.json.error.field === "email", "a duplicate email names the field for the form");
check((await req("/api/users", { token: facultyT })).status === 403, "faculty are refused accounts");

console.log(`\n${"=".repeat(54)}\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
