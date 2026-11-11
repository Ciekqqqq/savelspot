const find = (selector) => document.querySelector(selector);
const clipLengths = [0.1, 0.5, 2, 8, 15];
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
let clipCount = 5;
let stage = 0;
let ended = false;
let selectedId = null;
let audioContext;
let audioSource;
let volume;
let playbackRequest = 0;
const buffers = new Map();
const stats = { played: 0, solved: 0, streak: 0, best: 0 };

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
  listen.setAttribute('aria-label', playing ? 'Pysäytä' : 'Toista ' + seconds(clipLengths[stage]));
}

function stopAudio() {
  playbackRequest++;
  if (audioSource) {
    audioSource.stop();
    audioSource = null;
  }
  updateListenLabel();
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
      updateListenLabel();
    };
    source.start(0, 0, Math.min(clipLengths[stage], buffer.duration));
    audioSource = source;
    updateListenLabel();
  } catch {
    if (ticket === playbackRequest) setFeedback('Äänitiedostoa ei voitu toistaa. Tarkista kappaleen osoite.', 'wrong');
  }
}

function renderStage() {
  const length = clipLengths[stage];
  find('#duration').textContent = seconds(length);
  find('#timeline-label').textContent = seconds(length);
  find('#timeline-fill').style.width = (length / 15 * 100) + '%';
  updateListenLabel();
}

function updateGuessButton() {
  guessButton.textContent = guess.value.trim() ? 'Arvaa' : '⏭ Ohita';
}

function startSong() {
  stopAudio();
  const pool = categoryIndex === 0 ? songs : songs.filter((entry) => entry.category === categories[categoryIndex]);
  let choices = pool.filter((entry) => !playedIds.has(entry.id));
  if (!choices.length) {
    playedIds.clear();
    choices = pool.length > 1 ? pool.filter((entry) => entry.id !== song?.id) : pool;
  }
  song = choices[Math.floor(Math.random() * choices.length)];
  if (song) playedIds.add(song.id);
  stage = 0;
  ended = false;
  find('#reveal').hidden = true;
  guess.value = '';
  guess.disabled = guessButton.disabled = listen.disabled = !song;
  updateGuessButton();
  renderStage();
  setFeedback(song ? '' : 'Lisää kappale valikon Kappaleet-näkymässä.');
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
  setFeedback(correct ? 'Oikein! Tunnistit biisin pätkästä ' + seconds(clipLengths[stage]) + '.' : 'Yritykset loppuivat.', correct ? 'correct' : 'wrong');
  stats.played++;
  if (correct) stats.solved++;
  stats.streak = correct ? stats.streak + 1 : 0;
  stats.best = Math.max(stats.best, stats.streak);
  find('#solved').textContent = stats.solved + ' / ' + stats.played;
  find('#streak').textContent = stats.streak;
  find('#best').textContent = stats.best;
  find('#next-song').focus();
}

find('#guess-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!song || ended) return;
  stopAudio();
  const submitted = guess.value.trim();
  const validTitles = [song.title, ...(song.aliases || '').split(',')].map(normalize).filter(Boolean);
  if (submitted && validTitles.includes(normalize(submitted))) {
    finishSong(true);
    return;
  }
  if (stage + 1 >= clipCount) {
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
  find('#category').textContent = categories[categoryIndex];
  playedIds.clear();
  startSong();
}

listen.addEventListener('click', playClip);
guess.addEventListener('input', updateGuessButton);
find('#next-song').addEventListener('click', () => {
  startSong();
  listen.focus();
});
find('#previous-category').addEventListener('click', () => changeCategory(-1));
find('#next-category').addEventListener('click', () => changeCategory(1));
find('#volume').addEventListener('input', (event) => {
  if (volume) volume.gain.value = Number(event.target.value) / 100;
});
find('#theme').addEventListener('change', (event) => {
  document.documentElement.dataset.theme = event.target.value;
});
document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => showView(button.dataset.view));
});
document.querySelectorAll('#difficulty button').forEach((button) => {
  button.addEventListener('click', () => {
    const selected = Number(button.dataset.clips);
    if (selected === clipCount) return;
    find('#difficulty [aria-pressed="true"]').setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-pressed', 'true');
    clipCount = selected;
    startSong();
  });
});

function refreshCatalog() {
  const oldCategory = categories[categoryIndex];
  categories = ['Kaikki tyylilajit', ...new Set(songs.map((entry) => entry.category))];
  categoryIndex = Math.max(0, categories.indexOf(oldCategory));
  find('#category').textContent = categories[categoryIndex];
  find('#titles').replaceChildren(...songs.map((entry) => new Option(entry.title)));
  const list = find('#question-list');
  list.replaceChildren();
  if (!songs.length) list.textContent = 'Kappaleita ei ole vielä.';
  for (const entry of songs) {
    const card = document.createElement('article');
    const title = document.createElement('h3');
    const subtitle = document.createElement('p');
    title.textContent = entry.title;
    subtitle.textContent = entry.artist + ' · ' + entry.category;
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
    card.append(title, subtitle, actions);
    list.append(card);
  }
}

function openEditor(entry = null) {
  selectedId = entry?.id ?? null;
  questionForm.reset();
  setError('#save-error');
  find('#editor-heading').textContent = entry ? 'Muokkaa kappaletta' : 'Lisää kappale';
  if (entry) {
    for (const field of questionForm.querySelectorAll('input')) field.value = entry[field.name] ?? '';
  }
  editor.showModal();
}

find('#add').addEventListener('click', () => openEditor());
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
  if (/^audio\/[\w.-]+\.(mp3|wav|ogg|m4a)$/i.test(value)) return true;
  try { return new URL(value).protocol === 'https:'; }
  catch { return false; }
}

questionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(questionForm));
  for (const key of Object.keys(data)) data[key] = data[key].trim();
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
    if (!song || song.id === id) startSong();
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
    if (song?.id === id) startSong();
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

loadSongs();
