# WorkSync - Légy szinkronban a munkáddal és kollégáiddal!

Ez a webalkalmazás a csapaton belüli információáramlás és együttműködés egyszerűsítésére készült. Segítségével a kollégák gyorsan és átláthatóan kommunikálhatnak egymással, megoszthatják a szükséges információkat, és szinkronizálhatják a munkafolyamatokat.

**Fejlesztés alatt**

Az alkalmazás folyamatos fejlesztés alatt áll, ezért előfordulhat, hogy egyes funkciók még nem teljesen kiforrottak vagy átmenetileg nem működnek megfelelően. A visszajelzéseket szívesen fogadom a további fejlesztésekhez.

Elérhetőség: **balogh.norbert1599@gmail.com**

**Teszt felhasználó**

    - E-mail cím: test@bnorbi1599.com
    - Jelszó: justTester

A teszt felhasználó jelszavát heti gyakorisággal módosítom, így ha nem tudsz belépni azt a fenti e-mail címemen jelezd és elküldöm az új belépési adatokat.

**Felhasználói jogosultságok**

Az alkalmazásban két jogosultsági szint érhető el:

- **Fejlesztő (Developer):** Átlagfelhasználói jogosultságokkal rendelkezik.
- **Adminisztrátor (Administrator):** Kiterjesztett jogosultságokkal rendelkezik, beleértve az alábbiakat:
  - Az összes fejlesztő szabadságkérelmének megtekintése, elfogadása vagy elutasítása.
  - A felhasználók kezelése: új felhasználók hozzáadása, meglévők jogosultságainak módosítása vagy visszavonása.
  - A fejlesztők napi munkamenetének követése: láthatja, hogy egy felhasználó mikor kezdte el és fejezte be a munkát, valamint a nap végi jelentéseit.

**Fő funkciók**

- **Naptár és elérhetőségek**

  - Google naptár és Google feladatok szinkronizáció
  - Megbeszélések, elérhetőségek, szabadságok megtekintése
  - Azonnali információk mely felhasználók nem elérhetőek egy adott idő intervallumban, vagy kik vannak szabadságon éppen
  - **Esemény létrehozása**:
    - Házon kívűl: a felhasználó jelezheti, hogy egy adott időintervallumon belül nincs gépnél, nem elérhető
    - Szabadság kérelem: Új szabadság kérelem indítása megadott időszakra
    - Google esemény: át navigálja a felhasználót a google naptárába, ahol gond mentesen a megszokott módon tud új eseményt indítani
  - **Gyors információs kártyák**
    - Közelgő esemény(ek): a közelgő google naptár eseményekre való figyelem felhívás (maximum 3 látható), a "Naptárhoz" feliratra kattintva az oldal leteker a naptár aktuális napjához.
    - Értesítések: új branch-ek kerültek publikálásra, egyébb cégen belüli információ átadás, szabadság kérelmek státuszai (elfogadták, elutasították), csevegő szoba történések (hozzáadak, eltávolitottak)
    - Mai napon: a felhasználó jelzi, hogy elkezdte munkáját, majd pedig nap végén jelzi annak befejezését a nap végi jelentés leadásával, melyet az Adminisztrátor láthat és nyomon követhet.
    - Publikálásra vár: azok a branch-ek amelyket a felhasználók szeretnének, hogy publikálásra kerüljenek

- **Publikációkezelés**

  - A felhasználók jelezhetik, hogy mely githubon lévő repository-ból, mely branch-eket szükséges azt a teszt rendszerbe publikálni.
  - A publikálásra váró repository kártyához komment is fűzzhető, melyben plusz információkat adhatunk át a többi felhasználó számára (vagy aki felel a publikálásért), adatbázis frissités stb...
  - A publikálva gombra kattintva egy felugró ablakban lehetősége van a felhasználónak megjelölni, mely hozzáadott branch-eket szeretné ő publikáltra állítani, amik ez után átkerülnek az Aktív publikálások kártyába
  - Emellet lehetőség van a felhasználónak még a hozzáadott branch-ek eltávolítására

- **Csevegés**

  - A felhasználóknak lehetőségük van személyes üzenetváltásra
  - Új csevegő szoba létrehozására, ahol a szoba létrehozója hozzáadhatja, hogy mely felhasználókkal szeretne csevegni
  - Meglévő csevegő szoba szerkesztése, új felhasználó hozzáadása vagy eltávolítása a szobából. (A csevegő szobát csak a tulajdonosa szerkeszteni, ami átruházható)

- **Szabadságkezelés**

  - Szabadságkérelmek jelzése, szerkesztése, törlése.
  - Adminisztrátor az átlag felhasználók szabadségkérelmét elfogadhatja vagy elutasíthatja

- **Értesítések**

  - Rendszer értesítések különböző műveletekből: csevegő szoba történések, publikációk, szabadság kérelmek
  - Felhasználói értesítések, melyet bárki felvehet, hogy információt osszon meg a többi felhasználóval

- **API projektek**

  - Fejlesztés alatt

- **Felhasználók**
  - Adminisztrátori nézetben elérhető, fejlesztés alatt

**Adatkezelés és biztonság**

Az adatok mentésére és tárolására Firebase-t használok. A Google API szinkronizációval kapcsolatban kizárólag a Google refresh token kerül tárolásra, mely törölhető a fiók beállításoknál, más személyes adatokat vagy Google Naptárból érkező eseményeket, feladatokat nem tárolok.

# A program használatához szükséges programok

A program futtatáshoz szükséges telepíteni:

- **Node.js ^18.19.1 || ^20.11.1 || ^22.0.0 verziója**
- **Angular CLI 18.2.14-as verziója**

A telepített programok után a projekt fő könyvtárában telepíteni kell az alkalmazáshoz szükséges csomagokat: **npm install**
