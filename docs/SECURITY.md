# Security: what is protected, and what is not

A plain statement for a student prototype with no payments and almost no personal data. Updated 2026-11-21.

## What an attacker could want, and what is there
| Target | What is there |
|---|---|
| User accounts and passwords | None for students. Monitor accounts (optional, see below) live in Firebase Authentication, not in this code |
| Personal data | No names, emails, plates, faces or location. Survey answers are anonymous taps and short free text |
| The counts | The one thing worth attacking: a false count sends drivers to the wrong place |
| The site itself | Static files on GitHub Pages. Whoever controls the GitHub account controls the site |

## In place
| Risk | What the app does | Checked by |
|---|---|---|
| Eavesdropping | Served only over HTTPS | GitHub Pages |
| Leaked secrets | There are none in the code. The database address and the Firebase web key are public by design; access is controlled by rules, not by hiding them | Code review |
| Malicious data shown on screen | Everything read from storage or the shared database is validated before display (`ParkingModel.sanitize`, `cleanReports`). Only numbers and known bay ids reach the page. Typed text is escaped | `npm test` |
| Malformed or oversized writes | The database rules in `firebase/rules.json` check every field: known bay ids only, counts 0 to 999, no dates in the future, no extra fields, no nested data, short strings | `npm run check:rules` (91 checks in the Firebase emulator) |
| Wiping the data | Counts cannot be deleted, and reports, history and survey answers cannot be edited once written | `npm run check:rules` |
| Reading other people's answers | Survey answers and field-kit backups are write-only: the website cannot read them back | `npm run check:rules` |
| One bad entry blocking the rest | An entry the database refuses is dropped from the phone's outbox instead of being retried forever | `npm test` |
| Lost or polluted shared data | A copy of counts, reports and history is saved every night for 90 days (`.github/workflows/backup.yml`) | Actions tab |
| Not knowing something is wrong | The app reports its own failures, and a monitor checks the site, the data and the database's locks every five minutes and emails the owner (`docs/MONITORING.md`) | `npm test`, Actions tab |
| Loading code from elsewhere | A content security policy lets the page load only its own files and talk only to its own database (and Firebase sign-in, when that is on) | Browser |

## Monitor sign-in (built, switched off until you set it up)
With `authKey` empty in `src/settings.js`, the Count screen asks for a shared password. **That is a speed bump, not access control**: the check runs in the browser, and the database accepts a correctly shaped count from anyone.

Setting `authKey` turns on real sign-in through Firebase Authentication:

- The Count screen asks for a monitor's email and password. The password goes to Google's sign-in service and is never stored by this app. The phone keeps the account's id and its tokens, nothing else.
- The account must also be on the monitor list in the database, which only the project owner can edit.
- Counts and history are sent with a token that lasts an hour and is renewed automatically.
- With `firebase/rules-signin.json` in place, the database refuses any count that does not carry a monitor's token.
- Each history entry records which monitor account made it. This is the audit log.
- Student reports and surveys stay anonymous and need no account.

This was tested against a stand-in for the sign-in service (`npm test`) and against the real rules engine in the emulator (`npm run check:rules`). **It has not been run against the real Firebase project**, because that needs the steps below.

### Turning it on, in this order
1. Firebase console → Build → Authentication → Get started → Sign-in method → enable **Email/Password**.
2. Authentication → Users → **Add user** for each monitor. Use long, unique passwords. Copy each user's **User UID**.
3. Realtime Database → Data → under `v1`, add `monitors`, and under it one entry per monitor: key = the User UID, value = `true`.
4. Project settings → General → copy the **Web API key** into `authKey` in `src/settings.js`. Publish.
5. Open the live app, go to Count, and sign in. Confirm a count saves in `?live` mode.
6. Only then: Realtime Database → Rules → paste `firebase/rules-signin.json` → Publish.

Doing step 6 before step 5 locks every monitor out. To undo, paste `firebase/rules.json` back.

## Not in place
| Gap | Consequence | Fix |
|---|---|---|
| Sign-in is not switched on yet | Until the steps above are done, anyone with the `?live` address can add a correctly shaped false count | The steps above |
| No rate limiting or bot protection | A script could still add thousands of valid-looking student reports or survey answers | Firebase App Check needs the Firebase SDK; or a small server in front that limits each device |
| Students are not verified | A report is one anonymous tap | KSU single sign-on, which needs KSU IT |
| Survey answers are not in the nightly backup | They are write-only, so a script cannot read them | Export `poll` from the Firebase console after each survey round |
| Inline scripts | The content security policy has to allow inline code, which weakens it. About 120 buttons use inline handlers | Move scripts and handlers to separate files. Lower priority: no text from other users is ever shown on the page |
| Project tools password | The About tools and field kit are still behind a shared password checked in the browser | Move them behind the same sign-in |

## Accounts to protect (only the owner can do these)
- Turn on two-factor sign-in for the **GitHub** account. Whoever gets into it can replace the whole site.
- Turn on two-step verification for the **Google** account that owns the Firebase project.
- Keep the Firebase project on the free Spark plan while testing. It stops serving at its quota instead of billing.
