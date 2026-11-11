const find = (selector) => document.querySelector(selector);
const allClipLengths = [0.1, 0.5, 2, 8, 15];
const listen = find('#listen');
const guess = find('#guess');
const guessButton = find('#guess-button');
const editor = find('#editor');
const questionForm = find('#question-form');
const deleteDialog = find('#delete-dialog');
const deleteForm = find('#delete-form');
const feedback = find('#feedback');

let songs = [];
let localSongs = [];
let musicSource = 'local';
let song;
let playedIds = new Set();
const jamendoGenres = [
  { label: 'Kaikki tyylilajit', tag: '' },
  { label: 'Lounge', tag: 'lounge' }, { label: 'Klassinen', tag: 'classical' },
  { label: 'Elektroninen', tag: 'electronic' }, { label: 'Jazz', tag: 'jazz' },
  { label: 'Pop', tag: 'pop' }, { label: 'Hip-Hop', tag: 'hiphop' },
  { label: 'Rentoutuminen', tag: 'relaxation' }, { label: 'Rock', tag: 'rock' },
  { label: 'Laulaja-lauluntekijä', tag: 'songwriter' }, { label: 'Maailmanmusiikki', tag: 'world' },
  { label: 'Metalli', tag: 'metal' }, { label: 'Elokuvamusiikki', tag: 'soundtrack' }
];
let categories = ['Kaikki tyylilajit'];
let categoryIndex = 0;
let level = 1;
let clipLengths = [...allClipLengths];
let stage = 0;
let ended = false;
let selectedId = null;
let audioSource;
let audioTimer;
let playbackRequest = 0;
let jamendoOffset = 0;
let jamendoPageSize = 0;
let localStorageFallback = false;
const stats = readStored('savelspot-stats', { played: 0, solved: 0, streak: 0, best: 0, distribution: [0, 0, 0, 0, 0] });
const settings = readStored('savelspot-settings', { theme: 'system', volume: 65, easySearch: true, spotlight: true, clips: allClipLengths, musicSource: 'local', jamendoClientId: '' });
let roundGuesses = [];

function readStored(key, defaults) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    for (const name of Object.keys(defaults)) {
      if (saved && typeof saved[name] === typeof defaults[name] && Array.isArray(saved[name]) === Array.isArray(defaults[name])) defaults[name] = saved[name];
    }
  } catch { /* Tallennuksen puuttuminen ei estä pelaamista. */ }
  return defaults;
}

function saveStored(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch { /* Peli toimii myös, jos selain estää tallennuksen. */ }
}

function currentLength() { return ended ? 15 : clipLengths[stage]; }

async function request(method = 'GET', id = null, data) {
  const path = id === null ? '/questions' : '/questions/' + encodeURIComponent(id);
  const options = { method };
  if (data) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(data);
  }
  const response = await fetch(path, options);
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return method === 'DELETE' ? null : response.json();
}

function persistBrowserQuestions() {
  try { localStorage.setItem('savelspot-local-questions', JSON.stringify(localSongs)); }
  catch { /* Paikallisen tallennuksen puuttuminen ei estä peliä. */ }
}

async function saveQuestion(id, data) {
  if (!localStorageFallback) {
    try { return await request(id === null ? 'POST' : 'PATCH', id, data); }
    catch { localStorageFallback = true; }
  }
  if (id === null) {
    return { ...data, id: String(Date.now()) };
  }
  return { ...localSongs.find((entry) => entry.id === id), ...data, id };
}

async function removeQuestion(id) {
  if (!localStorageFallback) {
    try { await request('DELETE', id); return; }
    catch { localStorageFallback = true; }
  }
}

