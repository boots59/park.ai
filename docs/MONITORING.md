# Monitoring and alerts

The owner should hear that something is wrong from the monitor, within minutes, and not from a student a day later.

## How it works
1. **The app reports its own failures.** When a script error happens on someone's phone, a monitor's sign-in fails, or the database refuses an entry, the app sends a tally mark: a time and one of four kinds (`js`, `signin`, `refused`, `ai`). For script errors it also sends the error message and line number to a write-only list. No address, account, device id or location. At most six per visit.
2. **A monitor looks from the outside every five minutes** (`scripts/monitor.cjs`, run by `.github/workflows/monitor.yml`). It loads the site, reads the public data, counts the tally marks, and tries three things that must be refused.
3. **An alert is a GitHub issue** labelled `park-ai-alert` that mentions the repository owner, so GitHub sends an email and a phone notification if the GitHub app is installed.
4. **It is tuned not to nag.** The same alerts are not sent twice. A change adds a comment. When every check passes again, the issue closes itself with "All clear".

## The alerts
| Alert | What it saw | What to do |
|---|---|---|
| `site-down` | The site did not load | Check the Actions tab for a failed publish, and githubstatus.com |
| `site-changed` | The page loaded without its title or security policy | Someone may have replaced it. Check recent commits and publishes; change the GitHub password; republish |
| `model-missing` | The AI model file is not being served | Republish. The publish step fetches the model |
| `database-down` | The shared database did not answer | Check the Firebase console and its usage quota |
| `surveys-readable` | **Urgent.** Anyone can read survey answers | Paste `firebase/rules.json` into the Firebase console now |
| `rules-open` | **Urgent.** The database accepted a write outside the app's data | Paste `firebase/rules.json` into the Firebase console now |
| `rules-old` | Counts can be deleted, so the hardened rules are not in place | Paste `firebase/rules.json` (or `rules-signin.json` once sign-in works) |
| `flood-reports`, `flood-counts`, `flood-surveys` | More entries in ten minutes than people could make | Likely a script. Restore from the nightly backup if the data is polluted; switch on monitor sign-in |
| `bad-count` | A stored count is malformed or dated in the future | The app ignores it. Find how it got in; the hardened rules refuse these |
| `app-errors` | Several phones reported script errors | The last publish probably broke something. Read `v1/errors` in the Firebase console |
| `failed-signins` | Many failed monitor sign-ins | Someone is guessing. Firebase throttles them; check that monitor passwords are long and unique |
| `refused-writes` | The database refused several entries from the app | The app and the rules disagree, or someone is sending bad data through the app |

## Tuning
Every limit is in `monitor/config.json`. If an alert fires on an ordinary busy morning, raise its limit; if it missed something, lower it. `windowMinutes` is how far back each count looks. The judgement is tested in `test/monitor.test.cjs`, part of `npm test`.

## Trying it
- `npm run monitor` looks once and prints what it found, without telling anyone.
- Actions tab → monitor → Run workflow → tick **Send a test alert**. You should get an email within a minute; the issue closes itself on the next check.

## Limits
- **Not instant.** GitHub runs schedules every five minutes at the fastest and can run late when it is busy. Second-by-second alerting needs a server (for example Firebase Cloud Functions on the paid plan) or an uptime service.
- **It sees what is public.** It cannot read survey answers or error messages, by design; it counts tally marks.
- **Someone attacking Google's sign-in service directly** does not pass through the app, so the app does not see it. Firebase Authentication throttles that itself.
- **The tally marks can be faked.** Anyone can post one, which at worst raises an alert that was worth a look anyway.
- **GitHub pauses schedules** in a repository with no activity for 60 days. Any commit starts them again.
- The error signals need `firebase/rules.json` pasted into the Firebase console. Until then the app's reports are refused and the monitor says so.
