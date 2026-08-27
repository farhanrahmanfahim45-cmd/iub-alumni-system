# Setup — start here

This gets the system running on your Windows machine. It assumes you're comfortable copying commands into a terminal, and nothing beyond that.

Roughly 20 minutes, most of it waiting for downloads.

---

## Don't sort the files by hand

If you downloaded the files individually, they arrived in one flat pile with Windows renaming the duplicates — `main`, `main (1)`, `main (2)` are three genuinely different files that belonged in three different folders. There's no reliable way to tell them apart by looking.

**Delete that pile and use `iub-alumni-system.zip` instead.** Unzip it and every file is already where it belongs. Folder structure is not decoration here — Python and Node find files by their path, so one file in the wrong folder means nothing runs.

Unzip it somewhere with a short path and no spaces:

```
C:\projects\iub-alumni\
```

Not `C:\Users\You\OneDrive\Documents\My Project (final) (2)\`. Long paths and spaces cause odd failures that look like real bugs.

---

## Step 1 — Install the three tools

Check what you already have. Open **PowerShell** (Start menu → type "powershell") and run:

```powershell
python --version
node --version
psql --version
```

Anything that says "not recognized" needs installing:

| Missing | Get it from | Note |
|---|---|---|
| Python | [python.org/downloads](https://www.python.org/downloads/) | **Tick "Add Python to PATH"** on the first screen. Easy to miss, annoying to fix later. |
| Node.js | [nodejs.org](https://nodejs.org/) | Take the LTS version. |
| PostgreSQL | [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) | It asks for a password for the `postgres` user. **Write it down.** You need it in step 3 and there's no recovery. |

Close and reopen PowerShell after installing, then re-run the three commands. They should all print a version now.

---

## Step 2 — Install the project's dependencies

In PowerShell, move into the project folder and run both lines:

```powershell
cd C:\projects\iub-alumni

pip install -r backend\requirements.txt

cd frontend
npm install
npm run build
cd ..
```

The `npm` steps take a few minutes and print a lot of text. Warnings are normal. Only stop if you see the word **error**.

---

## Step 3 — Create the database

Still in PowerShell. Each `psql` command asks for the `postgres` password from step 1.

```powershell
psql -U postgres -c "CREATE DATABASE iub_alumni;"

psql -U postgres -d iub_alumni -f database\schema.sql
psql -U postgres -d iub_alumni -f database\migrations\001_core_constraints.sql
psql -U postgres -d iub_alumni -f database\migrations\002_supporting_tables.sql
```

**Before the last one**, open `database\migrations\003_app_role.sql` in Notepad. Near the top is:

```sql
CREATE ROLE iub_app LOGIN PASSWORD 'CHANGE_ME_BEFORE_RUNNING'
```

Replace `CHANGE_ME_BEFORE_RUNNING` with a password you make up. Write it down — step 4 needs it. Save, then:

```powershell
psql -U postgres -d iub_alumni -f database\migrations\003_app_role.sql
```

That creates a limited account for the app to use. The app never connects as the `postgres` superuser, so a bug in the code can't drop your tables.

> **A decision to make here.** Section 1 of `001_core_constraints.sql` changes email handling. Without it, alumni can only ever save an `@iub.edu.bd` address — so a graduate can never update to their real email, which is the whole point of the self-service feature. The file applies the fix by default, which is almost certainly what you want. `docs/deployment.md` §1 explains the alternative.

---

## Step 4 — Create the settings file

In the `backend` folder there's `.env.example`. Copy it and rename the copy to exactly `.env` — no `.example`, no `.txt`.

> If you downloaded files individually, Windows may have stripped the leading dot and saved it as `env.example`. Rename it to `.env` with the dot. In File Explorer, turn on **View → File name extensions** first, or Windows will silently add `.txt`.

Open `.env` in Notepad and fill in these lines:

```ini
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iub_alumni
DB_USER=iub_app
DB_PASSWORD=          <-- the password you made up in step 3

JWT_SECRET=           <-- generate this below

SERVE_FRONTEND_DIR=../frontend/dist