function showView(name) {
  if (name !== 'play') stopAudio();
  document.querySelectorAll('main > section').forEach((section) => {
    section.hidden = section.id !== name;
  });
  document.querySelectorAll('nav [data-view]').forEach((button) => {
    if (button.dataset.view === name) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  find('#menu').hidePopover();
  find('#' + name + '-heading').focus();
}

function setError(selector, message = '') {
  const element = find(selector);
  element.textContent = message;
  element.hidden = !message;
}

function setFeedback(message = '', result = '') {
  feedback.textContent = message;
  feedback.dataset.result = result;
}

function seconds(value) {
  return String(value).replace('.', ',') + ' s';
}

function updateListenLabel() {
  const playing = Boolean(audioSource);
  listen.classList.toggle('playing', playing);
  listen.setAttribute('aria-label', playing ? 'Pysäytä' : 'Toista ' + seconds(currentLength()));
  find('#play-caption').textContent = playing ? 'SOI NYT' : 'KUUNTELE';
}

function stopAudio() {
  playbackRequest++;
  if (audioSource) {
    audioSource.pause();
    audioSource.currentTime = 0;
    audioSource = null;
  }
  clearTimeout(audioTimer);
  updateListenLabel();
  listen.disabled = !song;
}

async function playClip() {
  if (!song) return;
  const wasPlaying = Boolean(audioSource);
  stopAudio();
  if (wasPlaying) return;
  const ticket = playbackRequest;
  listen.disabled = true;
  find('#play-caption').textContent = 'LADATAAN';
  try {
    const audio = new Audio(song.audio);
    audio.volume = Number(find('#volume').value) / 100;
    audio.preload = 'none';
    audioSource = audio;
    audio.addEventListener('error', () => {
      if (ticket === playbackRequest) {
        audioSource = null;
        setFeedback('Tätä kappaletta ei voitu toistaa. Kokeile seuraavaa biisiä.', 'wrong');
        updateListenLabel();
      }
    }, { once: true });
    audio.addEventListener('ended', () => {
      if (audioSource !== audio) return;
      audioSource = null;
      clearTimeout(audioTimer);
      updateListenLabel();
    }, { once: true });
    await audio.play();
    if (ticket !== playbackRequest) { audio.pause(); return; }
    audioTimer = setTimeout(() => {
      if (audioSource !== audio) return;
      audio.pause();
      audio.currentTime = 0;
      audioSource = null;
      updateListenLabel();
    }, currentLength() * 1000);
    updateListenLabel();
  } catch {
    if (ticket === playbackRequest) {
      audioSource = null;
      setFeedback('Äänitiedostoa ei voitu toistaa. Tarkista yhteys tai kokeile seuraavaa biisiä.', 'wrong');
      updateListenLabel();
    }
  } finally {
    if (ticket === playbackRequest) { listen.disabled = !song; updateListenLabel(); }
  }
}

function renderStage() {
  const length = currentLength();
  find('#duration').textContent = seconds(length);
  find('#timeline-fill').style.width = (length / 15 * 100) + '%';
  find('#attempt-label').textContent = ended ? 'KIERROS VALMIS' : 'YRITYS ' + (stage + 1) + ' / ' + clipLengths.length;
  find('#steps').replaceChildren(...allClipLengths.map((value) => {
    const step = document.createElement('span');
    step.textContent = seconds(value);
    step.className = value === length ? 'current' : !clipLengths.includes(value) ? 'inactive' : '';
    return step;
  }));
  find('.game-hint').hidden = ended;
  find('.game-hint').firstChild.textContent = 'Yksi biisi. ' + clipLengths.length + (clipLengths.length === 1 ? ' mahdollisuus. ' : ' mahdollisuutta. ');
  updateListenLabel();
}

function updateGuessButton() {
  guessButton.textContent = guess.value.trim() ? 'Arvaa →' : 'Ohita ↠';
  guessButton.classList.toggle('has-guess', Boolean(guess.value.trim()));
}

function trackEra(releasedate) {
  const year = Number((releasedate || '').slice(0, 4));
  if (!year) return 'unknown';
  if (year < 2000) return 'classic';
  if (year < 2010) return '2000';
  if (year < 2020) return '2010';
  return '2020';
}

function mapJamendoTrack(track) {
  const selectedGenre = jamendoGenres[categoryIndex] || jamendoGenres[0];
  const apiGenres = track.musicinfo?.tags?.genres || [];
  const genreLabel = apiGenres[0] ? apiGenres[0].replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Muu';
  const license = track.license_ccurl || '';
  // Excerpts are adaptations: keep only Creative Commons tracks without NoDerivatives.
  if (/\bnd(?:\/|$|-)/i.test(license)) return null;
  return {
    id: 'jamendo-' + track.id,
    title: (track.name || '').trim(),
    artist: (track.artist_name || '').trim(),
    category: selectedGenre.tag ? selectedGenre.label : genreLabel,
    era: trackEra(track.releasedate),
    level: 1,
    aliases: '',
    audio: track.audio,
    source: 'jamendo',
    trackUrl: track.shareurl || 'https://www.jamendo.com/track/' + track.id,
    licenseUrl: license,
    cover: track.album_image || track.image || ''
  };
}

function renderTitles() {
  find('#titles').replaceChildren(...songs.map((entry) => new Option(entry.artist, entry.title)));
}

async function loadJamendoPage(reset = false) {
  const clientId = settings.jamendoClientId.trim();
  if (!clientId) throw new Error('Lisää Jamendo Client ID valikosta ensin.');
  if (reset) { jamendoOffset = 0; playedIds.clear(); }
  const genre = jamendoGenres[categoryIndex] || jamendoGenres[0];
  const params = new URLSearchParams({
    client_id: clientId, format: 'json', limit: '200', offset: String(jamendoOffset),
    include: 'licenses,musicinfo', audioformat: 'mp31', type: 'single albumtrack',
    groupby: 'artist_id', ccnd: 'false'
  });
  if (genre.tag) {
    params.set('tags', genre.tag);
    params.set('featured', '1');
  } else {
    params.set('order', 'popularity_total');
  }
  const response = await fetch('https://api.jamendo.com/v3.0/tracks/?' + params);
  if (!response.ok) throw new Error('Jamendon musiikkikatalogiin ei saatu yhteyttä.');
  const data = await response.json();
  if (data.headers?.status !== 'success') throw new Error(data.headers?.error_message || 'Jamendo ei hyväksynyt Client ID:tä.');
  const page = (data.results || []).map(mapJamendoTrack).filter((entry) => entry?.title && entry?.artist && entry?.audio);
  jamendoPageSize = (data.results || []).length;
  if (!page.length) throw new Error('Tästä hausta ei löytynyt soitettavia kappaleita. Valitse toinen tyylilaji.');
  jamendoOffset += (data.results || []).length;
  songs = page;
  renderTitles();
  find('#catalog-note').hidden = false;
  find('#catalog-note').textContent = 'Jamendo · ' + genre.label + ' · ' + page.length + ' kappaletta ladattu tähän erään. Tyylilajit tulevat indie-musiikin katalogista.';
  find('#jamendo-status').textContent = 'Yhdistetty. Katalogi hakee uusia kappaleita erissä pelin edetessä.';
}

function showJamendoError(error) {
  songs = [];
  song = null;
  renderTitles();
  find('#reroll').disabled = true;
  guess.disabled = guessButton.disabled = listen.disabled = true;
  find('#round-label').textContent = 'KAPPALEITA EI LADATTU';
  setFeedback(error.message || 'Jamendon katalogiin yhdistäminen epäonnistui.');
  find('#jamendo-status').textContent = error.message || 'Tarkista Client ID ja yritä uudelleen.';
}

async function useMusicSource(source) {
  if (source === 'local') {
    musicSource = 'local';
    settings.musicSource = 'local';
    saveStored('savelspot-settings', settings);
    find('#difficulty').hidden = false;
    find('#catalog-note').hidden = true;
    categories = ['Kaikki tyylilajit', ...new Set(localSongs.map((entry) => entry.category))];
    categoryIndex = Math.max(0, categories.indexOf(find('#category').value));
    find('#category').replaceChildren(...categories.map((name) => new Option(name, name)));
    find('#category').value = categories[categoryIndex];
    songs = localSongs;
    renderTitles();
    startSong();
    find('#jamendo-status').textContent = 'Käytössä ovat paikalliset esimerkkibiisit.';
    return;
  }
  if (!settings.jamendoClientId.trim()) {
    find('#jamendo-status').textContent = 'Lisää ensin oma Jamendo Client ID.';
    find('#jamendo-id').focus();
    return;
  }
  musicSource = 'jamendo';
  settings.musicSource = 'jamendo';
  saveStored('savelspot-settings', settings);
  find('#difficulty').hidden = true;
  categories = jamendoGenres.map((genre) => genre.label);
  categoryIndex = 0;
  find('#category').replaceChildren(...categories.map((name) => new Option(name, name)));
  find('#category').value = categories[0];
  find('#catalog-note').hidden = false;
  find('#catalog-note').textContent = 'Yhdistetään Jamendon musiikkikatalogiin…';
  setFeedback('Haetaan kappaleita musiikkikatalogista…');
  stopAudio();
  try {
    await loadJamendoPage(true);
    startSong();
  } catch (error) {
    showJamendoError(error);
  }
}

async function startSong() {
  stopAudio();
  let pool = songs.filter((entry) =>
    (categoryIndex === 0 || entry.category === categories[categoryIndex]) &&
    (find('#era').value === 'all' || (entry.era || 'classic') === find('#era').value) &&
    (musicSource === 'jamendo' || Number(entry.level || 1) === level));
  let choices = pool.filter((entry) => !playedIds.has(entry.id));
  let pageError = '';
  if (!choices.length && musicSource === 'jamendo') {
    let pagesTried = 0;
    while (!choices.length && jamendoPageSize === 200 && pagesTried < 4) {
      try {
        setFeedback('Haetaan lisää kappaleita…');
        await loadJamendoPage();
        pool = songs.filter((entry) => (categoryIndex === 0 || entry.category === categories[categoryIndex]) && (find('#era').value === 'all' || (entry.era || 'classic') === find('#era').value));
        choices = pool.filter((entry) => !playedIds.has(entry.id));
      } catch (error) {
        pageError = error.message || 'Seuraavaa kappaletta ei saatu ladattua.';
        break;
      }
      pagesTried++;
    }
  } else if (!choices.length && musicSource === 'local') {
      playedIds.clear();
      choices = pool.length > 1 ? pool.filter((entry) => entry.id !== song?.id) : pool;
  }
  song = choices[Math.floor(Math.random() * choices.length)];
  if (song) playedIds.add(song.id);
  stage = 0;
  ended = false;
  roundGuesses = [];
  find('#guesses').replaceChildren();
  find('#reveal').hidden = true;
  find('#guess-form').hidden = false;
  find('#reroll').disabled = !song;
  guess.value = '';
  guess.disabled = guessButton.disabled = listen.disabled = !song;
  updateGuessButton();
  renderStage();
  find('#round-label').textContent = pool.length + (musicSource === 'jamendo' ? ' KAPPALETTA TÄSSÄ ERÄSSÄ' : ' KAPPALETTA TÄSSÄ VALINNASSA');
  if (!song) setFeedback(pageError || (pool.length ? 'Tämän erän kappaleet on jo pelattu. Vaihda tyylilajia tai tarkista aikakausisuodatin.' : 'Tällä yhdistelmällä ei ole kappaleita. Vaihda suodattimia tai lisää oma biisi.'));
  else if (musicSource === 'jamendo') setFeedback('Valmis. Kappaleen vastaus paljastaa artistin ja musiikin lisenssin.');
  else setFeedback('');
}

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]/gu, '');
}

