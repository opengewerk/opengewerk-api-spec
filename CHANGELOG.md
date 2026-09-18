# Änderungsprotokoll

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei festgehalten.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionsnummern folgen der [Semantischen Versionierung](https://semver.org/lang/de/).

## [Unreleased]

### Hinzugefügt

- Initiales Repository-Gerüst
- CI-Job "Schreibweise", der Gedankenstriche im gesamten Repository meldet

## [0.2.0]

### Geändert

- Sicherheitsschema von HTTP-Bearer auf OAuth 2.0 mit dem Flow `clientCredentials`
  umgestellt. Ein HTTP-Bearer-Schema kann in OpenAPI keine Scopes tragen, deshalb
  standen die neun Scopes bisher nur im Fließtext und waren nicht prüfbar. Jetzt
  deklariert jede der elf Operationen den Scope, den sie verlangt.
- Beschreibung des Tokens an ADR 0006 angeglichen: Die erste Fassung arbeitet mit
  rotierenden Token ohne kryptografische Bindung an die Hub-Instanz. Vorher stand
  dort, der Token sei per DPoP oder mTLS gebunden, was für v1 nicht zutrifft.
