# Sävelspot

Arvaa tuttu kappale tekstivihjeestä. Saat oikeasta vastauksesta kaksi pistettä tai yhden pisteen, jos avasit lisävihjeen. Kierroksella arvotaan enintään viisi kysymystä.

## Käynnistä peli

Tarvitset Node.js:n ja npm:n. Avaa projektikansio VS Codessa ja suorita nämä komennot terminaalissa:

~~~sh
npm install
npm start
~~~

Jos Windowsin PowerShell estää npm:n käynnistämisen, käytä komentoja `npm.cmd install` ja `npm.cmd start`.

Avaa selaimessa [http://127.0.0.1:3000](http://127.0.0.1:3000). JSON Server tarjoaa sekä käyttöliittymän että kysymysten REST API:n. Pidä terminaali auki pelatessa. Jos sivu näyttää yhteysvirheen, käynnistä palvelin uudelleen ja päivitä sivu.

## Näkymät

- **Pelaa.** Valitse kolmesta kappaleesta. Saat heti tietää, mikä vastaus oli oikein.
- **Kysymykset.** Katsele, lisää, muokkaa ja poista kysymyksiä. Muutokset tallentuvat tiedostoon `db.json` ja tulevat mukaan seuraavaan kierrokseen.
- **Tulokset.** Katso viimeisimmän pelatun kierroksen pisteet ja aloita uusi kierros.

## Toteutus ja katselmointi

Käyttöliittymässä on kolme tiedostoa: `public/index.html`, `public/styles.css` ja `public/app.js`. HTML sisältää näkymät, lomakkeet, dialogit ja pisteohjeen popoverin. CSS käyttää Grid- ja Flexbox-asettelua ja seuraa laitteen vaaleaa tai tummaa teemaa. JavaScript arpoo kierroksen, laskee pisteet ja hakee tai tallentaa kysymykset `fetch()`-kutsuilla.

| Toiminto | REST-pyyntö |
| --- | --- |
| Lue kysymykset | GET /questions |
| Lisää kysymys | POST /questions |
| Muokkaa kysymystä | PATCH /questions/:id |
| Poista kysymys | DELETE /questions/:id |

Katselmoinnissa pelaa kierros, avaa lisävihje ja näytä tulos. Lisää sitten oma kysymys, muokkaa sitä ja poista se. Näytä `db.json`, `app.js`:n `request()`-funktio ja Gitin commit-historia. Kokeile myös kapeaa selainikkunaa ja selaimen omaa lomakevalidointia.

GitHubissa on projektin lähdekoodi. Ohjeen mukainen paikallinen JSON Server tarjoaa tallennuksen kysymyseditorille.

[Projektisuunnitelma](PROJECT_PLAN.md)
