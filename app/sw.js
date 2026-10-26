/* TaxDesk's service worker: keeps the app, the law and Python on the iPad, so TaxDesk opens without the internet.
   tools/build_web.py fills in the build and the files, Python (Pyodide) among them: everything is on this site. */
const CACHE = "taxdesk-1.8.0-e3c9d2c34a";
const FILES = ["./", "app.css", "app.js", "fonts/OFL.txt", "fonts/PatrickHand-Regular.ttf", "forms/ITR-FS-Part-I.jpg", "forms/ITR-FS-Part-II.jpg", "forms/ITR-FS-Part-III.jpg", "forms/ITR-FS-Part-IV.jpg", "forms/ITR-FS-Part-IX.jpg", "forms/ITR-FS-Part-V.jpg", "forms/ITR-FS-Part-VI.jpg", "forms/ITR-FS-Part-VII-A.jpg", "forms/ITR-FS-Part-VII.jpg", "forms/ITR-FS-Part-VIII-A.jpg", "forms/ITR-FS-Part-VIII.jpg", "forms/ITR-FS-Part-X.jpg", "forms/ITR-FS-Part-XI.jpg", "forms/ITR-FS-Part-XII.jpg", "forms/ITR-FS-Part-XIII.jpg", "forms/ITR-FS-Part-XIV.jpg", "forms/ITR-SS-Part-II-ZC.jpg", "forms/ITR-SS-Part-II-ZD.jpg", "forms/ITR-SS-Part-II-ZE.jpg", "forms/ITR-SS-Part-II-ZF.jpg", "forms/ITR-SS-Part-II-ZG.jpg", "forms/ITR-SS-Part-II-ZH.jpg", "forms/ITR-SS-Part-IVA.jpg", "forms/ITR-SS-Part-VIII.jpg", "forms/ITR-SS-Part-X.jpg", "forms/ITR-SS-Part-XA.jpg", "forms/ITR-SS-Part-XI.jpg", "forms/ITR-SS-Part-XII.jpg", "forms/ITR-SS-Part-XIII.jpg", "forms/ITR-SS-Parts-II-to-II-ZA.jpg", "forms/STR-Annex-A.jpg", "forms/STR-Annex-B.jpg", "forms/STR-Annex-C.jpg", "forms/STR-Annex-C1.jpg", "forms/STR-Annex-D.jpg", "forms/STR-Annex-E.jpg", "forms/STR-Annex-E1.jpg", "forms/STR-Annex-F.jpg", "forms/STR-Annex-G.jpg", "forms/STR-Annex-H.jpg", "forms/STR-Annex-H1.jpg", "forms/STR-Annex-I.jpg", "forms/STR-Annex-J.jpg", "forms/STR-Annex-K.jpg", "forms/STR-Annex-P.jpg", "forms/STR-STR-1.jpg", "forms/STR-STR-10.jpg", "forms/STR-STR-11.jpg", "forms/STR-STR-12.jpg", "forms/STR-STR-13.jpg", "forms/STR-STR-14.jpg", "forms/STR-STR-15.jpg", "forms/STR-STR-16.jpg", "forms/STR-STR-17.jpg", "forms/STR-STR-18.jpg", "forms/STR-STR-19.jpg", "forms/STR-STR-20.jpg", "forms/STR-STR-21.jpg", "forms/STR-STR-22.jpg", "forms/STR-STR-23.jpg", "forms/STR-STR-24.jpg", "forms/STR-STR-25.jpg", "forms/STR-STR-26.jpg", "forms/STR-STR-27.jpg", "forms/STR-STR-28.jpg", "forms/STR-STR-29.jpg", "forms/STR-STR-3.jpg", "forms/STR-STR-30.jpg", "forms/STR-STR-32.jpg", "forms/STR-STR-33.jpg", "forms/STR-STR-34.jpg", "forms/STR-STR-35.jpg", "forms/STR-STR-36.jpg", "forms/STR-STR-4.jpg", "forms/STR-STR-5.jpg", "forms/STR-STR-6.jpg", "forms/STR-STR-7.jpg", "forms/STR-STR-7A.jpg", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "index.html", "lib/marked.min.js", "manifest.webmanifest", "py/taxdesk.zip", "pyodide/cffi-1.16.0-cp312-cp312-pyodide_2024_0_wasm32.whl", "pyodide/cryptography-42.0.5-cp312-cp312-pyodide_2024_0_wasm32.whl", "pyodide/openssl-1.1.1n.zip", "pyodide/pycparser-2.22-py3-none-any.whl", "pyodide/pyodide-lock.json", "pyodide/pyodide.asm.js", "pyodide/pyodide.asm.wasm", "pyodide/pyodide.js", "pyodide/python_stdlib.zip", "pyodide/six-1.16.0-py2.py3-none-any.whl"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith("taxdesk-") && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname === "raw.githubusercontent.com") return;  // control.json: always asked fresh (the app keeps the last copy)
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(req, { ignoreSearch: true, ignoreVary: true }).then(res => res || fetch(req)));
  }
});
