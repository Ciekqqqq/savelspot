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
let song;
let playedIds = new Set();
let categories = ['Kaikki tyylilajit'];
let categoryIndex = 0;
let level = 1;
let clipLengths = [...allClipLengths];
let stage = 0;
let ended = false;
let selectedId = null;
let audioContext;
let audioSource;
let volume;
let playbackRequest = 0;
const buffers = new Map();
const stats = readStored('savelspot-stats', { played: 0, solved: 0, streak: 0, best: 0, distribution: [0, 0, 0, 0, 0] });
const settings = readStored('savelspot-settings', { theme: 'system', volume: 65, easySearch: true, spotlight: true, clips: allClipLengths });
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
    audioSource.stop();
    audioSource.disconnect();
    audioSource = null;
  }
  updateListenLabel();
  listen.disabled = !song;
}

async function loadBuffer(url) {
  if (buffers.has(url)) return buffers.get(url);
  const response = await fetch(url);
  if (!response.ok) throw new Error('Äänitiedostoa ei löytynyt');
  const buffer = await audioContext.decodeAudioData(await response.arrayBuffer());
  buffers.set(url, buffer);
  return buffer;
}

async function playClip() {
  if (!song) return;
  const wasPlaying = Boolean(audioSource);
  stopAudio();
  if (wasPlaying) return;
  const ticket = playbackRequest;
  const audioUrl = song.audio;
  listen.disabled = true;
  find('#play-caption').textContent = 'LADATAAN';
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
      volume = audioContext.createGain();
      volume.gain.value = Number(find('#volume').value) / 100;
      volume.connect(audioContext.destination);
    }
    await audioContext.resume();
    const buffer = await loadBuffer(audioUrl);
    if (ticket !== playbackRequest) return;

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(volume);
    source.onended = () => {
      if (audioSource !== source) return;
      audioSource = null;
      source.disconnect();
      updateListenLabel();
    };
    source.start(0, 0, Math.min(currentLength(), buffer.duration));
    audioSource = source;
    updateListenLabel();
  } catch {
    if (ticket === playbackRequest) setFeedback('Äänitiedostoa ei voitu toistaa. Tarkista kappaleen osoite.', 'wrong');
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

function startSong() {
  stopAudio();
  const pool = songs.filter((entry) =>
    (categoryIndex === 0 || entry.category === categories[categoryIndex]) &&
    (find('#era').value === 'all' || (entry.era || 'classic') === find('#era').value) &&
    Number(entry.level || 1) === level);
  let choices = pool.filter((entry) => !playedIds.has(entry.id));
  if (!choices.length) {
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
  find('#round-label').textContent = pool.length + ' KAPPALETTA TÄSSÄ VALINNASSA';
  setFeedback(song ? '' : 'Tällä yhdistelmällä ei ole kappaleita. Vaihda suodattimia tai lisää oma biisi.');
}

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]/gu, '');
}

function finishSong(correct) {
  ended = true;
  guess.disabled = guessButton.disabled = true;
  find('#answer-title').textContent = song.title;
  find('#answer-artist').textContent = song.artist;
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
  playedIds.clear();
  startSong();
}

listen.addEventListener('click', playClip);
find('#reroll').addEventListener('click', startSong);
find('#era').addEventListener('change', startSong);
find('#category').addEventListener('change', () => {
  categoryIndex = categories.indexOf(find('#category').value);
  startSong();
});
guess.addEventListener('input', updateGuessButton);
find('#next-song').addEventListener('click', () => {
  startSong();
  listen.focus();
});
find('#previous-category').addEventListener('click', () => changeCategory(-1));
find('#next-category').addEventListener('click', () => changeCategory(1));
find('#volume').addEventListener('input', (event) => {
  if (volume) volume.gain.value = Number(event.target.value) / 100;
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
  const oldCategory = categories[categoryIndex];
  categories = ['Kaikki tyylilajit', ...new Set(songs.map((entry) => entry.category))];
  categoryIndex = Math.max(0, categories.indexOf(oldCategory));
  find('#category').replaceChildren(...categories.map((name) => new Option(name, name)));
  find('#category').value = categories[categoryIndex];
  find('#titles').replaceChildren(...songs.map((entry) => new Option(entry.artist, entry.title)));
  renderCatalog();
}

function renderCatalog() {
  const list = find('#question-list');
  list.replaceChildren();
  if (!songs.length) list.textContent = 'Kappaleita ei ole vielä.';
  const query = normalize(find('#catalog-search').value);
  const matches = songs.filter((entry) => normalize(entry.title + entry.artist).includes(query));
  if (songs.length && !matches.length) list.textContent = 'Ei hakutuloksia.';
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
  const entry = songs.find((item) => String(item.id) === button.dataset.id);
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
    const saved = await request(id === null ? 'POST' : 'PATCH', id, data);
    if (id === null) songs.push(saved);
    else songs = songs.map((entry) => entry.id === id ? saved : entry);
    refreshCatalog();
    startSong();
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
    await request('DELETE', id);
    songs = songs.filter((entry) => entry.id !== id);
    refreshCatalog();
    startSong();
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
    songs = await request();
    refreshCatalog();
    startSong();
    find('#add').disabled = false;
  } catch {
    setFeedback('Kappaleita ei saatu ladattua.');
    setError('#load-error', 'Käynnistä JSON Server README-ohjeen mukaan ja päivitä sivu.');
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
find('#easy-search').checked = settings.easySearch;
guess.setAttribute('list', settings.easySearch ? 'titles' : '');
find('#spotlight').checked = settings.spotlight;
document.body.classList.toggle('no-spotlight', !settings.spotlight);
find('#clip-options').querySelectorAll('input').forEach((input) => { input.checked = clipLengths.includes(Number(input.value)); });
if (!Array.isArray(stats.distribution) || stats.distribution.length !== 5 || stats.distribution.some((n) => !Number.isFinite(n) || n < 0)) stats.distribution = [0, 0, 0, 0, 0];
renderStats();
loadSongs();
