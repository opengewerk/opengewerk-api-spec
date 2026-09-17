# Scopes

Ein Scope ist eine einzelne Berechtigung, die der Mandant seiner Kanzlei erteilt. Vergeben werden sie beim Verbindungsaufbau und sind danach jederzeit einzeln änderbar oder widerrufbar. Lesen ist der Default, Schreiben muss der Mandant bewusst freigeben.

Quelle: Planungskonzept OpenGewerk Kanzlei v1.1, Abschnitt 2.5.

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
| `export:audit` | Z1–Z3/GDPdU-Export auslösen | optional |

## Zuordnung zu den Endpunkten

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

Stammdaten nach `read:master` haben in dieser Fassung der Spezifikation noch keinen eigenen Endpunkt. Der Scope ist bereits festgelegt, damit er später nicht nachträglich verlangt werden muss, denn ein zusätzlich verlangter Scope wäre ein Breaking Change.

## Regeln für Implementierer

- Fehlt ein Scope, ist die Antwort HTTP 403 mit dem Namen des fehlenden Scopes im Fehlerobjekt. Nicht HTTP 404, denn die Kanzlei soll den Unterschied zwischen "darf ich nicht" und "gibt es nicht" erkennen.
- Ein Widerruf wirkt sofort, nicht erst beim nächsten Token-Wechsel.
- `write:closing` ist im Mandantensystem an den Berufsträger gebunden, nicht an die Kanzlei als Ganzes.
- Jeder Zugriff wird protokolliert, unabhängig davon, ob er erfolgreich war.
