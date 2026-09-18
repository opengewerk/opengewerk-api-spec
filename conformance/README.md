# Konformitätstests

Die Testsuite, mit der eine Implementierung prüft, ob sie den Vertrag wirklich einhält. Sie besteht aus zwei Prüfteilen und einer Attrappe, gegen die der Live-Teil laufen kann:

- **`static.test.mjs`** braucht keine laufende Instanz und prüft den Vertrag gegen sich selbst und gegen die Dokumentation. Diese Prüfungen laufen in der CI bei jedem Push.
- **`live.test.mjs`** prüft eine laufende Instanz. Ohne `OPENGEWERK_BASE_URL` und `OPENGEWERK_TOKEN` werden diese Tests übersprungen, damit die CI grün bleibt, solange es keine Implementierung gibt.
- **`fixture-instance.mjs`** ist eine Steh-Instanz, die den Vertrag beantwortet. Sie gibt dem Live-Teil etwas, gegen das er laufen kann, solange niemand eine echte Instanz betreibt. In der CI läuft der Live-Teil gegen diese Attrappe.

```bash
npm install
npm test                 # beides, live wird übersprungen
npm run test:static      # nur die statischen Prüfungen
npm run test:fixture     # der Live-Teil gegen die mitgelieferte Attrappe
OPENGEWERK_BASE_URL=https://betrieb.example/api/kanzlei/v1 OPENGEWERK_TOKEN=...   npm run test:live
```

Für die Prüfung auf einen fehlenden Scope braucht es zusätzlich `OPENGEWERK_TOKEN_WITHOUT_SCOPES`, einen Token ohne Leserechte. Ohne ihn wird genau dieser Test übersprungen, die anderen laufen.

## Die Attrappe

`fixture-instance.mjs` beantwortet den Vertrag, damit der Live-Teil geprüft werden kann,
bevor es eine Implementierung gibt. Alles, was sich aus dem Vertrag ableiten lässt, leitet
sie daraus ab: welche Endpunkte es gibt, welche Scopes sie verlangen, welche Parameter
Pflicht sind und wie die Versionsaushandlung antwortet. Fest steht nur die Nutzlast, und
jede Nutzlast wird vor dem Ausliefern gegen ihr Schema geprüft. Passt sie nicht, antwortet
die Attrappe mit einem Fehler statt mit Daten; damit kann sie nicht unbemerkt von
`../schemas/` abdriften.

Ein Token trägt seine Scopes im Token selbst, etwa `fixture.read:ledger,write:comments`.
So kann ein Aufrufer sich jede Rechtekombination geben, ohne dass es einen Token-Endpunkt
gibt; der Verbindungsaufbau ist im Vertrag bewusst offen. Einzeln starten lässt sich die
Attrappe mit `npm run fixture`, sie druckt dann die drei Umgebungsvariablen, mit denen der
Live-Teil gegen sie läuft.

**Das ist eine Testattrappe, keine Referenzimplementierung.** Sie speichert nichts, sie
rechnet nichts, und sie setzt keine fachliche Regel durch. Wer eine Instanz baut, prüft sie
mit `npm run test:live` gegen das echte System.

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

## Was der Live-Teil heute prüft

- Jeder GET-Endpunkt des Vertrags ist vorhanden, antwortet also weder mit 404 noch mit 5xx
- Ein Aufruf ohne Token wird mit HTTP 401 beantwortet
- Ein fehlender Scope wird mit HTTP 403 beantwortet und benennt den fehlenden Scope, nicht mit 404
- Jede Liste hält die Schemas aus [`../schemas/`](../schemas/) ein, Pflichtfelder und Datentypen inbegriffen
- ETag: `If-None-Match` mit unverändertem Stand liefert HTTP 304
- Idempotenz: derselbe `Idempotency-Key` erzeugt keinen zweiten Datensatz
- Zugriffsprotokoll: jeder Aufruf taucht im Protokoll der eigenen Kanzlei auf
- Die Instanz nennt im Kopf `X-OpenGewerk-Api-Version` die bediente Version, und deren Hauptversion passt zum Vertrag
- Eine unverträgliche Hauptversion wird mit HTTP 409 beantwortet

Noch offen im Live-Teil: Paginierung über mehrere Seiten, das Zugriffsprotokoll auf der
Hub-Seite und der Hub als Client, also sein Verhalten bei unbekannten Feldern und bei einem
nicht erreichbaren Mandanten.

## Wie die Suite aufgebaut sein soll

Die Tests laufen gegen eine laufende Instanz, deren Basis-URL und Token von außen übergeben werden. Sie verändern keine festgeschriebenen Daten und legen nur Datensätze an, die sie selbst wieder erkennen können. Ein Durchlauf gibt aus, welche Version der Spezifikation geprüft wurde und welche Prüfungen bestanden sind.

## Was noch nicht geprüft wird

- **Die Nutzlast des Betriebsprüfungs-Exports**, sie ist noch nicht festgelegt.
- **Der Verbindungsaufbau** über den Einladungscode. Er läuft heute außerhalb der Spezifikation, nur die Adresse für die Token-Ausgabe ist reserviert.
- **Die Antwort auf eine fehlerhafte Anfrage.** Der Vertrag kennt Pflichtparameter, sagt aber an keiner Operation, womit eine Instanz antwortet, wenn einer fehlt: weder 400 noch 422 sind dort beschrieben. Die Attrappe antwortet mit HTTP 400 und einem `Error`-Objekt. Solange der Vertrag dazu schweigt, kann die Suite das nicht prüfen.

Verbindlich ist und bleibt die OpenAPI-Definition unter [`../openapi/opengewerk-kanzlei-api.yaml`](../openapi/opengewerk-kanzlei-api.yaml). Diese Suite prüft, ob eine Implementierung ihr folgt, sie ersetzt sie nicht.
