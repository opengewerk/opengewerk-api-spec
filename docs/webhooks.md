# Webhooks

Die Mandanten-Instanz meldet Ereignisse aktiv an den angebundenen Kanzlei-Hub, damit dieser seine Übersicht nicht dauernd neu abfragen muss. Die Richtung ist immer Mandant an Hub.

Quelle: Feature-Gliederung Handwerkersoftware v2.3, Abschnitt 4.13.

## Ereignisse

| Ereignis | Wann es ausgelöst wird |
| --- | --- |
| Neuer Beleg | Ein Beleg ist im Mandantensystem angelegt worden |
| Beleg geändert | Ein bestehender Beleg wurde geändert, storniert oder korrigiert |
| Rückfrage beantwortet | Der Mandant hat eine Rückfrage der Kanzlei beantwortet |
| Vorschlag entschieden | Der Mandant hat einen Buchungsvorschlag übernommen oder abgelehnt |
| Periode festgeschrieben | Eine Buchungsperiode wurde festgeschrieben |
| Bankumsatz ohne Beleg | Ein Bankumsatz konnte keinem Beleg zugeordnet werden |

Das letzte Ereignis ist der Auslöser für die Fehlende-Belege-Liste im Hub: Ein Bankumsatz ohne Beleg wird dort automatisch als Rückfrage vorgeschlagen.

"Vorschlag entschieden" schließt den Kreis zu `GET /proposals`. Ohne das Ereignis bliebe dem Hub nur, die Liste in Abständen abzufragen, und bei einem Vorschlag, über den tagelang niemand entscheidet, wäre jede Abfrage bis dahin umsonst.

## Zustellung

- **Signierte Payloads.** Jede Auslieferung trägt eine Signatur über den Rohkörper, gebildet mit einem beim Handshake vereinbarten Geheimnis. Der Hub prüft die Signatur, bevor er die Nutzlast auswertet, und verwirft alles, was nicht passt.
- **Retry mit Backoff.** Antwortet der Hub nicht mit einem Erfolgscode, wird die Zustellung mit wachsendem Abstand wiederholt. Nach Erschöpfung der Versuche gilt das Ereignis als unzustellbar und bleibt im Zustellprotokoll stehen.
- **Zustellprotokoll.** Das Mandantensystem protokolliert jede Zustellung mit Zeitpunkt, Antwortcode und Anzahl der Versuche. Der Mandant sieht dieses Protokoll in seiner Oberfläche.

## Hinweise für Implementierer

- Ein Webhook trägt keine Belegdaten, sondern eine Kennung und den Ereignistyp. Die Daten holt sich der Hub anschließend über die API, damit auch für diesen Weg die Scopes gelten.
- Der Hub muss mit doppelten Zustellungen umgehen können. Eine Wiederholung nach einer fehlgeschlagenen Antwort ist der Normalfall, kein Fehler.
- Ereignisse können in einer anderen Reihenfolge ankommen, als sie entstanden sind. Maßgeblich ist der Zeitstempel im Ereignis, nicht der Eingang.
- Ist die Verbindung getrennt oder der Scope widerrufen, werden keine Ereignisse mehr zugestellt, auch keine aufgestauten.
