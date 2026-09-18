# Konformitätstests

Die Testsuite, mit der eine Implementierung prüft, ob sie den Vertrag wirklich einhält. Sie zerfällt in zwei Teile:

- **`static.test.mjs`** braucht keine laufende Instanz und prüft den Vertrag gegen sich selbst und gegen die Dokumentation. Diese Prüfungen laufen in der CI bei jedem Push.
- **`live.test.mjs`** prüft eine laufende Instanz. Ohne `OPENGEWERK_BASE_URL` und `OPENGEWERK_TOKEN` werden diese Tests übersprungen, damit die CI grün bleibt, solange es keine Implementierung gibt.

```bash
npm install
npm test                 # beides, live wird übersprungen
npm run test:static      # nur die statischen Prüfungen
OPENGEWERK_BASE_URL=https://betrieb.example/api/kanzlei/v1 OPENGEWERK_TOKEN=...   npm run test:live
```

Für die Prüfung auf einen fehlenden Scope braucht es zusätzlich `OPENGEWERK_TOKEN_WITHOUT_SCOPES`, einen Token ohne Leserechte. Ohne ihn wird genau dieser Test übersprungen, die anderen laufen.

**Der Code in diesem Ordner ist englisch**, Bezeichner wie Kommentare, so wie aller Code im Projekt. Deutsch bleibt die Dokumentation daneben.

Zwei Seiten sollen sich testen lassen:

- Die **Mandanten-Instanz** als Server: Sind alle Endpunkte vorhanden, halten sie sich an die Pflichtfelder, liefern sie die richtigen Fehlercodes?
- Der **Kanzlei-Hub** als Client: Verträgt er unbekannte Felder, hält er sich an Paginierung, ETag und Idempotenz-Key, geht er mit einem nicht erreichbaren Mandanten um, ohne die anderen zu blockieren?

## Was der statische Teil heute prüft

- Alle zehn Schemas übersetzen als JSON Schema 2020-12 und tragen `$schema`, `$id`, `title` und `description`
- Kein Schema erlaubt zusätzliche Felder, nirgends steht `type: number`, jedes Feld auf `_cents` ist `integer`
- Jedes Schema wird von der OpenAPI-Datei auch wirklich referenziert, es liegt keine Leiche im Ordner
- Jede Operation verlangt nur Scopes, die im Sicherheitsschema deklariert sind
- Jede Operation beantwortet fehlende Anmeldung mit 401 und, sofern sie einen Scope verlangt, fehlenden Scope mit 403
- Jede schreibende Operation verlangt einen `Idempotency-Key`
- Jede Liste liefert ein `ETag` und beantwortet `If-None-Match` mit 304
- Die Zuordnung Endpunkt zu Scope stimmt mit `docs/scopes.md` überein, in beide Richtungen
- `info.version` und die Version in `package.json` laufen nicht auseinander
- Jede Operation nimmt an der Versionsaushandlung teil: optionaler Anfragekopf, HTTP 409 als Antwort, und jede Erfolgsantwort nennt die bediente Version
- Kein Bezeichner, aus dem ein Generator Code macht, sieht deutsch aus: Schema- und Komponentennamen, Parameter, Tags und operationIds

## Was der Live-Teil prüfen soll

- Vorhandensein und Methode aller in der OpenAPI-Definition beschriebenen Endpunkte
- Pflichtfelder und Datentypen der Antworten gegen die Schemas aus [`../schemas/`](../schemas/)
- Verhalten ohne Token und mit abgelaufenem Token: HTTP 401
- Verhalten bei fehlendem Scope: HTTP 403 mit Angabe des fehlenden Scopes, nicht HTTP 404
- Paginierung und ETag: `If-None-Match` mit unverändertem Stand liefert HTTP 304
- Idempotenz: derselbe `Idempotency-Key` erzeugt keinen zweiten Datensatz
- Beträge als Integer-Cent, Datumsangaben nach ISO 8601
- Zugriffsprotokoll: jeder Aufruf taucht im Protokoll auf, und zwar auf beiden Seiten

## Wie die Suite aufgebaut sein soll

Die Tests laufen gegen eine laufende Instanz, deren Basis-URL und Token von außen übergeben werden. Sie verändern keine festgeschriebenen Daten und legen nur Datensätze an, die sie selbst wieder erkennen können. Ein Durchlauf gibt aus, welche Version der Spezifikation geprüft wurde und welche Prüfungen bestanden sind.

## Was noch nicht geprüft wird

- **Die Nutzlast des Betriebsprüfungs-Exports**, sie ist noch nicht festgelegt.
- **Der Verbindungsaufbau** über den Einladungscode. Er läuft heute außerhalb der Spezifikation, nur die Adresse für die Token-Ausgabe ist reserviert.

Verbindlich ist und bleibt die OpenAPI-Definition unter [`../openapi/opengewerk-kanzlei-api.yaml`](../openapi/opengewerk-kanzlei-api.yaml). Diese Suite prüft, ob eine Implementierung ihr folgt, sie ersetzt sie nicht.
