# Sävelspot

Kuuntele kappaleen alkua ja kirjoita sen nimi. Ensimmäinen pätkä kestää 0,1 sekuntia. Väärä vastaus tai ohitus avaa pidemmän pätkän samasta kappaleesta: 0,5 s, 2 s, 8 s ja 15 s. Pelin rakenne seuraa Songspotia, ja ulkoasu käyttää omaa violettia kohdevaloa, levypainiketta ja Sävelspot-tunnusta.

## Käynnistä peli

Tarvitset Node.js:n ja npm:n. Avaa projektikansio VS Codessa ja suorita nämä komennot terminaalissa:

~~~sh
npm install
npm start
~~~

Jos Windowsin PowerShell estää npm:n käynnistämisen, käytä komentoja `npm.cmd install` ja `npm.cmd start`.

Avaa selaimessa [http://127.0.0.1:3000](http://127.0.0.1:3000). JSON Server tarjoaa sekä käyttöliittymän että kysymysten REST API:n. Pidä terminaali auki pelatessa. Jos sivu näyttää yhteysvirheen, käynnistä palvelin uudelleen ja päivitä sivu.

## Näkymät

- **Pelaa.** Toista äänipätkä, kirjoita vastaus tai ohita. Tyylilaji, aikakausi ja vaikeustaso suodattavat kappaleet. Näet aiemmat arvaukset ja lopuksi oikean vastauksen. Paljastuksen jälkeen toisto soittaa 15 sekuntia. Tuloksen voi kopioida leikepöydälle.
- **Kappaleet.** Katsele, lisää, muokkaa ja poista pelin kappaleita. Muutokset tallentuvat tiedostoon `db.json`.
- **Tulokset.** Katso tunnistettujen kappaleiden määrä, paras putki ja onnistumiset pätkien pituuden mukaan. Tulokset säilyvät selaimen localStoragessa.

Valikossa voi säätää äänenvoimakkuutta, valita käytettävät pätkien pituudet, poistaa nimiehdotukset, piilottaa kohdevalon ja vaihtaa teemaa. Vähintään yksi pätkän pituus jää aina käyttöön. Oletusteema seuraa laitteen asetusta. Asetukset säilyvät tässä selaimessa.

Mukana on kuusi oikeaa musiikkitallennetta: Beethovenia, Mozartia ja tuttuja perinnesävelmiä oikeina soittoesityksinä. Tallenteiden tekijät ja lisenssit on merkitty [äänitteiden lähdeluetteloon](AUDIO_CREDITS.md). Kappaleiden tekijänoikeusvapaus ei yksin tee mistä tahansa niitä esittävästä äänityksestä vapaata; käytä vain omia tai luvallisia äänitiedostoja. Nämä esimerkit eivät sisällä kaupallisten suoratoistopalvelujen pop-hittejä. Vaikeustaso on kappale-editorissa määritettävä arvio 1–5, ei kuuntelumääriin perustuva luokitus. Kaikki esimerkit kuuluvat Ennen 2000 -aikakauteen; muille aikakausille voi lisätä omia kappaleita. Tyhjästä suodatustuloksesta näytetään ilmoitus.

## Suuri musiikkikatalogi

Peli voi käyttää myös Jamendon noin puolen miljoonan kappaleen Creative Commons -katalogia. Se kattaa esimerkiksi popin, rockin, elektronisen musiikin, jazzin, klassisen, hip-hopin, metallin ja maailmanmusiikin. Katalogi on pääosin indie-musiikkia, ei kaupallisten listojen hittejä. Pelissä käytetään tyylilajihaun 200 kappaleen sivuja, ja ääni toistetaan suoraan Jamendosta. Kappaleet, joiden lisenssi kieltää muunnelmat, jätetään pois, koska peli käyttää lyhyitä äänipätkiä.

Yhdistäminen vaatii oman Jamendo-kehittäjätilin ja sovelluksen Client ID:n:

1. Rekisteröi sovellus [Jamendon kehittäjäportaalissa](https://devportal.jamendo.com/). Valitse lukuoikeudet ja lisää sovelluksen kuvaukseen julkaistun pelin linkki.
2. Avaa pelin valikko → **Suuri musiikkikatalogi**. Syötä Client ID ja yhdistä.
3. Client ID ja valinta säilyvät vain kyseisessä selaimessa. Älä lisää tunnistetta GitHubiin tai lähetä sitä muille. Jamendon `client_secret`-arvoa ei tarvita.

Jamendon ehdot sallivat API:n käytön ilman kaupallista hyötyä. Pelin tulee näyttää artistin nimi sekä linkit kappaleeseen ja sen Creative Commons -lisenssiin; ne näytetään vastauksen yhteydessä. Ehdot myös kieltävät sovelluksen suunnittelun musiikin tallentamiseen tai offline-kuunteluun. Katalogi toimii vain, jos Jamendon API on käytettävissä ja selaimessa on toimiva Client ID. Ilman sitä peli käyttää kuutta mukana tulevaa kappaletta. [API-ohje](https://developer.jamendo.com/v3.0/tracks) · [API-käyttöehdot](https://devportal.jamendo.com/api_terms_of_use)

Kappaleeditorin äänikenttään käy MP3-, OGG- tai Opus-tiedosto kansiosta `public/audio/`, esimerkiksi `audio/fur-elise.mp3`, tai selaimessa toistettavissa oleva suora HTTPS-osoite äänitiedostoon. Voit antaa samalle kappaleelle useita hyväksyttäviä nimiä.

## Toteutus ja katselmointi

Käyttöliittymässä on kolme tiedostoa: `public/index.html`, `public/styles.css` ja `public/app.js`. HTML sisältää näkymät, lomakkeet, dialogit ja valikon popoverin. CSS käyttää Grid- ja Flexbox-asettelua. JavaScript arpoo kappaleen, soittaa äänipätkän selaimen äänisoittimella, hakee Jamendon metatiedot API:sta ja hakee tai tallentaa omat kappaletiedot `fetch()`-kutsuilla.

| Toiminto | REST-pyyntö |
| --- | --- |
| Lue kappaleet | GET /questions |
| Lisää kappale | POST /questions |
| Muokkaa kappaletta | PATCH /questions/:id |
| Poista kappale | DELETE /questions/:id |

Katselmoinnissa kuuntele ensimmäinen pätkä, ohita kerran ja kirjoita vastaus. Lisää sitten oma kappale, muokkaa sitä ja poista se. Näytä `db.json`, `app.js`:n `request()`-funktio ja Gitin commit-historia.

GitHubissa on projektin lähdekoodi. Paikallinen JSON Server tallentaa kappale-editorin muutokset `db.json`-tiedostoon. Staattisella GitHub Pages -sivulla esimerkkikappaleiden ja omien muokkausten varatallennus käyttää selaimen localStoragea, koska Pages ei suorita JSON Serveriä.

## Tarkistettu selaimessa

- Äänen toisto, väärä vastaus, ohitus, nimivaihtoehdon hyväksyminen ja vastauksen paljastus.
- Kappaleen lisäys, muokkaus, haku ja poisto sekä aikakausisuodatus.
- Tulosten säilyminen sivun päivityksen yli ja asetusten vaikutus pelin pituuksiin.
- Vaalea ja tumma teema sekä mobiiliasettelu.

[Projektisuunnitelma](PROJECT_PLAN.md) · [Äänitteiden lähteet](AUDIO_CREDITS.md) · [Pelimekaniikan esikuva](https://songspot.net/faq)
