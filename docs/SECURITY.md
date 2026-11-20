# Security: what is protected, and what is not

A plain statement for a prototype with no accounts, no payments and no personal data.

## In place
| Risk | What the app does |
|---|---|
| Eavesdropping | Served only over HTTPS (GitHub Pages) |
| Leaked secrets | There are none in the code. The database address is public by design; access is controlled by the database's rules, not by hiding it |
| Malicious data shown on screen | Everything read from storage or the shared database is validated before display (`ParkingModel.sanitize`, `cleanReports`). Free text is escaped |
| Malformed writes to the database | Database rules check the shape of every count and report, and reports cannot be edited after they are written |
| Reading other people's answers | Survey answers and field-kit backups are write-only: the website cannot read them back |
| Loading code from elsewhere | A content security policy lets the page load only its own files and talk only to its own database |
| Personal data exposure | None is collected: no names, emails, plates, faces or location |

## Not in place (and what a real deployment would need)
| Gap | Consequence | Fix |
|---|---|---|
| No sign-in | Anyone with the `?live` address can add a count or report, including false ones | Staff sign-in; students verified through KSU single sign-on |
| No rate limiting or bot protection | A script could flood the database with entries | Firebase App Check, per-device limits, or a small server in front |
| No backups | Shared data could be wiped or polluted | Scheduled exports |
| No audit log | No record of who entered what | Signed-in writes with a history |
| Inline scripts | The content security policy has to allow inline code, which weakens it | Move scripts to separate files |

For the hackathon the live mode is a demonstration among testers. It should not be relied on.

## Staff password (added 2026-11-20)
The Count screen asks for the monitor password; the project tools on the About screen and the field kit ask for a separate staff password. Each is asked once per phone. **This is a speed bump, not access control.** The site is static, so the check runs in the browser: anyone who reads the source can get past it, and the shared database still accepts a correctly shaped count from anyone, as described above. It stops students and demo visitors from wandering into the tally screen. It does not stop someone determined. Real protection needs sign-in handled by a server (for example Firebase Authentication with rules that only let signed-in monitors write counts); that is the first thing to build before any pilot. The student survey link (`field.html?survey`) is deliberately not locked.
