# Konformitätstests

Hier wird die Testsuite liegen, mit der eine Implementierung prüft, ob sie den Vertrag wirklich einhält. Bislang ist der Ordner leer bis auf diese Beschreibung.

Zwei Seiten sollen sich testen lassen:

- Die **Mandanten-Instanz** als Server: Sind alle Endpunkte vorhanden, halten sie sich an die Pflichtfelder, liefern sie die richtigen Fehlercodes?
- Der **Kanzlei-Hub** als Client: Verträgt er unbekannte Felder, hält er sich an Paginierung, ETag und Idempotenz-Key, geht er mit einem nicht erreichbaren Mandanten um, ohne die anderen zu blockieren?

## Was die Suite prüfen soll

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

Bis es so weit ist, ist die OpenAPI-Definition unter [`../openapi/opengewerk-kanzlei-api.yaml`](../openapi/opengewerk-kanzlei-api.yaml) die einzige verbindliche Quelle.