function finishSong(correct) {
  ended = true;
  guess.disabled = guessButton.disabled = true;
  find('#answer-title').textContent = song.title;
  find('#answer-artist').textContent = song.artist;
  const credit = find('#track-credit');
  credit.replaceChildren();
  credit.hidden = song.source !== 'jamendo';
  if (song.source === 'jamendo') {
    const trackLink = document.createElement('a');
    trackLink.href = song.trackUrl;
    trackLink.target = '_blank';
    trackLink.rel = 'noreferrer';
    trackLink.textContent = 'Jamendo · kappaleen sivu';
    credit.append(trackLink);
    if (song.licenseUrl) {
      const licenseLink = document.createElement('a');
      licenseLink.href = song.licenseUrl.replace(/^http:/, 'https:');
      licenseLink.target = '_blank';
      licenseLink.rel = 'noreferrer';
      licenseLink.textContent = 'Lisenssi';
      credit.append(document.createTextNode(' · '), licenseLink);
    }
  }
  find('#reveal').hidden = false;
  find('#guess-form').hidden = true;
  setFeedback(correct ? 'Oikein! Tunnistit biisin pätkästä ' + seconds(clipLengths[stage]) + '.' : 'Yritykset loppuivat.', correct ? 'correct' : 'wrong');
  stats.played++;
  if (correct) stats.solved++;
  if (correct) stats.distribution[allClipLengths.indexOf(clipLengths[stage])]++;
  stats.streak = correct ? stats.streak + 1 : 0;
  stats.best = Math.max(stats.best, stats.streak);
  saveStored('savelspot-stats', stats);
  renderStats();
  renderStage();
  find('#next-song').focus();
}

