# Änderungsprotokoll

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei festgehalten.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionsnummern folgen der [Semantischen Versionierung](https://semver.org/lang/de/).

## [Unreleased]

### Hinzugefügt

- Initiales Repository-Gerüst
- CI-Job "Schreibweise", der Gedankenstriche im gesamten Repository meldet

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
