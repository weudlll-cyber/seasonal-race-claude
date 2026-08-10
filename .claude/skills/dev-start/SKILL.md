---
name: dev-start
description: Sauberer RaceArena Dev-Start für Funktions-/Augenproben (node+vite, KEIN Docker). Killt alle node-Prozesse, startet EIN Backend (Port 4000, mit festem Dev-Session-Secret + RA_CLIENT_ORIGIN) und EINEN Vite-Client (5173, strictPort), verifiziert Single-Instance. Windows/Git-Bash. Performance wird NICHT hier beurteilt — dafür kommt ein separates Docker-Performance-Skill.
---

# RaceArena — Clean Dev-Start (Funktionscheck, node+vite)

Zweck: reproduzierbarer, sauberer Start für Owner-Augenproben. Kein Docker nötig —
der Streckenhintergrund kommt vom Backend selbst (/api/tracks/:id/background).
Performance immer am Production/Docker-Build beurteilen (separates Skill).

## 0) Vorbedingung
Repo-Wurzel: c:/Users/weudl/OneDrive/Dokumente/Seasonal race claude

## 1) ALLE node-Prozesse killen (PowerShell — taskkill hier unzuverlässig)
powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"
powershell -Command "Get-NetTCPConnection -LocalPort 4000,5173 -State Listen -ErrorAction SilentlyContinue"   # soll leer sein
# Hinweis: trifft nur Windows-node (Vite + direktes node). Ein evtl. laufender Docker-Container ist NICHT betroffen.

## 2) Backend starten (Hintergrund) — Port 4000, mit Dev-Secret + Origin
cd "c:/Users/weudl/OneDrive/Dokumente/Seasonal race claude/server"
RA_SESSION_SECRET=dev-secret-not-for-production RA_CLIENT_ORIGIN=http://localhost:5173,http://localhost:4173 npm start
# RA_SESSION_SECRET (fest, NUR Dev): Sessions überleben Backend-Neustarts → kein ständiges Neu-Einloggen.
#   Das ist KEIN echtes Secret und gehört NICHT in Produktion. Prod setzt einen echten, zufälligen Wert via Umgebung.
# RA_CLIENT_ORIGIN: allows the clients to write cross-origin (otherwise CSRF-403). BOTH ports are
#   listed and both are needed: 5173 is the dev server, 4173 is the PRODUCTION build the owner judges
#   on (VERIFY-RULES.md R10). The list is comma-separated and `corsOptions` is built ONCE at module
#   load, so adding a port means RESTARTING the API — there is no way to add one to a running server.
#   Leaving 4173 out looks exactly like a dead backend: the browser gets no Access-Control-Allow-Origin,
#   the fetch fails as a network error, and the app says "Server not reachable. Check that the backend
#   is running" while the backend is running perfectly. That happened on 2026-08-10.
# Watch-Variante (Auto-Reload bei Codeänderung): ... npm run dev  (statt npm start)
# Erwartete Log-Zeile:  RaceArena server running on port 4000
#   (Die Warnung "ephemeral dev session secret" darf jetzt NICHT mehr erscheinen — wenn doch, wurde das Secret nicht gesetzt.)

## 3) Client starten (Hintergrund) — Port 5173, strictPort
cd "c:/Users/weudl/OneDrive/Dokumente/Seasonal race claude/client"
npm run dev -- --port 5173 --strictPort
# Erwartete Log-Zeile:  Local:   http://localhost:5173/
# Falls Port 5174 auftaucht → strictPort hat NICHT gegriffen → Schritt 1 (killen), neu.

## 4) Healthcheck (genau EINE Instanz je Port)
powershell -Command "Get-NetTCPConnection -LocalPort 4000 -State Listen"
powershell -Command "Get-NetTCPConnection -LocalPort 5173 -State Listen"
powershell -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort 4000 -State Listen).OwningProcess | Select-Object Name"  # MUSS 'node' sein
powershell -Command "Get-Process node | Select-Object Id, CPU"   # genau 2 node-Prozesse erwartet (Backend + Vite)

## 5) Login (Dev-Testkonto)
# http://localhost:5173 → einloggen. Username: testoperator | Passwort: lokal gesetzt
# (Owner kennt aktuellen Wert; users.json ist .gitignored, rein lokal). Admin: Weudl (nur Owner).
# Mit festem RA_SESSION_SECRET bleibt die Session über Backend-Neustarts erhalten.

## 6) Wenn Tracks "No track drawn yet" / leer wirken
# Ursache fast immer: nicht (mehr) eingeloggt → /api/tracks liefert 401 → leerer Cache.
# Lösung: frisch einloggen, Seite neu laden. (Mit festem Secret tritt das selten auf.)

## 7) Sauber stoppen
powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"
# Prüfen: Get-NetTCPConnection -LocalPort 4000,5173 -State Listen → leer.

## REGELN
- Ein Backend, ein Client. Niemals mehrere Vite-Instanzen (verfälscht Augenproben).
- NUR Funktions-/Augenproben. Performance immer am Prod/Docker-Build (separates Skill).
- Die Augenprobe macht der OWNER. CC startet nur den Server, wenn beauftragt —
  kein unbeauftragtes UI-Klicken / Smoke-Testen / Hand-Editieren von data/-Dateien.
