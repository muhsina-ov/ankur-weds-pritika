/* ==========================================================================
   ANKUR & PRITIKA WEDDING CELEBRATION — JAVASCRIPT ORCHESTRATION
   ========================================================================== */

(function () {
  'use strict';

  // --- Core DOM Elements ---
  const gate = document.querySelector('#gate');
  const enterButton = document.querySelector('#enterButton');
  const bgmAudio = document.querySelector('#bgmAudio');
  const soundToggle = document.querySelector('#soundToggle');
  const petalsContainer = document.querySelector('#petalsContainer');
  const actionDock = document.querySelector('#actionDock');
  const mainNav = document.querySelector('#nav');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let wasPlayingBeforeHidden = false;

  // --- Audio State & Controls ---
  function updateSoundToggleUI(isPlaying) {
    if (!soundToggle) return;
    soundToggle.setAttribute('aria-pressed', String(isPlaying));
    const textElem = soundToggle.querySelector('.sound-toggle__text');
    if (textElem) {
      textElem.textContent = isPlaying ? 'Playing' : 'Sound Off';
    }
  }

  function playBgm() {
    if (!bgmAudio) return;
    bgmAudio.play().then(() => {
      updateSoundToggleUI(true);
    }).catch((err) => {
      console.log('Autoplay blocked or deferred:', err);
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

  // --- Gate Opening Sequence (Google Flow Video Experience) ---
  const gateVideo = document.querySelector('#gateVideo');
  const gateSkip = document.querySelector('#gateSkip');
  const gateContent = document.querySelector('#gateContent');
  let gateTransitioned = false;
  let isOpening = false;

  // Pre-configure mobile video attributes and pre-warm buffers
  if (gateVideo) {
    gateVideo.muted = true;
    gateVideo.defaultMuted = true;
    gateVideo.playsInline = true;
    try {
      gateVideo.load();
    } catch (e) {
      // Ignore initial load error if browser prevents early background loading
    }
  }

  // Pre-warm media on first touch anywhere on the page
  const primeMedia = () => {
    if (gateVideo && gateVideo.paused) {
      gateVideo.muted = true;
      gateVideo.defaultMuted = true;
      try {
        gateVideo.load();
      } catch (e) {}
    }
    window.removeEventListener('touchstart', primeMedia);
    window.removeEventListener('pointerdown', primeMedia);
  };
  window.addEventListener('touchstart', primeMedia, { passive: true, once: true });
  window.addEventListener('pointerdown', primeMedia, { passive: true, once: true });

  function finishGateTransition() {
    if (gateTransitioned) return;
    gateTransitioned = true;

    // Fade out gate overlay
    if (gate) {
      gate.classList.add('is-open');
    }
    if (gateSkip) {
      gateSkip.hidden = true;
    }
    document.body.classList.remove('locked');

    // Hide gate completely from accessibility tree and pause video after fade
    window.setTimeout(() => {
      if (gate) {
        gate.classList.add('is-gone');
        gate.inert = true;
      }
      if (gateVideo) {
        gateVideo.pause();
      }
    }, 1000);
  }

  function openInvitation() {
    if (!gate || gate.classList.contains('is-open') || isOpening) return;
    isOpening = true;

    // Start celebratory audio immediately on explicit user gesture
    playBgm();

    // Fade out the center invitation card to reveal the full video opening
    if (gateContent) {
      gateContent.style.transition = 'opacity 0.6s ease, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)';
      gateContent.style.opacity = '0';
      gateContent.style.transform = 'scale(1.06)';
      gateContent.style.pointerEvents = 'none';
    }

    // Trigger celebratory petal burst
    burstPetals(window.innerWidth / 2, window.innerHeight * 0.45, 24);

    // Show skip button so user can advance immediately if desired
    if (gateSkip) {
      gateSkip.hidden = false;
      gateSkip.addEventListener('click', finishGateTransition, { once: true });
    }

    let transitionTriggered = false;
    const triggerTransition = () => {
      if (transitionTriggered) return;
      transitionTriggered = true;
      finishGateTransition();
    };

    // Safety fallback: guaranteed transition so guests are never trapped if video stalls
    const safetyTimer = window.setTimeout(triggerTransition, 5600);

    if (gateVideo) {
      // Ensure strict mobile WebKit compliance
      gateVideo.muted = true;
      gateVideo.defaultMuted = true;
      gateVideo.playsInline = true;

      const onTimeUpdate = () => {
        // Our optimized video is 5.6s long; trigger seamless crossfade when camera reaches courtyard
        if (gateVideo.currentTime >= 4.8) {
          gateVideo.removeEventListener('timeupdate', onTimeUpdate);
          window.clearTimeout(safetyTimer);
          triggerTransition();
        }
      };

      gateVideo.addEventListener('timeupdate', onTimeUpdate);
      gateVideo.addEventListener('ended', () => {
        window.clearTimeout(safetyTimer);
        triggerTransition();
      }, { once: true });

      // Begin playback
      const playPromise = gateVideo.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          // Playback successfully started
        }).catch((err) => {
          console.warn('Video playback deferred or low-power mode active:', err);
          // If playback was blocked by device power saver, give 1.2s graceful pause before crossfading
          window.setTimeout(() => {
            window.clearTimeout(safetyTimer);
            triggerTransition();
          }, 1200);
        });
      }
    } else {
      triggerTransition();
    }
  }

  if (enterButton) {
    enterButton.addEventListener('click', openInvitation);
    enterButton.addEventListener('touchend', (e) => {
      // Prevent delayed synthetic click on touchscreens
      e.preventDefault();
      openInvitation();
    }, { passive: false });
  }
  const skipLink = document.querySelector('.skip-link');
  if (skipLink) {
    skipLink.addEventListener('click', openInvitation);
  }

  // --- Continuous Gentle Falling Petals ---
  function spawnFallingPetal() {
    if (reduceMotion.matches || !petalsContainer) return;
    // Keep max 18 petals concurrently for pristine 60fps performance
    if (petalsContainer.childElementCount > 18) return;

    const petal = document.createElement('div');
    petal.className = 'floating-petal';

    const size = 20 + Math.random() * 22; // 20px - 42px
    const startX = Math.random() * window.innerWidth;
    const duration = 9 + Math.random() * 8; // 9s - 17s
    const driftX = (Math.random() - 0.5) * 160; // -80px to +80px
    const rotation = (Math.random() - 0.5) * 720;

    petal.style.width = `${size}px`;
    petal.style.height = `${size}px`;
    petal.style.left = `${startX}px`;
    petal.style.animationDuration = `${duration}s`;
    petal.style.setProperty('--drift-x', `${driftX}px`);
    petal.style.setProperty('--rot', `${rotation}deg`);

    petalsContainer.appendChild(petal);

    petal.addEventListener('animationend', () => {
      petal.remove();
    }, { once: true });
  }

  // Start continuous petal stream
  if (!reduceMotion.matches) {
    // Initial batch
    for (let i = 0; i < 8; i++) {
      setTimeout(spawnFallingPetal, i * 400);
    }
    // Recurring interval
    setInterval(spawnFallingPetal, 1400);
  }

  // --- Click Interactive Petal Burst ---
  function burstPetals(x, y, count = 12) {
    if (reduceMotion.matches) return;
    const colors = ['#bfa15f', '#e6c875', '#d47b6a', '#e89888', '#fff5df'];
    
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'burst-petal';
      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.4);
      const distance = 40 + Math.random() * 110;
      const size = 8 + Math.random() * 10;

      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.width = `${size}px`;
      p.style.height = `${size * 1.3}px`;
      p.style.backgroundColor = colors[i % colors.length];
      p.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      p.style.setProperty('--dy', `${Math.sin(angle) * distance + 50}px`);
      p.style.setProperty('--rot', `${Math.random() * 360}deg`);

      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove(), { once: true });
    }
  }

  // Attach burst effect to buttons
  document.addEventListener('click', (e) => {
    const target = e.target.closest('.btn-gold, .btn-whatsapp, .btn-card-map, .calendar-button, .team-btn, .jutti-target');
    if (target) {
      burstPetals(e.clientX, e.clientY, 10);
    }
  });

  // --- Wedding Countdown (04 Dec 2026, 18:00 IST) ---
  const weddingDate = new Date('2026-12-04T18:00:00+05:30').getTime();
  const countdown = {
    days: document.querySelector('#days'),
    hours: document.querySelector('#hours'),
    minutes: document.querySelector('#minutes'),
    seconds: document.querySelector('#seconds')
  };

  function updateCountdown() {
    const now = Date.now();
    const diff = Math.max(0, weddingDate - now);
    const dayMs = 86400000;
    const hourMs = 3600000;
    const minMs = 60000;

    const days = Math.floor(diff / dayMs);
    const hours = Math.floor((diff % dayMs) / hourMs);
    const minutes = Math.floor((diff % hourMs) / minMs);
    const seconds = Math.floor((diff % minMs) / 1000);

    if (countdown.days) countdown.days.textContent = String(days).padStart(3, '0');
    if (countdown.hours) countdown.hours.textContent = String(hours).padStart(2, '0');
    if (countdown.minutes) countdown.minutes.textContent = String(minutes).padStart(2, '0');
    if (countdown.seconds) countdown.seconds.textContent = String(seconds).padStart(2, '0');
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // --- Scroll Progress, Nav Highlighting & Action Dock ---
  let scrollPending = false;
  function onScroll() {
    const offset = window.scrollY;
    const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
    
    if (mainNav) {
      mainNav.style.setProperty('--progress', scrollRange > 0 ? offset / scrollRange : 0);
    }

    if (actionDock) {
      const hero = document.querySelector('#home');
      const rsvp = document.querySelector('#rsvp');
      const heroH = hero ? hero.offsetHeight : 600;
      const rsvpTop = rsvp ? rsvp.getBoundingClientRect().top : 9999;
      
      const shouldShow = offset > heroH * 0.7 && rsvpTop > window.innerHeight * 0.5;
      actionDock.classList.toggle('is-visible', shouldShow);
    }

    // Nav Active Location
    const sections = ['celebrations', 'story', 'fun', 'rsvp'];
    let current = '';
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= 160) {
        current = id;
      }
    });

    if (mainNav) {
      mainNav.querySelectorAll('nav a').forEach(a => {
        if (a.hash === `#${current}`) {
          a.setAttribute('aria-current', 'location');
        } else {
          a.removeAttribute('aria-current');
        }
      });
    }

    scrollPending = false;
  }

  window.addEventListener('scroll', () => {
    if (!scrollPending) {
      requestAnimationFrame(onScroll);
      scrollPending = true;
    }
  }, { passive: true });

  // --- Intersection Observer for Content Reveal ---
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px' });

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

  // --- INTERACTIVE: Team Selector ---
  const teamButtons = document.querySelectorAll('[data-team]');
  const teamWelcome = document.querySelector('#teamWelcome');
  const teamStorageKey = 'ankur-pritika-team-choice';

  function setTeam(team, celebrate = false) {
    if (!['ankur', 'pritika'].includes(team)) return;

    teamButtons.forEach(btn => {
      const match = btn.dataset.team === team;
      btn.setAttribute('aria-pressed', String(match));
      const action = btn.querySelector('.team-btn__action');
      if (action) {
        action.textContent = match ? 'Your Squad ✓' : 'Join Team ↗';
      }
    });

    if (teamWelcome) {
      if (team === 'ankur') {
        teamWelcome.innerHTML = `<strong>TEAM ANKUR · THE BARAATIS</strong><p>Baraat mein swagat hai! Bring your loudest cheer &amp; best bhangra moves.</p>`;
      } else {
        teamWelcome.innerHTML = `<strong>TEAM PRITIKA · THE LADKIWALE</strong><p>Welcome, ladkiwale! Bring your brightest smile and energy for the celebrations!</p>`;
      }
    }

    if (celebrate) {
      try { localStorage.setItem(teamStorageKey, team); } catch (_) {}
    }
  }

  teamButtons.forEach(btn => {
    btn.addEventListener('click', () => setTeam(btn.dataset.team, true));
  });

  try {
    const saved = localStorage.getItem(teamStorageKey);
    if (saved) setTeam(saved, false);
  } catch (_) {}

  // --- Add to Calendar (Prefilled Google Calendar & Google Maps) ---
  function openCalendarEvent(btn) {
    const rawTitle = (btn.dataset.title || "Wedding : Varmala & Vows").replace(/&amp;/g, '&');
    const fullTitle = rawTitle.includes('Ankur') ? rawTitle : `${rawTitle} · Ankur & Pritika`;
    const start = btn.dataset.start || '20261204T123000Z';
    const end = btn.dataset.end || '20261204T183000Z';
    const location = btn.dataset.location || 'The Umrao, Gurgaon';
    const mapUrl = btn.dataset.map || '';

    // Construct rich details with venue map link
    const detailsLines = [
      'Wedding celebrations of Ankur Chauhan & Pritika Khanna.',
      mapUrl ? `📍 Venue Google Maps:\n${mapUrl}` : '',
      'Join us to shower your blessings!'
    ].filter(Boolean).join('\n\n');

    // Build Google Calendar TEMPLATE URL
    const gcalUrl = new URL('https://calendar.google.com/calendar/render');
    gcalUrl.searchParams.set('action', 'TEMPLATE');
    gcalUrl.searchParams.set('text', fullTitle);
    gcalUrl.searchParams.set('dates', `${start}/${end}`);
    gcalUrl.searchParams.set('location', location);
    gcalUrl.searchParams.set('details', detailsLines);

    // Open prefilled Google Calendar event
    window.open(gcalUrl.toString(), '_blank', 'noopener,noreferrer');

    const prev = btn.textContent;
    btn.textContent = 'Opening Calendar... ✓';
    setTimeout(() => { btn.textContent = prev; }, 2200);
  }

  document.querySelectorAll('.calendar-button').forEach(btn => {
    btn.addEventListener('click', () => openCalendarEvent(btn));
  });

})();
