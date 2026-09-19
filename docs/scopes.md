# Scopes

Ein Scope ist eine einzelne Berechtigung, die der Mandant seiner Kanzlei erteilt. Vergeben werden sie beim Verbindungsaufbau und sind danach jederzeit einzeln änderbar oder widerrufbar. Lesen ist der Default, Schreiben muss der Mandant bewusst freigeben.

Quelle: Planungskonzept OpenGewerk Kanzlei v1.2, Abschnitt 2.5.

| Scope | Inhalt | Default |
| --- | --- | --- |
| `read:ledger` | Journal, Konten, Salden, OP-Listen | ja |
| `read:documents` | Belegbilder, E-Rechnungs-XML | ja |
| `read:master` | Stammdaten Kunden/Lieferanten/Anlagen | ja |
| `read:periods` | Festschreibungsstatus, USt-VA-Werte | ja |
| `write:comments` | Rückfragen und Kommentare an Belegen | ja |
| `write:proposals` | Buchungs-/Kontierungsvorschläge (Mandant bestätigt) | optional |
| `write:coa` | Kontenrahmen-Profil, Automatikkonten pushen | optional |
| `write:closing` | Abschlussbuchungen direkt buchen | optional, nur Berufsträger |
| `export:audit` | Z1-Z3/GDPdU-Export auslösen | optional |

## Zuordnung zu den Endpunkten

Diese Zuordnung steht seit Version 0.2.0 auch in der OpenAPI-Datei selbst: Das Sicherheitsschema `taxFirmToken` ist ein OAuth-2.0-Schema mit dem Flow `clientCredentials`, und jede Operation deklariert den Scope, den sie verlangt. Ein Konformitätstest kann die Zuordnung damit prüfen, statt sie aus dieser Tabelle ablesen zu müssen. Die Tabelle bleibt als lesbare Fassung daneben stehen, sie ist nicht die Quelle.

| Endpunkt | Nötiger Scope |
| --- | --- |
| `GET /journal`, `GET /accounts`, `GET /balances`, `GET /open-items` | `read:ledger` |
| `GET /documents/{id}` | `read:documents` |
| `GET /periods` | `read:periods` |
| `POST /inquiries` | `write:comments` |
| `POST /proposals` | `write:proposals`, für direktes Buchen zusätzlich `write:closing` |
| `PUT /coa-profile` | `write:coa` |
| `POST /audit-export` | `export:audit` |
| `GET /access-log` | kein zusätzlicher Scope |

Zwei Stellen sind in der OpenAPI-Datei bewusst nicht ausdrückbar und stehen nur hier:

- Bei `POST /proposals` verlangt die Datei `write:proposals`. Dass direktes Buchen zusätzlich `write:closing` braucht, hängt vom Inhalt der Anfrage ab und lässt sich in OpenAPI nicht an die Operation binden. Der Server prüft es, der Konformitätstest deckt es als eigenen Fall ab.
- `GET /access-log` verlangt keinen zusätzlichen Scope, in der Datei steht dort eine leere Scope-Liste. Ein gültiger Token genügt.

Stammdaten nach `read:master` haben in dieser Fassung der Spezifikation noch keinen eigenen Endpunkt. Der Scope ist bereits festgelegt, damit er später nicht nachträglich verlangt werden muss, denn ein zusätzlich verlangter Scope wäre ein Breaking Change.

## Regeln für Implementierer

- Fehlt ein Scope, ist die Antwort HTTP 403 mit dem Namen des fehlenden Scopes im Fehlerobjekt. Nicht HTTP 404, denn die Kanzlei soll den Unterschied zwischen "darf ich nicht" und "gibt es nicht" erkennen.
- Ein Widerruf wirkt sofort, nicht erst beim nächsten Token-Wechsel.
- Der Token wird unter der in der OpenAPI-Datei genannten `tokenUrl` ausgegeben und erneuert. Diese Adresse ist reserviert, der Verbindungsaufbau über den Einladungscode ist noch nicht als Endpunkt beschrieben.
- `write:closing` ist im Mandantensystem an den Berufsträger gebunden, nicht an die Kanzlei als Ganzes.
- Jeder Zugriff wird protokolliert, unabhängig davon, ob er erfolgreich war.
