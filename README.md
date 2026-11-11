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

Mukana on kuusi vapaasti jaettavaa esimerkkikappaletta. Kokoelma ei ole Songspotin musiikkikirjasto. Vaikeustaso on kappale-editorissa määritettävä arvio 1–5, ei kuuntelumääriin perustuva luokitus. Kaikki esimerkit kuuluvat Ennen 2000 -aikakauteen; muille aikakausille voi lisätä omia kappaleita. Tyhjästä suodatustuloksesta näytetään ilmoitus.

Kappaleeditorin äänikenttään käy tiedosto kansiosta `public/audio/`, esimerkiksi `audio/fur-elise.mp3`, tai selaimesta haettavissa oleva suora HTTPS-osoite äänitiedostoon. Ulkoisen palvelimen on sallittava haku toiselta sivustolta (CORS). Voit antaa samalle kappaleelle useita hyväksyttäviä nimiä.

## Toteutus ja katselmointi

Käyttöliittymässä on kolme tiedostoa: `public/index.html`, `public/styles.css` ja `public/app.js`. HTML sisältää näkymät, lomakkeet, dialogit ja valikon popoverin. CSS käyttää Grid- ja Flexbox-asettelua. JavaScript arpoo kappaleen, soittaa äänipätkän Web Audio API:lla ja hakee tai tallentaa kappaletiedot `fetch()`-kutsuilla.

| Toiminto | REST-pyyntö |
| --- | --- |
| Lue kappaleet | GET /questions |
| Lisää kappale | POST /questions |
| Muokkaa kappaletta | PATCH /questions/:id |
| Poista kappale | DELETE /questions/:id |

Katselmoinnissa kuuntele ensimmäinen pätkä, ohita kerran ja kirjoita vastaus. Lisää sitten oma kappale, muokkaa sitä ja poista se. Näytä `db.json`, `app.js`:n `request()`-funktio ja Gitin commit-historia.

GitHubissa on projektin lähdekoodi. Ohjeen mukainen paikallinen JSON Server tarjoaa tallennuksen kappale-editorille. Tämä on paikallisesti käynnistettävä kurssiprojekti; GitHub Pages ei suorita JSON Serveriä.

## Tarkistettu selaimessa

- Äänen toisto, väärä vastaus, ohitus, nimivaihtoehdon hyväksyminen ja vastauksen paljastus.
- Kappaleen lisäys, muokkaus, haku ja poisto sekä aikakausisuodatus.
- Tulosten säilyminen sivun päivityksen yli ja asetusten vaikutus pelin pituuksiin.
- Vaalea ja tumma teema sekä mobiiliasettelu.

[Projektisuunnitelma](PROJECT_PLAN.md) · [Äänitteiden lähteet](AUDIO_CREDITS.md) · [Pelimekaniikan esikuva](https://songspot.net/faq)
