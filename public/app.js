const find = (selector) => document.querySelector(selector);
const answers = find('#answers');
const hintButton = find('#hint');
const nextButton = find('#next');
const editor = find('#editor');
const questionForm = find('#question-form');
const deleteDialog = find('#delete-dialog');
const deleteForm = find('#delete-form');

let questions = [];
let round = [];
let questionIndex = 0;
let points = 0;
let correct = 0;
let answered = false;
let hintUsed = false;
let selectedId = null;

async function request(method = 'GET', id = null, data = null) {
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

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function showView(name) {
  document.querySelectorAll('main > section').forEach((section) => {
    section.hidden = section.id !== name;
  });
  document.querySelectorAll('nav button').forEach((button) => {
    if (button.dataset.view === name) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  find('#' + name + '-heading').focus();
}

function setError(selector, message = '') {
  const element = find(selector);
  element.textContent = message;
  element.hidden = !message;
}

function startRound() {
  round = shuffle(questions).slice(0, 5);
  questionIndex = 0;
  points = 0;
  correct = 0;
  renderQuestion();
}

function renderQuestion() {
  const question = round[questionIndex];
  answered = false;
  hintUsed = false;
  answers.replaceChildren();
  find('#feedback').textContent = '';
  find('#hint-text').hidden = true;
  nextButton.hidden = true;
  hintButton.hidden = !question;
  hintButton.removeAttribute('aria-disabled');

  if (!question) {
    find('#progress').textContent = 'Musiikkivisa';
    find('#clue').textContent = 'Lisää kysymys Kysymykset-näkymässä.';
    return;
  }

  find('#progress').textContent = 'Kysymys ' + (questionIndex + 1) + ' / ' + round.length + ' · ' + question.category;
  find('#clue').textContent = question.clue;
  for (const option of shuffle([question.answer, question.wrong1, question.wrong2])) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = option;
    answers.append(button);
  }
}

function renderQuestionList() {
  const list = find('#question-list');
  list.replaceChildren();
  if (!questions.length) {
    list.textContent = 'Kysymyksiä ei ole vielä.';
    return;
  }
  for (const question of questions) {
    const card = document.createElement('article');
    const heading = document.createElement('h3');
    const clue = document.createElement('p');
    const actions = document.createElement('div');
    heading.textContent = question.answer + ' · ' + question.category;
    clue.textContent = question.clue;
    actions.className = 'actions';
    for (const [label, action] of [['Muokkaa', 'edit'], ['Poista', 'delete']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.dataset.action = action;
      button.dataset.id = question.id;
      button.setAttribute('aria-label', label + ' kysymystä: ' + question.answer);
      actions.append(button);
    }
    card.append(heading, clue, actions);
    list.append(card);
  }
}

function openEditor(question = null) {
  selectedId = question ? question.id : null;
  questionForm.reset();
  setError('#save-error');
  find('#editor-heading').textContent = question ? 'Muokkaa kysymystä' : 'Lisää kysymys';
  if (question) {
    for (const field of questionForm.querySelectorAll('input')) {
      field.value = question[field.name];
    }
  }
  editor.showModal();
}

document.querySelectorAll('nav button').forEach((button) => {
  button.addEventListener('click', () => showView(button.dataset.view));
});

hintButton.addEventListener('click', () => {
  if (hintUsed) return;
  hintUsed = true;
  const hint = find('#hint-text');
  hint.textContent = round[questionIndex].hint;
  hint.hidden = false;
  hintButton.setAttribute('aria-disabled', 'true');
});

answers.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || answered) return;

  answered = true;
  const answer = round[questionIndex].answer;
  const isCorrect = button.textContent === answer;
  const earned = isCorrect ? (hintUsed ? 1 : 2) : 0;
  points += earned;
  if (isCorrect) correct++;

  for (const option of answers.children) {
    option.setAttribute('aria-disabled', 'true');
    if (option.textContent === answer) option.classList.add('correct');
  }
  if (!isCorrect) button.classList.add('incorrect');
  find('#feedback').textContent = isCorrect
    ? 'Oikein! +' + earned + ' p.'
    : 'Oikea vastaus on ' + answer + '.';
  hintButton.hidden = true;
  nextButton.textContent = questionIndex + 1 === round.length ? 'Katso tulos' : 'Seuraava';
  nextButton.hidden = false;
});

nextButton.addEventListener('click', () => {
  if (questionIndex + 1 < round.length) {
    questionIndex++;
    renderQuestion();
    find('#play-heading').focus();
    return;
  }
  find('#result').textContent = 'Oikein ' + correct + ' / ' + round.length +
    '. Pisteet ' + points + ' / ' + (2 * round.length) + '.';
  showView('results');
});

find('#restart').addEventListener('click', () => {
  startRound();
  showView('play');
});
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
  const question = questions.find((item) => String(item.id) === button?.dataset.id);
  if (!question) return;
  if (button.dataset.action === 'edit') {
    openEditor(question);
    return;
  }
  selectedId = question.id;
  find('#delete-label').textContent = question.answer;
  setError('#delete-error');
  deleteDialog.showModal();
});

questionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(questionForm));
  for (const key of Object.keys(data)) data[key] = data[key].trim();
  const alternatives = [data.answer, data.wrong1, data.wrong2].map((value) => value.toLowerCase());
  if (new Set(alternatives).size !== 3) {
    setError('#save-error', 'Anna kolme erilaista vastausvaihtoehtoa.');
    return;
  }
  const id = selectedId;
  const submit = event.submitter;
  submit.disabled = true;
  find('#cancel-edit').disabled = true;
  setError('#save-error');
  try {
    const saved = await request(id === null ? 'POST' : 'PATCH', id, data);
    if (id === null) questions.push(saved);
    else questions = questions.map((question) => question.id === id ? saved : question);
    renderQuestionList();
    if (!round.length) startRound();
    editor.close();
    find('#add').focus();
  } catch {
    setError('#save-error', 'Tallennus epäonnistui. Tarkista, että JSON Server on käynnissä.');
  } finally {
    submit.disabled = false;
    find('#cancel-edit').disabled = false;
  }
});

deleteForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = selectedId;
  const submit = event.submitter;
  submit.disabled = true;
  find('#cancel-delete').disabled = true;
  setError('#delete-error');
  try {
    await request('DELETE', id);
    questions = questions.filter((question) => question.id !== id);
    renderQuestionList();
    deleteDialog.close();
    find('#add').focus();
  } catch {
    setError('#delete-error', 'Poisto epäonnistui. Tarkista, että JSON Server on käynnissä.');
  } finally {
    submit.disabled = false;
    find('#cancel-delete').disabled = false;
  }
});

async function loadQuestions() {
  find('#add').disabled = true;
  try {
    questions = await request();
    renderQuestionList();
    startRound();
    find('#add').disabled = false;
  } catch {
    find('#clue').textContent = 'Kysymyksiä ei saatu ladattua.';
    setError('#load-error', 'Käynnistä JSON Server README-ohjeen mukaan ja päivitä sivu.');
  }
}

loadQuestions();