find('#guess-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!song || ended) return;
  stopAudio();
  const submitted = guess.value.trim();
  const validTitles = [song.title, ...(song.aliases || '').split(',')].map(normalize).filter(Boolean);
  const correct = Boolean(submitted && validTitles.includes(normalize(submitted)));
  roundGuesses.push(correct ? '🟩' : submitted ? '🟥' : '⬜');
  const row = document.createElement('li');
  const text = document.createElement('span');
  const time = document.createElement('time');
  row.className = correct ? 'correct' : submitted ? 'wrong' : '';
  text.textContent = (correct ? '✓ ' : submitted ? '× ' : '↠ ') + (submitted || 'Ohitettu');
  time.textContent = seconds(clipLengths[stage]);
  row.append(text, time);
  find('#guesses').append(row);
  if (correct) {
    finishSong(true);
    return;
  }
  if (stage + 1 >= clipLengths.length) {
    finishSong(false);
    return;
  }
  stage++;
  guess.value = '';
  updateGuessButton();
  renderStage();
  setFeedback((submitted ? 'Ei osunut. ' : '') + 'Nyt voit kuunnella ' + seconds(clipLengths[stage]) + '.');
  listen.focus();
});

function changeCategory(direction) {
  categoryIndex = (categoryIndex + direction + categories.length) % categories.length;
  find('#category').value = categories[categoryIndex];
  if (musicSource === 'jamendo') {
    stopAudio();
    songs = [];
    setFeedback('Haetaan kappaleita valitusta tyylilajista…');
    loadJamendoPage(true).then(startSong).catch(showJamendoError);
  } else {
    playedIds.clear();
    startSong();
  }
}

