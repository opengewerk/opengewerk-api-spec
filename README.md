<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/opengewerk/.github/main/brand/opengewerk-logo-dark.svg">
    <img alt="OpenGewerk" src="https://raw.githubusercontent.com/opengewerk/.github/main/brand/opengewerk-logo.svg" width="320">
  </picture>
</p>

<p align="center"><strong>Gemeinsamer API-Vertrag zwischen OpenGewerk und OpenGewerk Kanzlei</strong></p>

## Zweck

Die Handwerkersoftware [`opengewerk`](https://github.com/opengewerk/opengewerk) und der Kanzlei-Hub [`opengewerk-kanzlei`](https://github.com/opengewerk/opengewerk-kanzlei) sind eigenständige Projekte mit eigenen Releases. Damit sie sich nicht gegenseitig brechen, liegt der Schnittstellenvertrag in diesem dritten Repository: OpenAPI-Definition, JSON-Schemas und Konformitätstests an einer Stelle, versioniert nach SemVer. Beide Seiten deklarieren, welche Version der Spezifikation sie unterstützen, und können unabhängig voneinander veröffentlichen.

Der Hub ruft die Endpunkte beim Mandanten ab, nicht umgekehrt. Die Handwerkersoftware ist damit der Server dieser Spezifikation, der Hub ist der Client. Welche Ressourcen ein Hub sehen darf, entscheidet allein der Mandant über Scopes.

## Aufbau des Repos

| Pfad | Inhalt |
| --- | --- |
| `openapi/opengewerk-kanzlei-api.yaml` | Die OpenAPI-3.1-Definition der Kanzlei-API |
| `schemas/` | JSON-Schemas der zehn Nutzlasten, auf die die OpenAPI-Datei verweist |
| `conformance/` | Konformitätstests, mit denen eine Implementierung sich selbst prüfen kann |
| `docs/scopes.md` | Die Scopes, die ein Mandant an eine Kanzlei vergeben kann |
| `docs/webhooks.md` | Die Ereignisse, die das Mandantensystem an den Hub meldet |

## Versionierung

Die Spezifikation folgt der [Semantischen Versionierung](https://semver.org/lang/de/). Die aktuelle Version steht im `info.version`-Feld der OpenAPI-Datei.

Ein **Breaking Change** und damit eine neue Hauptversion ist:

- Ein Endpunkt oder eine Operation fällt weg oder wird umbenannt.
- Ein bisher optionales Feld einer Anfrage wird zur Pflicht.
- Ein Feld einer Antwort fällt weg oder ändert seinen Datentyp.
- Die Bedeutung eines vorhandenen Feldes ändert sich, auch wenn Name und Typ gleich bleiben.
- Ein zusätzlicher Scope wird für einen bestehenden Endpunkt verlangt.

Rückwärtskompatibel und damit eine Nebenversion ist das Hinzufügen neuer Endpunkte, neuer optionaler Felder oder neuer Enum-Werte, sofern Clients unbekannte Werte tolerieren. Reine Textkorrekturen an Beschreibungen sind eine Patch-Version.

Solange die Hauptversion 0 ist, kann sich der Vertrag noch in jeder Nebenversion ändern. Stabil wird er mit 1.0.0.

## Konformitätstests

Der Ordner `conformance/` enthält die Testsuite, mit der eine Implementierung gegen die Spezifikation geprüft wird. Der statische Teil hält den Vertrag mit sich selbst und mit `docs/scopes.md` zusammen und läuft in der CI bei jedem Push. Der Live-Teil prüft eine laufende Instanz: vorhandene Endpunkte, Pflichtfelder gegen die Schemas, Fehlercodes, Verhalten bei fehlendem Scope, ETag, Idempotenz und Versionsaushandlung. Solange niemand eine Instanz betreibt, läuft er gegen die mitgelieferte Attrappe. Einzelheiten in [`conformance/README.md`](conformance/README.md).

Verbindlich bleibt die OpenAPI-Datei. Die Suite prüft, ob eine Implementierung ihr folgt, sie ersetzt sie nicht.

## Verwendung

1. Die Spezifikation auf eine feste Version binden, entweder über einen Git-Tag oder als Submodul.
2. Aus `openapi/opengewerk-kanzlei-api.yaml` Server-Gerüst beziehungsweise Client generieren oder von Hand implementieren.
3. Die unterstützte Spec-Version im eigenen System sichtbar machen, damit die Gegenseite die Kompatibilität prüfen kann.
4. Vor jedem Release die eigene Implementierung gegen die Spezifikation prüfen.

Die Datei lässt sich lokal validieren, mit der Fassung von redocly, die in `package.json` festgelegt ist:

```bash
npm ci
npm run lint:openapi
```

Derselbe Aufruf läuft in der CI dieses Repositories bei jedem Push und jedem Pull Request. Ein `npx @redocly/cli@latest` holte dagegen jedes Mal die neueste Fassung und könnte eines Tages etwas melden, das niemand verursacht hat.

## Konventionen

- Alle Beträge sind Integer in Cent, nie Gleitkommazahlen.
- Alle Datums- und Zeitangaben folgen ISO 8601, ein Zeitpunkt steht immer in UTC.
- Steuerschlüssel folgen der DATEV-Konvention, damit der spätere Export verlustfrei bleibt.
- Listen sind paginiert, unterstützen ETag und `If-None-Match` für effizienten Sync.
- Schreibende Aufrufe verlangen einen Idempotenz-Key.
- Jede Antwort nennt im Kopf `X-OpenGewerk-Api-Version` die Version, die die Instanz bedient. Passt die Hauptversion des Hubs nicht dazu, antwortet sie mit HTTP 409 statt mit Daten, die er nicht lesen könnte.

Verbindlich sind die Konventionen unter `x-conventions` in der OpenAPI-Datei, diese Liste ist ihre Kurzfassung.

## Mitmachen

- Fragen und Vorschläge zum Vertrag gehören in die [Discussions](https://github.com/opengewerk/opengewerk-api-spec/discussions).
- Konkrete Fehler und Wünsche laufen über die [Issue-Vorlagen](https://github.com/opengewerk/opengewerk-api-spec/issues/new/choose).
- Die Beitragsregeln stehen in [CONTRIBUTING.md](https://github.com/opengewerk/.github/blob/main/CONTRIBUTING.md), der Verhaltenskodex in [CODE_OF_CONDUCT.md](https://github.com/opengewerk/.github/blob/main/CODE_OF_CONDUCT.md).

## Lizenz

[Apache License 2.0](LICENSE). Bewusst permissiv: auch ein proprietäres System darf diesen Vertrag implementieren, denn ein Schnittstellenstandard nützt nur, wenn ihn alle umsetzen dürfen.
