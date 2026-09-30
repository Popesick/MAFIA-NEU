# MAFIA – Chicago 1925

Ein Remake des C64-Klassikers **MAFIA** (Igelsoft, 1986) als Browser-Spiel – ohne Build-Schritt, reines HTML/CSS/JavaScript.

Alle Grafiken (Orte, Ereignisse, Gangster- und Boss-Porträts, Waffen, Fahrzeuge) sind moderne Neuinterpretationen der C64-Bilder, erzeugt mit ChatGPT in einem einheitlichen Filmnoir-Stil (Chicago 1925). Die Prompts stehen in [BILDER-PROMPTS.md](BILDER-PROMPTS.md).

## Starten

Online über GitHub Pages oder lokal:

```bash
python3 -m http.server 8000
```

und dann <http://localhost:8000> öffnen.

## Spielhölle

Die Spielhölle enthält drei echte Minispiele mit dem Geld des Spielers (im Trainer-Modus unendlich):

- **Poker** – Five-Card-Draw gegen zwei Gangster: Einsatz, Karten tauschen (bis 3, mit Ass 4), eine Bieterunde (schieben/erhöhen/passen), Showdown mit voller Handbewertung. Das Haus behält 5 % vom Topf.
- **Black Jack** – 4 Decks, Dealer steht bei 17, Black Jack zahlt 3 : 2, Verdoppeln und einmaliges Teilen.
- **Roulette** – europäisch mit einer Null, Rad-Animation, volles Tableau: Zahlen (35 : 1), Dutzende und Reihen (2 : 1), Rot/Schwarz, Gerade/Ungerade, 1–18/19–36 (1 : 1).

Karten, Jetons und Rad werden im Spiel gezeichnet. Die optionalen Tischbilder (`casino-poker`, `casino-blackjack`, `casino-roulette`, `casino-kartenruecken`) zeigen einstweilen Platzhalter; ihre Prompts stehen in [BILDER-PROMPTS.md](BILDER-PROMPTS.md).

## Bilder

Die Bilder liegen in `assets/img/<slot>.webp`. Eigene Bilder lassen sich im Spiel über „Bilder verwalten“ hochladen und haben Vorrang vor den mitgelieferten Dateien.