listen.addEventListener('click', playClip);
find('#reroll').addEventListener('click', startSong);
find('#era').addEventListener('change', startSong);
find('#category').addEventListener('change', () => {
  categoryIndex = categories.indexOf(find('#category').value);
  if (musicSource === 'jamendo') {
    stopAudio();
    songs = [];
    setFeedback('Haetaan kappaleita valitusta tyylilajista…');
    loadJamendoPage(true).then(startSong).catch(showJamendoError);
  } else startSong();
});
guess.addEventListener('input', updateGuessButton);
find('#next-song').addEventListener('click', () => {
  startSong();
  listen.focus();
});
find('#previous-category').addEventListener('click', () => changeCategory(-1));
find('#next-category').addEventListener('click', () => changeCategory(1));
find('#volume').addEventListener('input', (event) => {
  if (audioSource) audioSource.volume = Number(event.target.value) / 100;
  find('#volume-value').textContent = event.target.value + ' %';
  settings.volume = Number(event.target.value);
  saveStored('savelspot-settings', settings);
});
find('#theme').addEventListener('change', (event) => {
  document.documentElement.dataset.theme = event.target.value;
  settings.theme = event.target.value;
  saveStored('savelspot-settings', settings);
});
find('#easy-search').addEventListener('change', (event) => {
  settings.easySearch = event.target.checked;
  guess.setAttribute('list', settings.easySearch ? 'titles' : '');
  saveStored('savelspot-settings', settings);
});
find('#spotlight').addEventListener('change', (event) => {
  settings.spotlight = event.target.checked;
  document.body.classList.toggle('no-spotlight', !settings.spotlight);
  saveStored('savelspot-settings', settings);
});
find('#clip-options').addEventListener('change', (event) => {
  const selected = [...find('#clip-options').querySelectorAll(':checked')].map((input) => Number(input.value));
  if (!selected.length) { event.target.checked = true; return; }
  clipLengths = settings.clips = selected;
  saveStored('savelspot-settings', settings);
  startSong();
});
find('#help').addEventListener('click', () => {
  find('#instructions').open = true;
  find('#instructions summary').focus();
  find('#instructions').scrollIntoView({ block: 'start' });
});
find('#jamendo-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const clientId = find('#jamendo-id').value.trim();
  if (!clientId) {
    find('#jamendo-status').textContent = 'Syötä Jamendo Client ID ennen yhdistämistä.';
    return;
  }
  settings.jamendoClientId = clientId;
  saveStored('savelspot-settings', settings);
  await useMusicSource('jamendo');
});
find('#use-local').addEventListener('click', () => useMusicSource('local'));
find('.wordmark').addEventListener('click', (event) => { event.preventDefault(); showView('play'); });
find('#share').addEventListener('click', async () => {
  const result = 'Sävelspot ' + roundGuesses.join('') + '\n' + (roundGuesses.includes('🟩') ? 'Tunnistin biisin: ' + seconds(clipLengths[stage]) : 'Tällä kertaa biisi vei voiton!');
  try { await navigator.clipboard.writeText(result); setFeedback('Tulos kopioitu. Voit liittää sen viestiin.'); }
  catch { setFeedback('Kopiointi ei onnistunut. Tuloksesi: ' + roundGuesses.join('')); }
});
document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => showView(button.dataset.view));
});
document.querySelectorAll('#difficulty button').forEach((button) => {
  button.addEventListener('click', () => {
    const selected = Number(button.dataset.level);
    if (selected === level) return;
    find('#difficulty [aria-pressed="true"]').setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-pressed', 'true');
    level = selected;
    startSong();
  });
});

