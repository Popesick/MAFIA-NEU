/* ============================================================
   MAFIA – Chicago 1925  ·  Spieldaten
   Alle Werte stammen aus dem Original (C64, Igelsoft 1986).
   ============================================================ */

// Waffen: [Name, Preis, Treffsicherheit, Wirkung, Sound, Symbol]
const WEAPONS = [
  { name: 'Fäuste',        price: 0,     prec: 2, dmg: 2,  snd: 1,  icon: '🥊' },
  { name: 'Messer',        price: 50,    prec: 3, dmg: 5,  snd: 0,  icon: '🔪' },
  { name: 'Knüppel',       price: 100,   prec: 4, dmg: 3,  snd: 1,  icon: '🏏' },
  { name: 'Kette',         price: 500,   prec: 4, dmg: 4,  snd: 4,  icon: '⛓️' },
  { name: 'Wurfstern',     price: 3000,  prec: 2, dmg: 7,  snd: 0,  icon: '✴️' },
  { name: 'Revolver',      price: 4000,  prec: 5, dmg: 10, snd: 2,  icon: '🔫' },
  { name: 'Schrotflinte',  price: 4500,  prec: 5, dmg: 12, snd: 2,  icon: '🔫' },
  { name: 'Maschinenpistole', price: 8000, prec: 6, dmg: 15, snd: 10, icon: '🔫' },
  { name: 'Handgranaten',  price: 10000, prec: 7, dmg: 18, snd: 3,  icon: '💣' },
];
const PRECISION_LABEL = ['', 'schwach', 'brauchbar', 'todsicher'];             // Original: POOR / AGREEABLE / DEAD SURE
const EFFECT_LABEL = ['', 'lächerlich', 'mäßig', 'tödlich', 'brutal', 'mörderisch']; // RIDICULOUS ... TERRIFYING

const RANKS = ['', 'Anfänger', 'Rowdy', 'Kleinganove', 'Taschendieb', 'Halunke', 'Mafioso',
  'Staatsfeind', 'Auftragskiller', 'Mafia-Don', 'König der Unterwelt'];

// Fahrzeuge: Bewegungspunkte pro Monat (TR) und Fassungsvermögen für Alkohol (TK)
const VEHICLES = [
  { name: 'Zu Fuß',          cap: 50,  speed: 25, icon: '🚶' },
  { name: 'Talbot 90',       cap: 100, speed: 35, icon: '🚗' },
  { name: 'Chevy Roadster',  cap: 120, speed: 40, icon: '🚙' },
  { name: 'Buick Century',   cap: 200, speed: 40, icon: '🚘' },
  { name: 'Auburn Mod. 120', cap: 150, speed: 60, icon: '🏎️' },
  { name: 'Citroën T.A.',    cap: 100, speed: 35, icon: '🚕' },
];

const ITEM_DOCS = 1, ITEM_FAKE = 2;
const ITEM_NAMES = { 1: 'Ausweis', 2: 'Falschgeld' };

