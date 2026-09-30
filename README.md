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

Karten, Jetons und Rad werden im Spiel gezeichnet. Die Tischbilder `casino-poker`, `casino-blackjack` und `casino-roulette` liegen bei; `casino-kartenruecken` (Kartenrückseite) fehlt noch und wird bis dahin als Muster gezeichnet. Die Prompts stehen in [BILDER-PROMPTS.md](BILDER-PROMPTS.md).

## Training beim Waffenhändler

Beim Waffenhändler (Schießtraining und Trainingslager) gibt es neben „Automatisch trainieren“ (voller Erfolg) die Option **„Selber trainieren“** als Minispiel. Der Erfolg wird anteilig (0–100 %) nach Treffern berechnet:

- **Schießstand** – 30 Pappkameraden huschen immer schneller von links nach rechts über einen Schießstand. Fadenkreuz mit der Maus, alle 6 Schuss Nachladen mit kurzer Pause.
- **Trainingslager** – Der Spieler sitzt mit den Lebenspunkten des Gangsters hinter einer Deckung vor einem Haus; in den Fenstern tauchen 30 Gangster auf und schießen nach 2–4 s. Wer schießt, verlässt die Deckung und ist verwundbar (Mündungsfeuer mit Sound, Nachladen nach 6 Schuss in 2 s). Ein Treffer kostet 2–5 Lebenspunkte; bei 0 ist das Spiel vorbei.

Die Figuren `train-target-1..3` sind lokal aus den Gangster-Sprites `train-enemy-1..3` abgeleitet (Pappaufsteller-Look), nicht separat generiert.

## Bilder

Die Bilder liegen in `assets/img/<slot>.webp`. Eigene Bilder lassen sich im Spiel über „Bilder verwalten“ hochladen und haben Vorrang vor den mitgelieferten Dateien.