function refreshCatalog() {
  if (musicSource === 'jamendo') { renderCatalog(); return; }
  const oldCategory = categories[categoryIndex];
  categories = ['Kaikki tyylilajit', ...new Set(localSongs.map((entry) => entry.category))];
  categoryIndex = Math.max(0, categories.indexOf(oldCategory));
  find('#category').replaceChildren(...categories.map((name) => new Option(name, name)));
  find('#category').value = categories[categoryIndex];
  renderTitles();
  renderCatalog();
}

function renderCatalog() {
  const list = find('#question-list');
  list.replaceChildren();
  if (!localSongs.length) list.textContent = 'Kappaleita ei ole vielä.';
  const query = normalize(find('#catalog-search').value);
  const matches = localSongs.filter((entry) => normalize(entry.title + entry.artist).includes(query));
  if (localSongs.length && !matches.length) list.textContent = 'Ei hakutuloksia.';
  for (const entry of matches) {
    const card = document.createElement('article');
    const title = document.createElement('h2');
    const subtitle = document.createElement('p');
    title.textContent = entry.title;
    subtitle.textContent = entry.artist + ' · ' + entry.category + ' · Taso ' + (entry.level || 1);
    const actions = document.createElement('div');
    actions.className = 'actions';
    for (const [label, action] of [['Muokkaa', 'edit'], ['Poista', 'delete']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.dataset.action = action;
      button.dataset.id = entry.id;
      button.setAttribute('aria-label', label + ': ' + entry.title);
      actions.append(button);
    }
    const copy = document.createElement('div');
    copy.append(title, subtitle);
    card.append(copy, actions);
    list.append(card);
  }
}

function openEditor(entry = null) {
  selectedId = entry?.id ?? null;
  questionForm.reset();
  setError('#save-error');
  find('#editor-heading').textContent = entry ? 'Muokkaa kappaletta' : 'Lisää kappale';
  if (entry) {
    for (const field of questionForm.querySelectorAll('input, select')) field.value = entry[field.name] ?? (field.name === 'era' ? 'classic' : field.name === 'level' ? '1' : '');
  }
  editor.showModal();
}

find('#add').addEventListener('click', () => openEditor());
find('#catalog-search').addEventListener('input', renderCatalog);
find('#cancel-edit').addEventListener('click', () => editor.close());
find('#cancel-delete').addEventListener('click', () => deleteDialog.close());
for (const dialog of [editor, deleteDialog]) {
  dialog.addEventListener('cancel', (event) => {
    if (dialog.querySelector('button[type="submit"]').disabled) event.preventDefault();
  });
}

find('#question-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const entry = localSongs.find((item) => String(item.id) === button.dataset.id);
  if (!entry) return;
  if (button.dataset.action === 'edit') {
    openEditor(entry);
    return;
  }
  selectedId = entry.id;
  find('#delete-label').textContent = entry.title;
  setError('#delete-error');
  deleteDialog.showModal();
});

function lockForm(form, locked) {
  for (const button of form.querySelectorAll('button')) button.disabled = locked;
}

function validAudioPath(value) {
  if (/^audio\/[\w.-]+\.(mp3|wav|ogg|opus|m4a)$/i.test(value)) return true;
  try { return new URL(value).protocol === 'https:'; }
  catch { return false; }
}

questionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(questionForm));
  for (const key of Object.keys(data)) data[key] = data[key].trim();
  data.level = Number(data.level);
  if (!validAudioPath(data.audio)) {
    setError('#save-error', 'Anna audio-kansiossa olevan tiedoston polku tai HTTPS-osoite.');
    return;
  }
  const id = selectedId;
  lockForm(questionForm, true);
  setError('#save-error');
  try {
    const saved = await saveQuestion(id, data);
    if (id === null) localSongs.push(saved);
    else localSongs = localSongs.map((entry) => entry.id === id ? saved : entry);
    if (localStorageFallback) persistBrowserQuestions();
    refreshCatalog();
    if (musicSource === 'local') { songs = localSongs; startSong(); }
    editor.close();
    find('#add').focus();
  } catch {
    setError('#save-error', 'Tallennus epäonnistui. Tarkista, että JSON Server on käynnissä.');
  } finally {
    lockForm(questionForm, false);
  }
});

deleteForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = selectedId;
  lockForm(deleteForm, true);
  setError('#delete-error');
  try {
    await removeQuestion(id);
    localSongs = localSongs.filter((entry) => entry.id !== id);
    if (localStorageFallback) persistBrowserQuestions();
    refreshCatalog();
    if (musicSource === 'local') { songs = localSongs; startSong(); }
    deleteDialog.close();
    find('#add').focus();
  } catch {
    setError('#delete-error', 'Poisto epäonnistui. Tarkista, että JSON Server on käynnissä.');
  } finally {
    lockForm(deleteForm, false);
  }
});

async function loadSongs() {
  find('#add').disabled = true;
  try {
    try {
      localSongs = await request();
    } catch {
      localStorageFallback = true;
      const response = await fetch('songs.json');
      if (!response.ok) throw new Error('Esimerkkikappaleita ei löytynyt.');
      const sample = await response.json();
      localSongs = sample.questions || [];
      try {
        const stored = JSON.parse(localStorage.getItem('savelspot-local-questions'));
        if (Array.isArray(stored)) localSongs = stored;
      } catch { /* Tallennettua omaa kokoelmaa ei vielä ole. */ }
    }
    songs = localSongs;
    refreshCatalog();
    find('#add').disabled = false;
    if (settings.jamendoClientId && settings.musicSource === 'jamendo') {
      find('#jamendo-id').value = settings.jamendoClientId;
      await useMusicSource('jamendo');
    } else startSong();
  } catch {
    setFeedback('Kappaleita ei saatu ladattua.');
    setError('#load-error', 'Esimerkkikappaleiden lataus epäonnistui. Päivitä sivu tai tarkista JSON Server.');
  }
}

function renderStats() {
  find('#solved').textContent = stats.solved + ' / ' + stats.played;
  find('#streak').textContent = stats.streak;
  find('#best').textContent = stats.best;
  find('#distribution').replaceChildren(...allClipLengths.map((length, index) => {
    const row = document.createElement('div');
    const label = document.createElement('span');
    const bar = document.createElement('b');
    label.textContent = seconds(length);
    bar.textContent = stats.distribution[index];
    bar.style.width = Math.max(8, stats.distribution[index] / Math.max(1, ...stats.distribution) * 80) + '%';
    row.append(label, bar);
    return row;
  }));
}

// Käyttäjän valinnat palautetaan, mutta uusi sivulataus aloittaa uuden kierroksen.
clipLengths = allClipLengths.filter((length) => settings.clips.includes(length));
if (!clipLengths.length) clipLengths = [...allClipLengths];
settings.clips = clipLengths;
document.documentElement.dataset.theme = settings.theme;
find('#theme').value = settings.theme;
find('#volume').value = settings.volume;
find('#volume-value').textContent = settings.volume + ' %';
find('#jamendo-id').value = settings.jamendoClientId || '';
find('#easy-search').checked = settings.easySearch;
guess.setAttribute('list', settings.easySearch ? 'titles' : '');
find('#spotlight').checked = settings.spotlight;
document.body.classList.toggle('no-spotlight', !settings.spotlight);
find('#clip-options').querySelectorAll('input').forEach((input) => { input.checked = clipLengths.includes(Number(input.value)); });
if (!Array.isArray(stats.distribution) || stats.distribution.length !== 5 || stats.distribution.some((n) => !Number.isFinite(n) || n < 0)) stats.distribution = [0, 0, 0, 0, 0];
renderStats();
loadSongs();