// Gebäudetypen (Reihenfolge = LA im Original)
const BUILDINGS = {
  1:  { key: 'motel',    name: 'Unterschlupf',           icon: '🏨', hue: 28,  tint: '#8a5a2b',
        title: 'Unterschlupf (schäbiges Motel / Mietshaus)',
        greet: '„Ah, ein Kunde! Was kann ich für Sie tun?“',
        opts: ['„Eine Wohnung – aber dalli, Junge! Und keinen Ärger, klar?“', '„Ich möchte meine Miete zahlen!“', 'Ausruhen (alle Gangster erholen sich)', '„Das geht Sie nichts an!“'] },
  2:  { key: 'pub',      name: 'Kneipe',                 icon: '🍺', hue: 38,  tint: '#8b5e1a',
        title: 'Kneipe / Bar (eine zwielichtige Spelunke)',
        greet: '„Eh, Amigo – willste Milch, oder darf’s was anderes sein?“',
        opts: ['„Milch? Hast du keinen guten alten Schnaps?“', '„Ich suche Jungs für meine Bande. Mal sehen, wer hier so rumhängt …“',
               '„Hast du Insider-Infos über einen lohnenden Coup?“', '„Ich brauche einen Job, dringend. Einen Auftrag – du weißt, was ich meine?“',
               '„Scheint der falsche Laden zu sein. Ich bin weg …“'] },
  3:  { key: 'waffen',   name: 'Waffenladen',            icon: '🔫', hue: 0,   tint: '#7a2b2b',
        title: 'Waffenladen',
        greet: '„Howdy, Mister. Brauchen Sie ein paar Schießeisen? Hinten hab ich welche.“',
        opts: ['„Ja, zeig mir, was du hast.“', '„Kannst du meinen Jungs das Schießen beibringen? Die sind echt lausig!“', '„Nein danke, vielleicht später. Tschüss!“'] },
  4:  { key: 'auto',     name: 'Autohändler',            icon: '🚗', hue: 205, tint: '#2b5a7a',
        title: 'Autohändler',
        greet: 'Die heißesten Wagen, die man für Geld kaufen kann.',
        opts: ['Auto kaufen', 'Auto klauen', 'Verlassen'] },
  5:  { key: 'kredit',   name: 'Kredithai',              icon: '💰', hue: 48,  tint: '#7a6a1f',
        title: 'Kredithai',
        greet: '„Guten Tag, der Herr. Wie kann ich Ihnen helfen?“',
        opts: ['„Ich brauche Bargeld!“', '„Ich will nur meine Schulden zahlen und hier raus!“', 'Kreditgeschäft kaufen oder verkaufen',
               'Einlage ändern (nur für den Besitzer)', 'Überfällige Schulden eintreiben (nur für den Besitzer)', '„Ich komme schon klar.“'] },
  6:  { key: 'spiel',    name: 'Spielhölle',             icon: '🎰', hue: 300, tint: '#6a2b6a',
        title: 'Spielhölle',
        greet: '„Hey Freund, wie wär’s mit einem Spielchen? Karten? Roulette? Na los …“',
        opts: ['„Okay, Kumpel, was empfiehlst du mir?“', '„Nein, nein! Ich spiele nur Mensch-ärgere-dich-nicht!“'] },
  7:  { key: 'laden',    name: 'Gemischtwarenladen',     icon: '🏪', hue: 130, tint: '#2b6a3a',
        title: 'Gemischtwarenladen (verlockend für Schutzgelderpressung!)',
        greet: '„Hallo, der Herr. Was kann ich für Sie tun?“',
        opts: ['„Rück die Kohle raus, schnell – sonst benutze ich das hier!“', '„Bitte! Gib mir etwas Kleingeld für meine arme alte Mutter. Sie ist sehr krank!“',
               '„Für eine kleine Spende beschützen wir Sie vor den bösen Gangstern!“', '„Polizei! In Ihrer Kasse ist Falschgeld. Ich muss es beschlagnahmen!“', 'Heute nicht kassieren.'] },
  8:  { key: 'ubahn',    name: 'U-Bahn',                 icon: '🚇', hue: 175, tint: '#1f6a66',
        title: 'U-Bahn-Station',
        greet: 'Du betrittst einen großen Metro-Bahnhof. Menschenmassen wuseln durch die Tunnel …',
        opts: ['Den wartenden Leuten die Taschen leeren', 'In der U-Bahn Handtaschen klauen', 'Zurück ans Tageslicht'] },
  9:  { key: 'bahnhof',  name: 'Hauptbahnhof',           icon: '🚉', hue: 215, tint: '#2b3f7a',
        title: 'Hauptbahnhof',
        greet: 'Du bist am Chicagoer Hauptbahnhof.',
        opts: ['Bahnhofskneipe betreten', 'Taschendiebstahl', 'Postzug überfallen', 'Bahnhof verlassen'] },
  10: { key: 'bank',     name: 'Bank',                   icon: '🏦', hue: 150, tint: '#2b6a4f',
        title: 'Bank / Post',
        greet: '„Guten Tag, der Herr! Zu Ihren Diensten …“',
        opts: ['„Schluss mit dem Gequatsche und her mit der Kohle, ich hab nicht ewig Zeit!“',
               'Die Gegend auskundschaften, die Alarmanlage ausspähen und nachts wiederkommen', 'Verlassen'] },
  11: { key: 'polizei',  name: 'Polizeipräsidium',       icon: '🚔', hue: 225, tint: '#2b2b7a',
        title: 'Chicagoer Polizeipräsidium',
        greet: '„Was wollen Sie hier, Abschaum? Machen Sie, dass Sie rauskommen!“',
        opts: ['„Ich bin ein gesuchter Verbrecher. Bitte verhaften Sie mich.“', 'Kommissar bestechen',
               'Versuchen, einen der inhaftierten Gangster zu befreien', 'Lieber abhauen'] },
  12: { key: 'faelscher', name: 'Billie der Fälscher',   icon: '🪪', hue: 90,  tint: '#4f6a1f',
        title: 'Billie der Fälscher',
        greet: '„Hey, Kumpel! Was gibt’s? Kann ich was für dich tun?“',
        opts: ['„Ja, kannst du mir einen neuen Ausweis machen? Der muss gut sein, verstehst du?“',
               '„Immer noch Blüten drucken? Wie wär’s, wenn du mir welche verkaufst?“', '„Nein danke, Billie. Vielleicht ein andermal. Bis dann!“'] },
  13: { key: 'transport', name: 'Geldtransporter',       icon: '🚚', hue: 210, tint: '#2b4f7a', title: 'Überfall auf den Geldtransporter', greet: '', opts: [] },
  14: { key: 'buergermeister', name: 'Bürgermeister',    icon: '🎩', hue: 0,   tint: '#5a2b2b', title: 'Der Bürgermeister', greet: '', opts: [] },
};

