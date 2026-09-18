# JSON-Schemas

Hier werden die Schemas für die Nutzlasten der Kanzlei-API liegen: Journalzeile, Konto, Saldo, offener Posten, Beleg, Periode, Rückfrage, Buchungsvorschlag, Kontenrahmen-Profil, Protokolleintrag.

Seit Version 0.3.0 liegen alle zehn hier, und die OpenAPI-Definition verweist mit relativen Pfaden darauf. Der Platzhalter ist nur noch an einer Stelle übrig: beim Export für die Betriebsprüfung, dessen Nutzlast nicht zu den zehn gehört und noch nicht festgelegt ist.

| Datei | Verwendet in |
| --- | --- |
| `journalzeile.schema.json` | `GET /journal` |
| `konto.schema.json` | `GET /accounts` |
| `saldo.schema.json` | `GET /balances` |
| `offener-posten.schema.json` | `GET /open-items` |
| `beleg.schema.json` | `GET /documents/{id}` |
| `periode.schema.json` | `GET /periods` |
| `rueckfrage.schema.json` | `POST /inquiries`, Anfrage über `#/$defs/Neu` |
| `buchungsvorschlag.schema.json` | `POST /proposals`, Anfrage über `#/$defs/Neu` |
| `kontenrahmen-profil.schema.json` | `PUT /coa-profile`, Anfrage und Antwort |
| `protokolleintrag.schema.json` | `GET /access-log` |

Dass jede Datei auch wirklich referenziert wird, prüft die Konformitätssuite unter [`../conformance/`](../conformance/), ebenso die Konventionen aus diesem Dokument: Draft, `$id`, Cent als Ganzzahl und dass nirgends zusätzliche Felder erlaubt sind.

## Warum die Schemas getrennt liegen

Die Nutzlasten werden nicht nur von der HTTP-Schnittstelle gebraucht, sondern auch in den Webhook-Ereignissen und in den Konformitätstests. Ein Schema, das als eigene Datei vorliegt, lässt sich aus allen drei Zusammenhängen heraus referenzieren, ohne dass jemand es kopiert.

## Konventionen für neue Schemas

- Dateiname in kebab-case mit der Endung `.schema.json`, zum Beispiel `journalzeile.schema.json`.
- `$schema` auf den JSON-Schema-Draft setzen, der zu OpenAPI 3.1 passt: `https://json-schema.org/draft/2020-12/schema`.
- `$id` als stabile URL vergeben, damit Verweise zwischen Schemas funktionieren.
- Feldnamen auf Englisch, Beschreibungen auf Deutsch. Der Feldname ist Code und landet in jeder Nutzlast und in jedem generierten Typ, die Beschreibung ist Dokumentation und erscheint im Handbuch. Das ist dieselbe Grenze wie im ganzen Projekt, sie läuft hier nur mitten durch eine Datei.
- Wo eine Anfrage weniger Felder trägt als die Antwort, steht die Anfrage als `$defs/Neu` in derselben Datei. Zwei Dateien für dasselbe Ding laufen auseinander.
- Beträge als `integer` in Cent, Datumsangaben als `string` mit `format: date` beziehungsweise `date-time`.
- `additionalProperties: false` überall dort, wo die Gegenseite sich auf einen festen Satz von Feldern verlassen soll.