SEED_ADMIN_PASSWORD=      <-- make one up, at least 10 characters
SEED_FACULTY_PASSWORD=    <-- another
SEED_ALUMNI_PASSWORD=     <-- another
```

For `JWT_SECRET`, run this and paste the result:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

That key signs login sessions. Anyone who has it can forge a login, so it stays in `.env` and never goes anywhere else. `.env` is already excluded from Git.

---

## Step 5 — Load the data

```powershell
python database\load_data.py
python database\seed_users.py
```

The first loads 500 practice alumni records. The second creates your sign-in accounts.

`load_data.py` re-checks every record before writing. If it refuses, it prints exactly which rows failed and why, and writes nothing — a refusal is it working, not breaking.

---

## Step 6 — Run it

```powershell
cd backend
python -m uvicorn app.main:app --port 8000
```

Leave that window open — closing it stops the system. Open a browser to:

**http://localhost:8000**

Sign in as any of these:

| Role | Sign in with | Password |
|---|---|---|
| Administrator | `admin@iub.edu.bd` | your `SEED_ADMIN_PASSWORD` |
| Faculty | `faculty@iub.edu.bd` | your `SEED_FACULTY_PASSWORD` |
| Alumni | `2000001` | your `SEED_ALUMNI_PASSWORD` |

Alumni sign in with a Student ID, staff with an email. That's intentional, not a quirk.

To stop: click the PowerShell window and press **Ctrl+C**.

---

## Try the thing it's actually built around

Worth doing once, because it's the part that makes this a records system rather than a website:

1. Sign in as **alumni** (`2000001`). Go to **Update information**, change your phone number, click through to **Send for review**.
2. Open **My profile**. The phone number is unchanged — your submission is a request, not an edit.
3. Sign out, sign in as **admin**. Go to **Verification**. Your request is waiting.
4. Click it. You'll see the old value beside the new one. Click **Approve**.
5. Now check the profile. It's updated. Open **Accounts → Data quality**, then look at the audit log — the change is recorded with who approved it and what it replaced.

That loop is the system's whole reason for existing.

---

## When something goes wrong

**"python is not recognized"** — Python installed without being added to PATH. Reinstall and tick that box, or reopen PowerShell if you just installed it.

**"password authentication failed for user iub_app"** — `DB_PASSWORD` in `.env` doesn't match what you typed into `003_app_role.sql`. Fix `.env`, or re-run this with a new password:

```powershell
psql -U postgres -c "ALTER ROLE iub_app PASSWORD 'your-new-password';"
```

**"could not connect to server"** — PostgreSQL isn't running. Start menu → "Services" → find `postgresql-x64-…` → right-click → Start.

**The page loads but everything is blank or errors** — you skipped `npm run build`, or `SERVE_FRONTEND_DIR` is wrong in `.env`. Check `frontend\dist\index.html` exists.

**"Missing in .env: …"** — that exact variable is absent or empty. The message names it.

**"Too many failed attempts"** — you got the password wrong ten times. Wait five minutes; it clears itself. That's the brute-force protection working.

**Something else** — the terminal window running uvicorn prints the real error. That text is the useful part; the browser only ever shows a generic message, deliberately, so error details don't leak to users.

---

## Which files matter to you

| Folder | What's in it | Will you touch it? |
|---|---|---|
| `backend/` | The API — all the rules about who can do what | Only `.env` |
| `frontend/` | The web interface | Only if you change the design |
| `database/` | Setup scripts you ran above | Run again only to reset |
| `docs/` | Every decision, written down | Read as needed |
| `data/` | The 500 practice records | Replace with real data later |

Two worth actually reading: **`docs/deployment.md`** when you move this off your laptop, and **`docs/database_dictionary.md`** when you want to know what a field means.

---

## Checking it still works after you change something

```powershell
cd backend
python tests\test_api.py
python tests\test_workflow.py
python tests\test_dashboard.py
```

188 checks. All should pass. If you break something, these tell you what — far faster than clicking around looking for it.

Run them against your practice database, not real alumni data. They create and modify records on purpose.

---

## Before real alumni data goes in

The two open questions from the README need the department's answer, not more code:

1. **Email addresses** — settled by whether you applied section 1 of migration 001 (step 3).
2. **Who sees contact details** — personal email and phone are currently admin-only, because nobody has decided whether faculty should see them. Deliberately the strictest option until someone chooses.

Also read `docs/deployment.md` §8 on HTTPS. On a shared network without it, passwords travel readable. Fine on your own laptop, not fine on a department server.
