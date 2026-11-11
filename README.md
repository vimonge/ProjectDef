# ProjectDef


ProjectDef is a working name. The final app name is still to be decided, so it is
only set in `app.json` (`name`, `slug`, `scheme`, `android.package`) and can be
changed there in one place.
Voice-first defecting app for hotel room inspections. React Native + Expo, Android first.

The idea: walk a room and talk. Each defect you say becomes a draft with the
issue, where it is, the zone and the trade already filled in, and a title in
the format builders ask for: `1008 - Paint marks - behind entry door`.

## What works today (step 1: voice sweep)

- Add a room (number and optional room type).
- Start a sweep and talk through the room. Say "next" between defects, or pause 5 seconds.
- Drafts build live. Tap one to fix the issue, location, zone or trade, or delete it.
- Type a defect instead of saying it (same parsing).
- Share a room's list as text (handy for pasting titles into Procore for now).
- Everything is saved on the phone. No account, no server.

Not built yet: photos and markup, floor plans and pins, reports, tradie close-out.

## Put it on your Android phone

Voice recognition needs the installed app. It does not work in Expo Go.

1. Create a free account at expo.dev.
2. On your computer, in this folder:

   ```bash
   npm install
   npx eas-cli@latest login
   npx eas-cli@latest build --profile preview --platform android
   ```

3. The first run asks to create the project and an Android keystore. Say yes to both.
4. When the build finishes (roughly 10 to 20 minutes), open the link or QR code on
   your phone and install the APK.

Voice continuous mode needs Android 13 or newer.

### Working without signal

The room screen shows a "Download" button if the Australian English voice pack
is not on the phone yet. Download it once on Wi-Fi and recognition then runs on
the phone with no signal.

## Updating the app

Most changes (wording, parsing, screens) go out **over the air**: no reinstall.

```bash
git pull
npx eas-cli@latest update --channel preview --message "what changed"
```

Then open ProjectDef on the phone. It checks on launch and whenever it comes
back to the front; when the new version has downloaded, the bottom of the Rooms
screen shows **New version ready · Restart**. Tap it. The line at the bottom of
the Rooms screen always says which version is running.

A **new build** is only needed when a change adds native code (a new library
such as the camera). `runtimeVersion` uses the `fingerprint` policy, so those
updates are simply ignored by older builds rather than crashing them — if an
update never appears on the phone, that is why.

```bash
npx eas-cli@latest build --profile preview --platform android
```

## Develop

```bash
npm install
npm run web        # quick look in a browser (typing works, voice depends on the browser)
npm test           # parser unit tests
npm run typecheck
npm run lint
```

## Where things are

| Path | What |
| --- | --- |
| `src/lib/library.ts` | Issue names and their spoken variations, trades, zones. Edit this to teach it your wording. |
| `src/lib/parser.ts` | Turns speech into draft defects. Plain TypeScript, no network. |
| `src/lib/parser.test.ts` | Examples of what you can say and what comes out. |
| `src/lib/use-sweep.ts` | Microphone and speech recognition. |
| `src/lib/store.ts` | Rooms and defects saved on the phone. |
| `src/app/index.tsx` | Rooms screen. |
| `src/app/room/[id].tsx` | Voice sweep screen. |

## Roadmap

1. Voice sweep (this version)
2. Photo pass and markup: one photo can cover several defects
3. Floor plans: level PDFs, room outlines, zones per room type, auto-placed pins
4. Reports: PDF and Excel per room, level or trade
5. Close-out: tradie links and re-inspection mode
