# JSON-Schemas

Hier werden die Schemas für die Nutzlasten der Kanzlei-API liegen: Journalzeile, Konto, Saldo, offener Posten, Beleg, Periode, Rückfrage, Buchungsvorschlag, Kontenrahmen-Profil, Protokolleintrag.

Seit Version 0.3.0 liegen alle zehn hier, und die OpenAPI-Definition verweist mit relativen Pfaden darauf. Der Platzhalter ist nur noch an einer Stelle übrig: beim Export für die Betriebsprüfung, dessen Nutzlast nicht zu den zehn gehört und noch nicht festgelegt ist.

| Datei | Verwendet in |
| --- | --- |
| `journal-entry.schema.json` | `GET /journal` |
| `account.schema.json` | `GET /accounts` |
| `balance.schema.json` | `GET /balances` |
| `open-item.schema.json` | `GET /open-items` |
| `document.schema.json` | `GET /documents/{id}` |
| `period.schema.json` | `GET /periods` |
| `inquiry.schema.json` | `POST /inquiries`, Anfrage über `#/$defs/New` |
| `booking-proposal.schema.json` | `POST /proposals`, Anfrage über `#/$defs/New` |
| `chart-of-accounts-profile.schema.json` | `PUT /coa-profile`, Anfrage und Antwort |
| `access-log-entry.schema.json` | `GET /access-log` |

Dass jede Datei auch wirklich referenziert wird, prüft die Konformitätssuite unter [`../conformance/`](../conformance/), ebenso die Konventionen aus diesem Dokument: Draft, `$id`, Cent als Ganzzahl und dass nirgends zusätzliche Felder erlaubt sind.

## Warum die Schemas getrennt liegen

Die Nutzlasten werden nicht nur von der HTTP-Schnittstelle gebraucht, sondern auch in den Webhook-Ereignissen und in den Konformitätstests. Ein Schema, das als eigene Datei vorliegt, lässt sich aus allen drei Zusammenhängen heraus referenzieren, ohne dass jemand es kopiert.

## Konventionen für neue Schemas

- Dateiname in kebab-case und auf Englisch, mit der Endung `.schema.json`, zum Beispiel `journal-entry.schema.json`. Aus dem Dateinamen erzeugt ein Client-Generator den Typnamen, deshalb ist er Code und kein Text.
- `$schema` auf den JSON-Schema-Draft setzen, der zu OpenAPI 3.1 passt: `https://json-schema.org/draft/2020-12/schema`.
- `$id` als stabile URL vergeben, damit Verweise zwischen Schemas funktionieren.
- **Namen englisch, Beschreibungen deutsch.** Das gilt für Feldnamen, `title` und die Schlüssel unter `$defs` gleichermaßen. Der Feldname ist Code und landet in jeder Nutzlast und in jedem generierten Typ, die Beschreibung ist Dokumentation und erscheint im Handbuch. Das ist dieselbe Grenze wie im ganzen Projekt, sie läuft hier nur mitten durch eine Datei.
- Wo eine Anfrage weniger Felder trägt als die Antwort, steht die Anfrage als `$defs/Neu` in derselben Datei. Zwei Dateien für dasselbe Ding laufen auseinander.
- Beträge als `integer` in Cent, Datumsangaben als `string` mit `format: date` beziehungsweise `date-time`.
- `additionalProperties: false` überall dort, wo die Gegenseite sich auf einen festen Satz von Feldern verlassen soll.
