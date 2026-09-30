# MAFIA – Chicago 1925

Ein Remake des C64-Klassikers **MAFIA** (Igelsoft, 1986) als Browser-Spiel – ohne Build-Schritt, reines HTML/CSS/JavaScript.

Alle Grafiken (Orte, Ereignisse, Gangster- und Boss-Porträts, Waffen, Fahrzeuge) sind moderne Neuinterpretationen der C64-Bilder, erzeugt mit ChatGPT in einem einheitlichen Filmnoir-Stil (Chicago 1925). Die Prompts stehen in [BILDER-PROMPTS.md](BILDER-PROMPTS.md).

## Starten

Online über GitHub Pages oder lokal:

```bash
python3 -m http.server 8000
```

und dann <http://localhost:8000> öffnen.

## Bilder

Die Bilder liegen in `assets/img/<slot>.webp`. Eigene Bilder lassen sich im Spiel über „Bilder verwalten“ hochladen und haben Vorrang vor den mitgelieferten Dateien.
