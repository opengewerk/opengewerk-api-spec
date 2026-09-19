# Änderungsprotokoll

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei festgehalten.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionsnummern folgen der [Semantischen Versionierung](https://semver.org/lang/de/).

## [Unreleased]

### Hinzugefügt

- Initiales Repository-Gerüst
- CI-Job "Schreibweise", der Gedankenstriche im gesamten Repository meldet
- Attrappe `conformance/fixture-instance.mjs`, die den Vertrag beantwortet, dazu die
  Skripte `npm run test:fixture` und `npm run fixture`. Damit läuft der Live-Teil der
  Konformitätstests in der CI gegen etwas, statt übersprungen zu werden. Alles, was sich
  aus dem Vertrag ableiten lässt, leitet die Attrappe daraus ab, und jede Nutzlast wird
  vor dem Ausliefern gegen ihr Schema geprüft

### Geändert

- Die Workflow-Dateien folgen der Regel "Code ist immer Englisch": Job-Kennungen,
  Variablen und Kommentare in den eingebetteten Skripten sind englisch. Deutsch bleibt,
  was ein Mensch liest, also die Job- und Schrittnamen in der Actions-Oberfläche und die
  Meldungen, die eine Prüfung ausgibt
- CodeQL ermittelt die zu prüfenden Sprachen aus dem Dateibestand, statt sie in einer
  Liste zu führen. In den anderen drei Repositories stand dort nur `actions`, mit einer
  Notiz, sie beim ersten Code zu ergänzen; hier steht dieselbe Datei, damit es überall
  dieselbe ist
- Alle Abhängigkeiten auf die neuestmögliche Version: `js-yaml` von 4 auf 5, dadurch
  `import { load } from 'js-yaml'` statt der weggefallenen Standardausfuhr. Node in der
  CI von 22 auf 24, passend zur lokalen Entwicklung
- Die CI prüft die OpenAPI-Datei mit der im Projekt festgelegten redocly-Version statt
  mit `npx @redocly/cli@latest`. Eine Prüfung, deren Werkzeug sich ohne Commit ändern
  kann, meldet irgendwann etwas, das niemand verursacht hat

### Behoben

- Zwei Fehler im Live-Teil, die erst der Lauf gegen die Attrappe gezeigt hat. Die
  Pflichtparameter `from`, `to` und `as_of` wurden nie gesetzt, weil die Suite noch nach
  den deutschen Parameternamen von vor 0.4.0 suchte; sie liest die Namen jetzt aus dem
  Vertrag. Und die Prüfung "Aufruf ohne Token" schickte den Token trotzdem mit, weil ein
  Vorgabewert beim Destrukturieren auch bei `undefined` greift

### Sicherheit

- CodeQL als erweiterte Einrichtung, geprüft werden die Workflow-Dateien und der
  JavaScript-Anteil unter `conformance/`, wöchentlich und bei jedem Push auf `main`
- `@redocly/cli` von 1.x auf 2.x angehoben. Die 1.x zog über `respect-core` das Paket
  `@faker-js/faker` in Version 7.6.0 herein, für das GitHub eine Meldung mit
  Schweregrad hoch führt (CVE-2026-73231, Codeausführung über `helpers.fake`). Die 2.x
  hat überhaupt keine Abhängigkeiten mehr, damit fällt der ganze Teilbaum weg und die
  Sperre ist nicht umgangen, sondern gegenstandslos

## [0.6.0]

### Hinzugefügt

- Jede der sechs Listen sagt, wie sie ordnet: Perioden nach Beginn, Journalzeilen nach
  Buchungsdatum, Konten und Salden nach Kontonummer, offene Posten nach Fälligkeit, das
  Zugriffsprotokoll nach Zeitpunkt absteigend, jeweils mit `id` als Tiebreaker, wo zwei
  Zeilen gleich liegen können. Ohne Zusage kann ein Cursor über zwei Seiten eine Zeile
  doppeln oder auslassen, und eine Konformitätssuite darf nicht prüfen, was der Vertrag
  nicht zusichert
- Der ETag-Kopf sagt, worauf er sich bezieht: auf genau diese Seite, also auf die
  Kombination aus Endpunkt, Filtern, Cursor und Limit, nicht auf die Liste als Ganzes
- `Idempotency-Key` legt die beiden offenen Fälle fest. Derselbe Schlüssel mit einem
  abweichenden Körper wird mit HTTP 422 abgelehnt statt stillschweigend mit der ersten
  Antwort beschieden, sonst hielte der Hub etwas für gespeichert, was nie ankam. Und ein
  Schlüssel bleibt mindestens 24 Stunden gebunden
- `POST /audit-export` führt 422 wie die drei anderen schreibenden Operationen. Ohne das
  sagte der Kopf etwas zu, was diese eine Operation nicht deklarierte
- Alle neun Zeitstempel tragen ein Muster, das UTC erzwingt. `format: date-time` allein
  lässt jeden Offset durch, während `x-konventionen.datumsangaben` UTC vorschreibt: zwei
  Seiten wären sich um Stunden uneins gewesen, wann ein Beleg ausgestellt wurde. Eine
  statische Prüfung hält das fest
- Eine statische Prüfung, die den in `docs/scopes.md` genannten Namen des
  Sicherheitsschemas gegen den Vertrag hält

### Geändert

- Die Versionsaushandlung liest sich unterhalb von 1.0.0 über die Nebenversion. Die
  Hauptversion ist bis dahin immer 0, ein Vergleich der Null allein war also keiner,
  während sich der Vertrag laut README in jeder Nebenversion ändern darf und das in
  0.4.0 auch getan hat. Attrappe und Live-Test ziehen mit
- `docs/scopes.md` nennt das Sicherheitsschema `taxFirmToken`. Es heißt seit 0.4.0 so,
  im Vertrag an allen vierzehn Stellen; im Dokument stand weiter der alte Name

## [0.5.0]

### Hinzugefügt

- Jede der elf Operationen beschreibt jetzt, womit sie eine nicht auswertbare Anfrage
  beantwortet: HTTP 400 mit dem `Error`-Objekt. Der Vertrag kannte Pflichtparameter,
  sagte aber an keiner Stelle, was eine Instanz tut, wenn einer fehlt. Weder 400 noch 422
  standen dort, also hätte sich jede Implementierung etwas anderes ausgedacht und die
  Konformitätstests hätten es nicht prüfen können
- Das Fehlerobjekt trägt das optionale Feld `parameter`, das den beanstandeten Parameter
  benennt, so wie `scope` den fehlenden Scope benennt

## [0.4.0]

### Hinzugefügt

- Versionsaushandlung: Jede Antwort nennt im Kopf `X-OpenGewerk-Api-Version` die
  Vertragsversion der Instanz, jede Anfrage darf denselben Kopf mitschicken, und eine
  unverträgliche Hauptversion wird mit HTTP 409 beantwortet statt mit einer Nutzlast,
  die die Gegenseite nicht lesen kann. Die Konzepte verlangen diese Deklaration seit
  jeher, der Vertrag schwieg dazu

### Geändert

- Alle Bezeichner, aus denen ein Generator Code macht, sind jetzt englisch: die zehn
  Schema-Dateien (`journalzeile` wird zu `journal-entry` und so weiter) samt `$id`,
  `title` und den Schlüsseln unter `$defs`, die elf operationIds (`journalLesen` wird zu
  `readJournal`), die Komponentennamen (`Fehler` wird zu `Error`, `ScopeFehlt` zu
  `ScopeMissing`), das Sicherheitsschema (`kanzleiToken` wird zu `taxFirmToken`), die
  Parameter und die Tags. Beschreibungen, Zusammenfassungen und die Dokumentation
  daneben bleiben deutsch
- Im Fehlerobjekt heißt `meldung` jetzt `message`

## [0.3.0]

### Hinzugefügt

- Die zehn Nutzlast-Schemas unter `schemas/`: Journalzeile, Konto, Saldo, offener
  Posten, Beleg, Periode, Rückfrage, Buchungsvorschlag, Kontenrahmen-Profil und
  Protokolleintrag. Feldnamen englisch, Beschreibungen deutsch, Beträge als
  ganzzahlige Cent, nirgends zusätzliche Felder erlaubt
- Konformitätstests unter `conformance/`, getrennt in einen statischen Teil, der in
  der CI läuft, und einen Live-Teil, der eine Instanz braucht und ohne Basis-URL
  übersprungen wird
- CI-Job "Konformitätstests", der die statischen Prüfungen bei jedem Push ausführt
- Abfrageparameter, ohne die eine Liste oder ein Zeitraum nicht abrufbar wäre:
  `cursor` und `limit` für Listen, `from` und `to` für das Journal, `as_of` für die
  Salden, `year` für die Perioden
- Anfragekörper für die drei schreibenden Operationen und der Kopf `Idempotency-Key`,
  den die Konventionen schon vorher verlangt haben
- Antworten 304, 404 und 422 dort, wo sie auftreten können, dazu der ETag-Kopf an
  allen Listen

### Geändert

- Die Antworten verweisen auf die Schemas statt auf den Platzhalter. Übrig ist der
  Platzhalter nur noch beim Export für die Betriebsprüfung, dessen Nutzlast nicht zu
  den zehn Schemas gehört

## [0.2.0]

### Geändert

- Sicherheitsschema von HTTP-Bearer auf OAuth 2.0 mit dem Flow `clientCredentials`
  umgestellt. Ein HTTP-Bearer-Schema kann in OpenAPI keine Scopes tragen, deshalb
  standen die neun Scopes bisher nur im Fließtext und waren nicht prüfbar. Jetzt
  deklariert jede der elf Operationen den Scope, den sie verlangt.
- Beschreibung des Tokens an ADR 0006 angeglichen: Die erste Fassung arbeitet mit
  rotierenden Token ohne kryptografische Bindung an die Hub-Instanz. Vorher stand
  dort, der Token sei per DPoP oder mTLS gebunden, was für v1 nicht zutrifft.