// Sonderfelder der Stadtkarte
const CELL_TRANSPORT = 569;  // Geldtransporter (Tipp 3)
const CELL_MAYOR = 861;      // Bürgermeister (Tipp 5)
const CELL_START = 18;       // Startposition
const CELL_JAIL_EXIT = 911;  // Hinterausgang des Präsidiums

// Gangster, die man in Kneipen anheuern kann (Original: GAN1–GAN30)
const GANGSTERS = [
  null,
  { id: 1,  name: 'Billy Blade',        weapon: 1, pow: 50, int: 10, brut: 70, price: 2000, desc: 'Ein finster dreinblickender Kerl in zerlumpten Kleidern.' },
  { id: 2,  name: 'Berny the Brain',    weapon: 0, pow: 20, int: 90, brut: 30, price: 1000, desc: 'Ein schlaksiger Typ mit ratlosem Gesichtsausdruck.' },
  { id: 3,  name: 'Gary the Gambler',   weapon: 0, pow: 30, int: 60, brut: 40, price: 1500, desc: 'Ein Kartenhai mit flinken Fingern.' },
  { id: 4,  name: 'Bloody Mary',        weapon: 2, pow: 60, int: 10, brut: 75, price: 2100, desc: 'Eine harte, furchteinflößende Frau mit Killerblick.', lady: true },
  { id: 5,  name: 'Shuriken Shao',      weapon: 4, pow: 40, int: 10, brut: 60, price: 2700, desc: 'Trat früher mit seiner Wurfstern-Show in einem chinesischen Zirkus auf.' },
  { id: 6,  name: 'Caky K',             weapon: 2, pow: 80, int: 5,  brut: 80, price: 2500, desc: 'Ein bulliger Kerl mit Schweinsäuglein.' },
  { id: 7,  name: 'Blind Bill',         weapon: 0, pow: 5,  int: 90, brut: 90, price: 1500, desc: 'Ein seltsamer Alter mit dunkler Brille, der um Geld bettelt.' },
  { id: 8,  name: 'Mr Pink',            weapon: 0, pow: 10, int: 60, brut: 5,  price: 1600, desc: 'Ein ehrgeiziger Jungspund mit sehr hellen Augen.' },
  { id: 9,  name: 'Pizza P',            weapon: 1, pow: 50, int: 5,  brut: 5,  price: 2400, desc: 'Ein widerlicher Kerl mit sehr schlechter Haut.' },
  { id: 10, name: 'El Marichi',         weapon: 2, pow: 80, int: 50, brut: 90, price: 2700, desc: 'Ein Sonderling, der seine Augen unter einem gewaltigen Sombrero versteckt.' },
  { id: 11, name: 'Trev the Trickster', weapon: 0, pow: 5,  int: 90, brut: 75, price: 2300, desc: 'Ein glatter Typ, Teilzeit-Kartenhai und versierter Safeknacker.' },
  { id: 12, name: 'Johnny',             weapon: 1, pow: 50, int: 30, brut: 30, price: 2100, desc: 'Ein Typ im schwarzen Anzug. Niemand in der Kneipe kennt ihn.' },
  { id: 13, name: 'Shaun Shiv',         weapon: 1, pow: 40, int: 10, brut: 30, price: 1800, desc: 'Ein untersetzter Bursche mit dem Gesichtsausdruck eines Schafs.' },
  { id: 14, name: 'Glenda',             weapon: 3, pow: 40, int: 10, brut: 30, price: 2200, desc: 'Eine gewaltige Dame, die man „Feuerteufel“ nennt – aber nur hinter ihrem Rücken.', lady: true },
  { id: 15, name: 'The Stabber',        weapon: 1, pow: 30, int: 5,  brut: 70, price: 2500, desc: 'Ein übler Kerl mit schwarzem Hut.' },
  { id: 16, name: 'Jimmy',              weapon: 0, pow: 20, int: 10, brut: 30, price: 1200, desc: 'Ein unerfahrener kleiner Möchtegern-Gauner.' },
  { id: 17, name: 'Fingers Phillip',    weapon: 0, pow: 30, int: 50, brut: 60, price: 2000, desc: 'Ein geübter Taschendieb und mäßiger Kämpfer.' },
  { id: 18, name: 'Lord Gaga',          weapon: 0, pow: 40, int: 60, brut: 90, price: 2300, desc: 'Ein Allrounder mit Pokerface.' },
  { id: 19, name: 'Peg Leg Pete',       weapon: 3, pow: 60, int: 5,  brut: 70, price: 2400, desc: 'Ein hinkender Opa, der dauernd ein Auge zukneift.' },
  { id: 20, name: 'Mr X',               weapon: 0, pow: 30, int: 10, brut: 60, price: 2500, desc: 'Seine Fähigkeiten sind ein Rätsel – niemand kennt ihn.' },
  { id: 21, name: 'Aces Andy',          weapon: 0, pow: 5,  int: 80, brut: 65, price: 2300, desc: 'Das Kasino ist sein zweites Zuhause, aber er hat noch weitere interessante Talente.' },
  { id: 22, name: 'Revolver Ralph',     weapon: 5, pow: 40, int: 5,  brut: 60, price: 3100, desc: 'Nicht der Hellste, aber seine Treffsicherheit ist berüchtigt.' },
  { id: 23, name: 'Jeff Smart',         weapon: 2, pow: 40, int: 10, brut: 80, price: 2300, desc: 'Ein Kerl, der aussieht, als wäre er gerade einem Comic entsprungen.' },
  { id: 24, name: 'Fred Clever',        weapon: 0, pow: 10, int: 85, brut: 50, price: 2300, desc: 'Ein selbstloser, netter Kerl mit chamäleonartigen Tarnmethoden.' },
  { id: 25, name: 'Tom',                weapon: 0, pow: 70, int: 5,  brut: 5,  price: 1900, desc: 'Ein ehemaliger Bauer, der sein ganzes Land an die Bank verloren hat.' },
  { id: 26, name: 'Hardhat Mack',       weapon: 1, pow: 35, int: 40, brut: 60, price: 2500, desc: 'Ein geheimnisvoller Bursche …' },
  { id: 27, name: 'Dorothy',            weapon: 1, pow: 30, int: 60, brut: 30, price: 2100, desc: 'Eine sehr große Frau mit verschlagenem Gesicht.', lady: true },
  { id: 28, name: 'Sam the Priest',     weapon: 0, pow: 55, int: 60, brut: 10, price: 2300, desc: 'Ein beleibter Geistlicher von gutmütiger Natur.' },
  { id: 29, name: 'Mister Y',           weapon: 5, pow: 30, int: 45, brut: 60, price: 3000, desc: 'Ein Gentleman in Schwarz …' },
  { id: 30, name: 'Ma Baker',           weapon: 7, pow: 20, int: 80, brut: 95, price: 4500, desc: 'Alias Sunny Clark – wegen ihrer Skrupellosigkeit in sieben Staaten gefürchtet.', lady: true },
];

// Wo welche Arena benutzt wird (Original: KS, KB, KM, KP, KG, KGTP, KPZUG, KSGL)
const ARENA_LABEL = {
  strasse: 'Straße', bank: 'Bank', gasse: 'Dunkle Gasse', kneipe: 'Kneipe', knast: 'Gefängnis',
  transport: 'Geldtransporter', zug: 'Postzug', laden: 'Gemischtwarenladen', verkehr: 'Kreuzung',
};

// Karten-Kacheln
const TILE_STYLE = {
  '.': { fill: '#2a2a2e' },                       // Straße
  p: { fill: '#24402a', pat: 'park' },            // Park
  w: { fill: '#1d3550', pat: 'water' },           // Wasser
  h: { fill: '#4a3222', pat: 'roof' },            // Häuser (braun)
  b: { fill: '#4b2b2b', pat: 'roof' },            // Backstein
  d: { fill: '#2c2c33', pat: 'roof' },            // Lagerhäuser
  c: { fill: '#3a3a3f', pat: 'roof' },            // Beton
  x: { fill: '#33302b', pat: 'roof' },
};
