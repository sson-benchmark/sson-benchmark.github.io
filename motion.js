/* Optional motion. Every heading, link and section remains usable without it. */
(() => {
  'use strict';

  const root = document.documentElement;
  if (root.dataset.ssonMotionReady === 'true') return;
  root.dataset.ssonMotionReady = 'true';
  const hero = document.querySelector('.hero-backdrop');
  const toggle = document.getElementById('motion-toggle');
  const reveals = Array.from(document.querySelectorAll('[data-reveal]'));
  const headings = Array.from(document.querySelectorAll('[data-letter-reveal]'));
  const preference = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };
  let paused = false;
  let observer = null;
  const headingStates = new WeakMap();

  function finishHeading(heading) {
    // Consumers can subscribe before the animation ends or inspect this state
    // after a reduced-motion/static heading was already made readable.
    heading.classList.add('letters-visible');
    heading.classList.remove('letter-reveal-ready');
    if (heading.dataset.letterRevealComplete === 'true') return;
    const state = headingStates.get(heading);
    if (state) {
      window.clearTimeout(state.fallback);
      heading.removeEventListener('animationend', state.onFinish);
      heading.removeEventListener('animationcancel', state.onFinish);
    }
    heading.dataset.letterRevealComplete = 'true';
    heading.dispatchEvent(new CustomEvent('sson:headingready', {
      bubbles: true, detail: { heading }
    }));
  }

  function watchHeading(heading) {
    const state = headingStates.get(heading);
    if (!state || state.watching || heading.dataset.letterRevealComplete === 'true') return;
    state.watching = true;
    const afterPaint = typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : (callback) => window.setTimeout(callback, 0);
    afterPaint(() => {
      if (heading.dataset.letterRevealComplete === 'true') return;
      if (!state.finalLetter || !heading.classList.contains('letter-reveal-ready')) {
        finishHeading(heading);
        return;
      }
      const style = window.getComputedStyle(state.finalLetter);
      const names = style.animationName.split(',').map((name) => name.trim());
      const durations = style.animationDuration.split(',');
      const delays = style.animationDelay.split(',');
      const milliseconds = (value) => parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000);
      const index = names.indexOf('letter-arrive');
      const end = index < 0 ? 0
        : milliseconds(durations[index % durations.length]) + milliseconds(delays[index % delays.length]);
      // A missing stylesheet, disabled animation, or older browser still leaves
      // the heading readable and releases the video. Normal playback is driven
      // by the final glyph's animationend, not by a guessed fixed delay.
      if (!Number.isFinite(end) || end <= 0) finishHeading(heading);
      else state.fallback = window.setTimeout(() => finishHeading(heading), end + 100);
    });
  }

  function reveal(element) {
    if (element.matches('[data-letter-reveal]')) {
      element.classList.add('letters-visible');
      watchHeading(element);
    }
    if (element.matches('[data-reveal]')) element.classList.add('is-revealed');
    if (observer) observer.unobserve(element);
  }

  function revealAll() {
    reveals.forEach(reveal);
    headings.forEach((heading) => {
      reveal(heading);
      // Removing the animation selector fixes the final state permanently.
      // Resuming motion must never restart the readable headline.
      finishHeading(heading);
    });
    if (observer) observer.disconnect();
  }

  function updateButton() {
    if (!toggle) return;
    toggle.hidden = preference.matches;
    toggle.setAttribute('aria-pressed', String(paused));
    const label = toggle.querySelector('[data-motion-label]');
    (label || toggle).textContent = paused ? 'Resume motion' : 'Pause motion';
  }

  function notifyMotionChange() {
    document.dispatchEvent(new CustomEvent('sson:motionchange', {
      detail: { paused: paused || preference.matches }
    }));
  }

  function updatePreference() {
    root.classList.toggle('motion-reduced', preference.matches);
    if (preference.matches) {
      revealAll();
      if (hero) hero.classList.remove('hero-motion-active');
    } else if (!paused && hero) {
      hero.classList.add('hero-motion-active');
    }
    updateButton();
    notifyMotionChange();
  }

  function revealTarget(target) {
    if (!(target instanceof Element)) return;
    // A focused control must never sit inside a visually hidden ancestor.
    for (let element = target; element; element = element.parentElement) {
      if (element.matches('[data-reveal], [data-letter-reveal]')) reveal(element);
    }
    // Hash links often point to the section that contains its animated heading.
    target.querySelectorAll('[data-reveal], [data-letter-reveal]').forEach(reveal);
  }

  function revealHashTarget() {
    if (!window.location.hash) return;
    try {
      revealTarget(document.getElementById(decodeURIComponent(window.location.hash.slice(1))));
    } catch (_) {
      // A malformed fragment must not prevent ordinary page navigation.
    }
  }

  function prepareHeading(heading) {
    const accessibleText = heading.textContent.replace(/\s+/g, ' ').trim();
    const visual = document.createElement('span');
    visual.className = 'letter-reveal-visual';
    visual.setAttribute('aria-hidden', 'true');
    let letterIndex = 0;

    function copyNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const fragment = document.createDocumentFragment();
        node.textContent.split(/(\s+)/u).filter(Boolean).forEach((part) => {
          if (/^\s+$/u.test(part)) {
            fragment.appendChild(document.createTextNode(part));
            return;
          }
          const word = document.createElement('span');
          word.className = 'reveal-word';
          Array.from(part).forEach((character) => {
            const letter = document.createElement('span');
            letter.className = 'reveal-letter';
            letter.style.setProperty('--letter-index', String(letterIndex++));
            letter.textContent = character;
            word.appendChild(letter);
          });
          fragment.appendChild(word);
        });
        return fragment;
      }
      const clone = node.cloneNode(false);
      node.childNodes.forEach((child) => clone.appendChild(copyNode(child)));
      return clone;
    }

    heading.childNodes.forEach((node) => visual.appendChild(copyNode(node)));
    heading.setAttribute('aria-label', accessibleText);
    heading.replaceChildren(visual);
    const letters = visual.querySelectorAll('.reveal-letter');
    const finalLetter = letters[letters.length - 1];
    function finishLetters(event) {
      if (event.target !== finalLetter || event.animationName !== 'letter-arrive') return;
      finishHeading(heading);
    }
    headingStates.set(heading, { finalLetter, onFinish: finishLetters, watching: false, fallback: null });
    heading.addEventListener('animationend', finishLetters);
    heading.addEventListener('animationcancel', finishLetters);
  }

  try {
    headings.forEach(prepareHeading);
    root.classList.toggle('motion-reduced', preference.matches);
    root.classList.toggle('motion-background', document.hidden);
    updateButton();

    if (preference.matches || typeof window.IntersectionObserver !== 'function') {
      revealAll();
    } else {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) reveal(entry.target);
        });
      }, { rootMargin: '0px 0px -35px 0px', threshold: 0.08 });

      // Preparation and observation happen in one task before the next paint.
      reveals.forEach((element) => element.classList.add('reveal-ready'));
      headings.forEach((heading) => heading.classList.add('letter-reveal-ready'));
      new Set([...reveals, ...headings]).forEach((element) => observer.observe(element));
    }

    const nextFrame = typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : (callback) => window.setTimeout(callback, 0);
    nextFrame(() => {
      if (!preference.matches && !paused && hero) hero.classList.add('hero-motion-active');
    });

    if (toggle) toggle.addEventListener('click', () => {
      paused = !paused;
      root.classList.toggle('motion-paused', paused);
      if (paused) revealAll();
      updateButton();
      notifyMotionChange();
    });

    document.addEventListener('visibilitychange', () => {
      root.classList.toggle('motion-background', document.hidden);
    });
    document.addEventListener('focusin', (event) => revealTarget(event.target));
    window.addEventListener('hashchange', revealHashTarget);
    window.addEventListener('beforeprint', revealAll);
    if (typeof preference.addEventListener === 'function') {
      preference.addEventListener('change', updatePreference);
    } else if (typeof preference.addListener === 'function') {
      preference.addListener(updatePreference);
    }
    revealHashTarget();
  } catch (_) {
    // Motion is decorative. Fail open if a browser lacks an enhancement API.
    reveals.forEach((element) => element.classList.remove('reveal-ready'));
    headings.forEach((heading) => heading.classList.remove('letter-reveal-ready'));
    revealAll();
    root.classList.add('motion-reduced');
    if (toggle) toggle.hidden = true;
  }
})();
