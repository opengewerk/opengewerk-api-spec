# JSON-Schemas

Hier werden die Schemas für die Nutzlasten der Kanzlei-API liegen: Journalzeile, Konto, Saldo, offener Posten, Beleg, Periode, Rückfrage, Buchungsvorschlag, Kontenrahmen-Profil, Protokolleintrag.

Bislang ist der Ordner leer. Die OpenAPI-Definition unter [`../openapi/opengewerk-kanzlei-api.yaml`](../openapi/opengewerk-kanzlei-api.yaml) verweist an den betroffenen Stellen auf das Schema `Platzhalter`. Sobald ein Schema hier vorliegt, wird der Platzhalter dort durch den Verweis auf die Datei ersetzt.

## Warum die Schemas getrennt liegen

Die Nutzlasten werden nicht nur von der HTTP-Schnittstelle gebraucht, sondern auch in den Webhook-Ereignissen und in den Konformitätstests. Ein Schema, das als eigene Datei vorliegt, lässt sich aus allen drei Zusammenhängen heraus referenzieren, ohne dass jemand es kopiert.

## Konventionen für neue Schemas

- Dateiname in kebab-case mit der Endung `.schema.json`, zum Beispiel `journalzeile.schema.json`.
- `$schema` auf den JSON-Schema-Draft setzen, der zu OpenAPI 3.1 passt: `https://json-schema.org/draft/2020-12/schema`.
- `$id` als stabile URL vergeben, damit Verweise zwischen Schemas funktionieren.
- Feldnamen auf Englisch, Beschreibungen auf Deutsch. Das hält die Nutzlast sprachneutral und die Dokumentation lesbar.
- Beträge als `integer` in Cent, Datumsangaben als `string` mit `format: date` beziehungsweise `date-time`.
- `additionalProperties: false` überall dort, wo die Gegenseite sich auf einen festen Satz von Feldern verlassen soll.
