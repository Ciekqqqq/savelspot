# PROJEKTISUUNNITELMA

## Aihe

**Sävelspot – musiikkivisa.** Pelaaja kuuntelee kappaleen alun ja kirjoittaa sen nimen. Väärä arvaus tai ohitus pidentää kuunneltavaa pätkää. Vaihtoehtoisena lähteenä pelissä voi yhdistää laajan, eri tyylilajeja sisältävän Jamendo-indiekatalogin.

## Kesto

Ma 16.11. – to 26.11.2026. Katselmointi to 26.11.2026.

| Päivä | Työvaihe |
| --- | --- |
| 16.11. | Aihe, pelisäännöt, kappaleiden tietorakenne ja Git |
| 17.–19.11. | Pelinäkymä, äänen toisto ja arvausten käsittely |
| 20.11. ja 23.11. | Kappale-editori ja JSON Serverin REST-pyynnöt |
| 24.–25.11. | Responsiivisuus, käyttöohje ja valmistautuminen katselmointiin |
| 26.11. | Katselmointi |

## Työpari ja työnjako

**Tekijä 1** [oma nimi]. Toteuttaa pelinäkymän, äänen toiston ja tulokset.

**Tekijä 2** [työparin nimi]. Toteuttaa kappale-editorin ja JSON Serverin tallennuksen.

Molemmat valitsevat esimerkkikappaleita ja katselmoivat toistensa osuudet. Molemmat harjoittelevat koko sovelluksen esittelyn.

## Tavoitteet

- Tehdä lyhyt musiikkipeli, jonka voi aloittaa heti selaimessa.
- Toteuttaa kolme näkymää, jotka toimivat myös puhelimella.
- Lisätä, lukea, muokata ja poistaa kappaleita REST API:n kautta.

## Fokus

Yksi pelimuoto. Kuunnellaan alku, arvataan kappale ja tarvittaessa avataan pidempi pätkä. Songspot toimii pelin rakenteen esikuvana. Oma ulkoasu, viisi pätkän pituutta sekä tyylilaji-, aikakausi- ja vaikeustasovalinnat.

## Rajaukset

Projektiin kuuluvat peli, kappale-editori ja tulokset. Mukana tulee kuusi lisensoitua esimerkkikappaletta. Laajempi musiikkikirjasto haetaan Jamendon API:sta erissä; se vaatii henkilökohtaisen Client ID:n, toimii ilman kaupallista hyötyä ja näyttää kappaleen tekijän, sivun ja lisenssin vastauksen yhteydessä. Kappaletiedot tallennetaan paikalliseen JSON Serveriin tai staattisella sivulla selaimeen. Omat tulokset ja asetukset säilyvät selaimessa. Vaikeustasot määritetään itse editorissa.

## Työkalut

Visual Studio Code, Git ja GitHub, HTML, CSS, JavaScript, JSON Server ja Jamendo API. Node.js ja npm käynnistävät valmiin JSON Serverin.

## Riskit ja niiden eliminointi

| Riski | Toimi |
| --- | --- |
| Oman ohjelmointiosaamisen yliarvioiminen | Tehdään pelisilmukka ensin. Käytetään kurssin työkaluja ja pyydetään apua ajoissa. |
| Tietokoneen hajoaminen | Tallennetaan työ päivittäin Gitillä ja pusketaan commitit GitHubiin. |
| Sairastuminen | Kirjataan eteneminen README-tiedostoon ja sovitaan varapäivä. |
| Parityön vähäinen viestintä ja sooloilu | Sovitaan tapaamiset, yhtenäinen ulkoasu ja Gitin työnkulku. Jaetaan työ tasaisesti ja katselmoidaan molempien muutokset. |
| Äänipätkä ei lataudu tai kappaleella on monta tunnettua nimeä | Paketoidaan esimerkkiäänitteet mukaan ja tallennetaan yleiset nimivaihtoehdot. |
| Jamendon Client ID tai API ei ole käytettävissä | Testataan tunniste etukäteen. Paikalliset esimerkkikappaleet toimivat myös ilman API-yhteyttä. |
| JSON Server ei käynnisty katselmoinnissa | Käynnistetään peli README-ohjeella ennen esitystä ja tarkistetaan, että portti 3000 on vapaa. |
