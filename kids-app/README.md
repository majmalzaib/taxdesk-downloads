# Little Stars ⭐ — Learn, Play & Sing

A colorful learning app for little kids, about ages 2 to 6. The same code runs on **Android, iPhone/iPad, tablets,
Windows, Mac and Chromebooks**. You can install it as a web app (PWA), or package it with Capacitor as a native
Android or iOS app. Everything is spoken aloud, so kids don't need to read.

## What's inside

| Activity | Learn mode | Play mode |
|---|---|---|
| 🔤 **ABC** | Tap a letter to see a big flash card: "A is for Apple" | Find the letter · Which letter does 🍎 start with? |
| 🔢 **123** | Tap a number: objects pop in while it counts out loud, with rising notes | How many? (tap to count) · Find the number |
| 🎨 **Colors** | Paint blobs: "Red, like a strawberry" | Pop the right balloon 🎈 |
| 🔺 **Shapes** | 8 shapes, each with a simple fact | Find the shape |
| 🦁 **Animals** | 15 animals and the sounds they make | Who says "moo"? · Find the animal |
| 🎹 **Music** | Rainbow xylophone (Do Re Mi), 3 instruments, and drum, clap, bell and boing pads | 5 nursery songs: ▶ listen, or 👆 play along by tapping the glowing keys |
| 🃏 **Memory** | — | Match the pairs: easy (6 cards) or big (12 cards) |
| 🦄 **Stickers** | Every 5 ⭐ unlocks a new sticker (20 to collect) | — |

It also has:
- A cheerful original background tune (switch it with 🎵)
- Voice on/off (🗣️)
- Confetti and fanfares, and a friendly star mascot
- Progress saved on the device

All sounds and music are generated in code (Web Audio), so the app is small and **works offline**. There are no ads,
no accounts and no tracking, and the app sends nothing over the internet.

## Run it

The app is plain HTML, CSS and JavaScript in `www/`, with no build step.

```bash
cd kids-app
npm run serve          # then open http://localhost:8080
```

### Install on a phone (PWA, quickest)
Host `www/` on any HTTPS site, such as GitHub Pages. Open it on the phone, then:
- **Android (Chrome):** menu ⋮ → *Add to Home screen* or *Install app*
- **iPhone/iPad (Safari):** Share → *Add to Home Screen*

It then opens full screen like a normal app and works without internet.

### Build native apps (Google Play / App Store)
You need Node 20 or later, plus Android Studio for Android or Xcode on a Mac for iOS.

```bash
cd kids-app
npm install
npm run android:init   # once
npm run android        # opens Android Studio → Run / Build APK or AAB
npm run ios:init       # once (Mac only)
npm run ios            # opens Xcode → Run / Archive
```

Android's WebView has no built-in speech, so native builds use the `@capacitor-community/text-to-speech` plugin for
the voice. Before publishing, change the app id (`com.littlestars.kids`) in `capacitor.config.json`.

## Notes
- On iPhone, the ring/silent switch mutes web audio. Turn silent mode off to hear the music.
- How good the voice sounds depends on the text-to-speech voices installed on the device.
- The songs are traditional public-domain nursery tunes. The background music is original.

## Files
```
www/index.html      page shell, top bar, splash
www/style.css       all styling and animations
www/app.js          screens, activities, rewards, voice
www/audio.js        synthesised instruments, sound effects, background music
www/sw.js           offline cache
www/manifest.webmanifest, www/icons/   install metadata and icons
capacitor.config.json, package.json    native packaging
```
