const gate = document.querySelector('#gate');
const enterButton = document.querySelector('#enterButton');
const bgmAudio = document.querySelector('#bgmAudio');
const soundToggle = document.querySelector('#soundToggle');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let wasPlayingBeforeHidden = false;

function updateSoundToggleUI(isPlaying) {
  if (!soundToggle) return;
  soundToggle.setAttribute('aria-pressed', String(isPlaying));
  const textElem = soundToggle.querySelector('.sound-toggle__text');
  if (textElem) {
    textElem.textContent = isPlaying ? 'Music playing · Mute' : 'Sound off · Play wedding music';
  } else {
    soundToggle.textContent = isPlaying ? 'Music playing · Mute' : 'Sound off · Play wedding music';
  }
}

function playBgm() {
  if (!bgmAudio) return;
  const welcomeAudio = document.querySelector('#coupleWelcome');
  if (welcomeAudio && !welcomeAudio.paused) {
    welcomeAudio.pause();
  }
  bgmAudio.play().then(() => {
    updateSoundToggleUI(true);
  }).catch((err) => {
    console.log('Audio autoplay deferred until explicit interaction:', err);
    updateSoundToggleUI(false);
  });
}

function pauseBgm() {
  if (!bgmAudio) return;
  bgmAudio.pause();
  updateSoundToggleUI(false);
}

function toggleBgm() {
  if (!bgmAudio) return;
  if (bgmAudio.paused) {
    playBgm();
  } else {
    pauseBgm();
  }
}

if (soundToggle) {
  soundToggle.addEventListener('click', toggleBgm);
}

document.addEventListener('visibilitychange', () => {
  if (!bgmAudio) return;
  if (document.hidden) {
    if (!bgmAudio.paused) {
      wasPlayingBeforeHidden = true;
      bgmAudio.pause();
    }
  } else {
    if (wasPlayingBeforeHidden) {
      bgmAudio.play().catch(() => {});
      wasPlayingBeforeHidden = false;
    }
  }
});

window.addEventListener('pagehide', () => {
  if (bgmAudio) bgmAudio.pause();
});

const invitationSurfaces = [...document.querySelectorAll('main, .nav, footer, .action-dock')];
invitationSurfaces.forEach(surface => { surface.inert = true; });

function openInvitation() {
  if (gate.classList.contains('is-open')) return;
  gate.classList.add('is-open');
  document.body.classList.add('invitation-open');
  invitationSurfaces.forEach(surface => { surface.inert = false; });
  document.body.classList.remove('locked');
  burstPetals(window.innerWidth / 2, window.innerHeight * 0.42, 28);
  playBgm();
  window.setTimeout(() => {
    gate.classList.add('is-gone');
    gate.inert = true;
    const heading = document.querySelector('.hero h2');
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }, reduceMotion.matches ? 0 : 2200);
}

enterButton.addEventListener('click', openInvitation);
document.querySelector('.skip-link').addEventListener('click', openInvitation);

const weddingDate = new Date('2026-12-04T18:00:00+05:30').getTime();
const countdown = {
  days: document.querySelector('#days'),
  hours: document.querySelector('#hours'),
  minutes: document.querySelector('#minutes'),
  seconds: document.querySelector('#seconds')
};

function setCountdownValue(element, value) {
  if (element.textContent === value) return;
  element.textContent = value;
  element.classList.remove('flip');
  void element.offsetWidth;
  element.classList.add('flip');
}

function updateCountdown() {
  const remaining = Math.max(0, weddingDate - Date.now());
  const day = 86_400_000;
  setCountdownValue(countdown.days, String(Math.floor(remaining / day)).padStart(3, '0'));
  setCountdownValue(countdown.hours, String(Math.floor((remaining % day) / 3_600_000)).padStart(2, '0'));
  setCountdownValue(countdown.minutes, String(Math.floor((remaining % 3_600_000) / 60_000)).padStart(2, '0'));
  setCountdownValue(countdown.seconds, String(Math.floor((remaining % 60_000) / 1000)).padStart(2, '0'));
}

updateCountdown();
window.setInterval(updateCountdown, 1000);

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px' });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

function escapeIcs(value) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function downloadCalendar(button) {
  const title = button.dataset.title;
  const start = button.dataset.start;
  const end = button.dataset.end;
  const location = button.dataset.location;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ankur and Pritika//Wedding Invitation//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${start}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}@ankur-pritika`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(title)}`,
    `LOCATION:${escapeIcs(location)}`,
    'DESCRIPTION:Wedding celebration of Ankur Chauhan and Pritika Khanna',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  button.textContent = 'Calendar saved';
  window.setTimeout(() => { button.textContent = button.classList.contains('calendar-button--dock') ? 'Save the date' : 'Add to calendar'; }, 1800);
}

