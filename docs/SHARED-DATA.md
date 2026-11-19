# Sharing counts and reports between phones

Out of the box the app keeps everything in one browser. To make a count or a student report on one phone appear on
every phone, give the app a shared database address. This is optional and takes about 10 minutes.

## Set it up (free)
1. Go to https://console.firebase.google.com and create a project (any name; Analytics off).
2. In the left menu: Build -> Realtime Database -> Create Database. Pick any location. Start in **locked mode**.
3. Open the **Rules** tab, replace everything with the rules below, and press Publish.
4. On the **Data** tab, copy the address at the top. It looks like `https://your-project-default-rtdb.firebaseio.com`.
5. Paste it into `syncUrl` in `src/settings.js`, then build, push and publish.

```json
{
  "rules": {
    "v1": {
      "counts": {
        ".read": true,
        "$bay": {
          ".write": true,
          ".validate": "newData.hasChildren(['count','start','end','version','category']) && newData.child('count').isNumber() && newData.child('count').val() >= 0 && newData.child('count').val() <= 999 && newData.child('start').isNumber() && newData.child('end').isNumber()"
        }
      },
      "reports": {
        ".read": true,
        "$id": {
          ".write": "!data.exists()",
          ".validate": "newData.hasChildren(['zone','band','t']) && newData.child('zone').isString() && newData.child('band').isString() && newData.child('band').val().matches(/^(plenty|few|full|leaving)$/) && newData.child('t').isNumber()"
        }
      },
      "poll": {
        ".read": false,
        "$id": { ".write": "!data.exists()" }
      },
      "pollcount": {
        ".read": true,
        "$id": { ".write": "!data.exists()", ".validate": "newData.hasChildren(['t']) && newData.child('t').isNumber()" }
      },
      "fieldkit": {
        ".read": false,
        "$device": { ".write": true }
      },
      "history": {
        ".read": true,
        "$id": {
          ".write": "!data.exists()",
          ".validate": "newData.hasChildren(['zone','t','count']) && newData.child('count').isNumber() && newData.child('t').isNumber()"
        }
      }
    }
  }
}
```

## The field kit and the student survey
With the address set, the field kit backs up everything you collect (stall counts, poll answers, tallies) each time you
save, and `field.html?survey` becomes a survey students can fill in on their own phones from a QR code. Those two lists
(`poll` and `fieldkit`) are write-only: the website cannot read them back. You read them in the Firebase console
(Data tab, then the three-dot menu, Export JSON). In Firebase a read permission granted higher up cannot be taken away lower down, which is why the
rules give read access to `counts`, `reports` and `history` one by one and never to `v1` as a whole.

## Status (2026-11-19)
A database is set up (`Settings.syncUrl`) and sharing was tested against it: a staff count and a student report made in
one browser appeared in a second one; bad data and reads of the private lists were refused.

**Sharing is only used when the page address ends in `?live`.** Without it, the page is the self-contained replay demo,
so a first-time visitor never sees an empty deck. Live mode keeps its own data, apart from the demo's.

## What changes in live mode
- The page starts empty instead of with sample data, hides the demo clock, and labels itself a test build.
- Staff counts, student reports and a history of counts are shared. Phones refresh every 15 seconds.
- With no signal, entries wait on the phone and are sent when the connection returns.
- Nothing personal is stored: a bay id, a number or a band, and a time.

## Limits you must be honest about
- **Anyone with the link can write.** There is no sign-in, so nothing stops a false count or report. The rules above only
  check the shape of the data. This is acceptable for a demo among testers, not for a pilot. A pilot needs staff sign-in.
- **Tested once against the real database, in a desktop browser.** The automated tests use an in-memory stand-in. Real phones on campus Wi-Fi have not been tried.
- Old reports and history are never deleted; clear them from the Firebase console.
