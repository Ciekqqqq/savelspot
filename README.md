# Sävelspot

Kuuntele kappaleen alkua ja kirjoita sen nimi. Ensimmäinen pätkä kestää 0,1 sekuntia. Väärä vastaus tai ohitus avaa pidemmän pätkän samasta kappaleesta. Helpossa pelissä pituudet ovat 0,1 s, 0,5 s, 2 s, 8 s ja 15 s. Muut vaikeustasot lyhentävät yritysten määrää.

## Käynnistä peli

Tarvitset Node.js:n ja npm:n. Avaa projektikansio VS Codessa ja suorita nämä komennot terminaalissa:

~~~sh
npm install
npm start
~~~

Jos Windowsin PowerShell estää npm:n käynnistämisen, käytä komentoja `npm.cmd install` ja `npm.cmd start`.

Avaa selaimessa [http://127.0.0.1:3000](http://127.0.0.1:3000). JSON Server tarjoaa sekä käyttöliittymän että kysymysten REST API:n. Pidä terminaali auki pelatessa. Jos sivu näyttää yhteysvirheen, käynnistä palvelin uudelleen ja päivitä sivu.

## Näkymät

- **Pelaa.** Toista äänipätkä, kirjoita vastaus tai ohita. Valitse halutessasi tyylilaji ja vaikeustaso.
- **Kappaleet.** Katsele, lisää, muokkaa ja poista pelin kappaleita. Muutokset tallentuvat tiedostoon `db.json`.
- **Tulokset.** Katso tunnistettujen kappaleiden määrä ja paras putki nykyisellä sivulatauksella.

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

GitHubissa on projektin lähdekoodi. Ohjeen mukainen paikallinen JSON Server tarjoaa tallennuksen kappale-editorille.

[Projektisuunnitelma](PROJECT_PLAN.md) · [Äänitteiden lähteet](AUDIO_CREDITS.md) · [Pelimekaniikan esikuva](https://songspot.net/faq)