document.querySelectorAll('.calendar-button').forEach((button) => {
  button.addEventListener('click', () => downloadCalendar(button));
});

const petalLayer = document.querySelector('#petalLayer');

function burstPetals(x, y, count = 10) {
  if (reduceMotion.matches) return;
  const colors = ['#d89a26', '#b82d54', '#f1c84b', '#8c1f34', '#fff0cf'];
  for (let index = 0; index < count; index += 1) {
    const petal = document.createElement('span');
    const angle = (Math.PI * 2 * index) / count + Math.random() * .5;
    const distance = 38 + Math.random() * 120;
    petal.className = 'petal';
    petal.style.left = `${x}px`;
    petal.style.top = `${y}px`;
    petal.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    petal.style.setProperty('--dy', `${Math.sin(angle) * distance + 70}px`);
    petal.style.setProperty('--rot', `${Math.random() * 180}deg`);
    petal.style.setProperty('--size', `${7 + Math.random() * 9}px`);
    petal.style.setProperty('--petal', colors[index % colors.length]);
    petalLayer.appendChild(petal);
    petal.addEventListener('animationend', () => petal.remove(), { once: true });
  }
}

document.querySelectorAll('.rsvp__button, .calendar-button').forEach(control => {
  control.addEventListener('pointerdown', event => burstPetals(event.clientX, event.clientY, 8), { passive: true });
});

const actionDock = document.querySelector('.action-dock');
// Reveal each room as a complete composition, with native scrolling preserved.
const roomObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-in-view');
      roomObserver.unobserve(entry.target);
    }
  });
}, { threshold: .1 });
document.querySelectorAll('.event').forEach(room => roomObserver.observe(room));

