# PROJEKTISUUNNITELMA

## Aihe

**Sävelspot – musiikkivisa.** Pelaaja tunnistaa kappaleen lyhyestä tekstivihjeestä ja valitsee vastauksen kolmesta vaihtoehdosta. Lisävihje helpottaa arvaamista ja pienentää oikeasta vastauksesta saatavaa pistemäärää.

## Kesto

Ma 16.11. – to 26.11.2026. Katselmointi to 26.11.2026.

| Päivä | Työvaihe |
| --- | --- |
| 16.11. | Aihe, pelisäännöt, kysymysten tietorakenne ja Git |
| 17.–19.11. | Pelinäkymä, esimerkkikysymykset, vihjeet ja pistelasku |
| 20.11. ja 23.11. | Kysymyseditori ja JSON Serverin REST-pyynnöt |
| 24.–25.11. | Responsiivisuus, käyttöohje ja valmistautuminen katselmointiin |
| 26.11. | Katselmointi |

## Työpari ja työnjako

**Tekijä 1** [oma nimi]. Toteuttaa pelinäkymän, pistelaskun ja tulokset.

**Tekijä 2** [työparin nimi]. Toteuttaa kysymyseditorin ja JSON Serverin tallennuksen.

Molemmat tekevät esimerkkikysymyksiä ja katselmoivat toistensa osuudet. Molemmat harjoittelevat koko sovelluksen esittelyn.

## Tavoitteet

- Tehdä lyhyt musiikkipeli, jonka voi aloittaa heti selaimessa.
- Toteuttaa kolme näkymää, jotka toimivat myös puhelimella.
- Lisätä, lukea, muokata ja poistaa kysymyksiä REST API:n kautta.

## Fokus

Yksi pelimuoto ja enintään viisi kysymystä kierroksella. Kysymyseditorin muutokset tulevat mukaan seuraavaan peliin.

## Rajaukset

Peli käyttää tekstivihjeitä ja valmiita vastausvaihtoehtoja. Projektiin kuuluvat peli, kysymyseditori ja kierroksen tulokset. Kysymykset tallennetaan paikalliseen JSON Serveriin.

## Työkalut

Visual Studio Code, Git ja GitHub, HTML, CSS, JavaScript ja JSON Server. Node.js ja npm käynnistävät valmiin JSON Serverin.

## Riskit ja niiden eliminointi

| Riski | Toimi |
| --- | --- |
| Oman ohjelmointiosaamisen yliarvioiminen | Tehdään pelisilmukka ensin. Käytetään kurssin työkaluja ja pyydetään apua ajoissa. |
| Tietokoneen hajoaminen | Tallennetaan työ päivittäin Gitillä ja pusketaan commitit GitHubiin. |
| Sairastuminen | Kirjataan eteneminen README-tiedostoon ja sovitaan varapäivä. |
| Parityön vähäinen viestintä ja sooloilu | Sovitaan tapaamiset, yhtenäinen ulkoasu ja Gitin työnkulku. Jaetaan työ tasaisesti ja katselmoidaan molempien muutokset. |
| Epäselvä vihje tai useampi oikea vastaus | Luetaan kysymykset yhdessä läpi ja varmistetaan, että jokaisessa on yksi yksiselitteinen vastaus. |
| JSON Server ei käynnisty katselmoinnissa | Käynnistetään peli README-ohjeella ennen esitystä ja tarkistetaan, että portti 3000 on vapaa. |