const mainNavigation = document.querySelector('#nav');
const heroImage = document.querySelector('.hero__image');
const hero = document.querySelector('.hero');
let scrollPending = false;
function updateScrollScene() {
  const offset = window.scrollY;
  const range = document.documentElement.scrollHeight - window.innerHeight;
  mainNavigation.style.setProperty('--progress', range > 0 ? offset / range : 0);
  mainNavigation.classList.toggle('is-scrolled', offset > 70);
  actionDock.classList.toggle('is-visible',
    !document.body.classList.contains('locked') &&
    offset > hero.offsetHeight * .7 &&
    document.querySelector('#rsvp').getBoundingClientRect().top > window.innerHeight * .6
  );
  if (soundToggle) soundToggle.classList.toggle('is-floating', offset > hero.offsetHeight * .4);
  if (!reduceMotion.matches && offset < hero.offsetHeight) {
    heroImage.style.transform = `translate3d(0, ${offset * .18}px, 0) scale(1.06)`;
  }
  const sectionIds = ['story', 'celebrations', 'venues', 'rsvp'];
  let active = '';
  for (const id of sectionIds) {
    if (document.getElementById(id).getBoundingClientRect().top <= 180) active = id;
  }
  mainNavigation.querySelectorAll('nav a').forEach(link => {
    if (link.hash === `#${active}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  scrollPending = false;
}
window.addEventListener('scroll', () => {
  if (!scrollPending) {
    requestAnimationFrame(updateScrollScene);
    scrollPending = true;
  }
}, { passive: true });
window.addEventListener('resize', updateScrollScene, { passive: true });
reduceMotion.addEventListener('change', () => {
  if (reduceMotion.matches) heroImage.style.transform = 'none';
  updateScrollScene();
});
updateScrollScene();

const lights = document.querySelector('.hero__fireflies');
for (let i = 0; i < 16; i++) {
  const light = document.createElement('i');
  light.className = 'firefly';
  light.style.left = `${12 + (i * 31 % 80)}%`;
  light.style.top = `${15 + (i * 17 % 65)}%`;
  light.style.setProperty('--delay', `${-i * .73}s`);
  lights.appendChild(light);
}

const showerButton = document.querySelector('#petalButton');
let showerTimer;
showerButton.addEventListener('click', () => {
  if (showerTimer) return;
  const scene = showerButton.closest('.baraat-procession');
  document.querySelector('#petalResponse').textContent = 'A little more love for Ankur & Pritika!';
  scene.classList.add('celebrating');
  for (let i = 0; i < 5; i++) {
    setTimeout(() => burstPetals(window.innerWidth * (.15 + i * .175), window.innerHeight * .3, 22), i * 150);
  }
  showerTimer = setTimeout(() => { scene.classList.remove('celebrating'); showerTimer = undefined; }, 3000);
});

const jaggoGame = document.querySelector('.jaggo-game');
const lampButtons = [...document.querySelectorAll('.lamp-button')];
const jaggoStatus = document.querySelector('#jaggoStatus');
const jaggoReset = document.querySelector('#jaggoReset');
lampButtons.forEach((button, index) => button.addEventListener('click', () => {
  if (button.getAttribute('aria-pressed') === 'true') return;
  button.setAttribute('aria-pressed', 'true');
  button.setAttribute('aria-label', `Lamp ${index + 1} lit`);
  const lit = lampButtons.filter(lamp => lamp.getAttribute('aria-pressed') === 'true').length;
  jaggoStatus.textContent = `${lit} of 3 lamps lit`;
  if (lit === 3) {
    jaggoGame.classList.add('is-lit');
    jaggoStatus.textContent = 'All 3 lamps lit. Hun nacho! Let the celebration begin.';
    jaggoReset.hidden = false;
    const rect = button.getBoundingClientRect();
    burstPetals(rect.left + rect.width / 2, rect.top, 28);
  }
}));
jaggoReset.addEventListener('click', () => {
  lampButtons.forEach((button, index) => {
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `Light lamp ${index + 1}`);
  });
  jaggoGame.classList.remove('is-lit');
  jaggoStatus.textContent = '0 of 3 lamps lit';
  lampButtons[0].focus();
  jaggoReset.hidden = true;
});
const juttiFind = document.querySelector('#juttiFind');
juttiFind.addEventListener('click', () => {
  if (juttiFind.classList.contains('is-found')) return;
  juttiFind.classList.add('is-found');
  juttiFind.setAttribute('aria-label', 'You found Ankur’s juttis');
  document.querySelector('#juttiHint').textContent = 'Found them! Pehle shagun, phir jutti.';
  document.querySelector('#juttiReward').hidden = false;
  const rect = juttiFind.getBoundingClientRect();
  burstPetals(rect.left + rect.width / 2, rect.top, 26);
});

const teamButtons = [...document.querySelectorAll('[data-team]')];
const teamWelcome = document.querySelector('#teamWelcome');
const teamStorageKey = 'ankur-pritika-wedding-team';
function chooseTeam(team, celebrate = false) {
  if (!['ankur', 'pritika'].includes(team)) return;
  teamButtons.forEach(button => {
    const selected = button.dataset.team === team;
    button.setAttribute('aria-pressed', String(selected));
    button.querySelector('.team-option__action').textContent = selected ? 'Your team ✓' : 'Count me in ↗';
  });
  const badge = document.createElement('strong');
  badge.textContent = team === 'ankur' ? 'TEAM ANKUR · BARAATI SQUAD' : 'TEAM PRITIKA · LADKIWALE';
  const message = document.createElement('p');
  message.textContent = team === 'ankur' ? 'Baraat mein swagat hai! Bring your best moves.' : 'Welcome, ladkiwale! Keep an eye on those juttis.';
  teamWelcome.replaceChildren(badge, message);
  if (celebrate) {
    try { localStorage.setItem(teamStorageKey, team); } catch { /* Selection remains usable for this visit. */ }
    const rect = teamButtons.find(button => button.dataset.team === team).getBoundingClientRect();
    burstPetals(rect.left + rect.width / 2, rect.top + rect.height / 2, 20);
  }
}
teamButtons.forEach(button => button.addEventListener('click', () => chooseTeam(button.dataset.team, true)));
try { chooseTeam(localStorage.getItem(teamStorageKey)); } catch { /* Storage may be unavailable. */ }
const welcomeConfig = window.inviteWelcome;
if (welcomeConfig?.audioSrc && welcomeConfig?.transcript) {
  const welcomeAudio = document.querySelector('#coupleWelcome');
  welcomeAudio.src = welcomeConfig.audioSrc;
  document.querySelector('#voiceTranscript p').textContent = welcomeConfig.transcript;
  document.querySelector('#voiceWelcome').hidden = false;
  welcomeAudio.addEventListener('play', pauseBgm);
  soundToggle.addEventListener('click', () => welcomeAudio.pause());
  document.addEventListener('visibilitychange', () => { if (document.hidden) welcomeAudio.pause(); });
  welcomeAudio.addEventListener('error', () => { document.querySelector('#voiceError').hidden = false; });
}
