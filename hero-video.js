/* Start the film when the headline has finished revealing. Native controls
   remain available throughout, including when automatic playback is blocked. */
(() => {
  'use strict';

  const video = document.getElementById('sson-video');
  const heading = document.getElementById('hero-video-heading');
  const soundButton = document.getElementById('video-sound-toggle');
  const status = document.getElementById('video-status');
  const directLink = document.getElementById('video-open');
  if (!video || !heading || video.dataset.heroVideoReady === 'true') return;
  video.dataset.heroVideoReady = 'true';

  let headingReady = heading.dataset.letterRevealComplete === 'true';
  let automaticAttempted = false;
  let automaticStarting = false;
  let userControlled = false;
  let deferredByVisibility = false;
  let mediaFailed = false;

  function setStatus(message) {
    if (!status) return;
    status.textContent = message;
    status.hidden = !message;
  }

  function updateSoundButton() {
    if (!soundButton) return;
    soundButton.hidden = mediaFailed || (!video.muted && video.volume > 0);
    soundButton.textContent = 'Turn sound on';
  }

  function reportMediaError() {
    mediaFailed = true;
    if (soundButton) soundButton.hidden = true;
    if (directLink) directLink.hidden = false;
    setStatus('The video could not load. Try opening it directly below.');
  }

  function noteUserControl() {
    // Clicking/using native controls takes priority over scheduled playback.
    // In particular, a deliberate pause must never be undone by this script.
    userControlled = true;
  }

  async function startWhenReady() {
    if (!headingReady || document.hidden || automaticAttempted || automaticStarting || userControlled || mediaFailed) return;
    automaticAttempted = true;
    automaticStarting = true;
    setStatus('');
    try {
      // First request sound. Browsers may allow this for returning visitors or
      // when a previous interaction grants playback permission.
      await video.play();
    } catch (error) {
      if (userControlled || mediaFailed || (error && error.name === 'AbortError')) return;
      if (document.hidden) {
        automaticAttempted = false;
        return;
      }
      if (error && error.name === 'NotAllowedError') {
        // Muted playback is the standard browser-approved fallback. Sound is
        // enabled only by the explicit button or the native volume control.
        video.muted = true;
        updateSoundButton();
        try {
          await video.play();
        } catch (mutedError) {
          if (!userControlled && !mediaFailed && (!mutedError || mutedError.name !== 'AbortError')) {
            setStatus('Press play to watch the video.');
          }
        }
      } else {
        setStatus('The video could not start. Press play to try again.');
      }
    } finally {
      automaticStarting = false;
      // A visibility change may have interrupted a pending play promise. If
      // the tab returned before that promise settled, finish that one deferred
      // start now; ordinary failures are never retried automatically.
      if (!automaticAttempted && !document.hidden) startWhenReady();
    }
  }

  document.addEventListener('sson:headingready', (event) => {
    if (event.target !== heading && (!event.detail || event.detail.heading !== heading)) return;
    headingReady = true;
    startWhenReady();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && automaticStarting && !userControlled) {
      // Do not begin an unheard/unseen film while the page is in another tab.
      deferredByVisibility = !video.paused;
      automaticAttempted = false;
      video.pause();
    } else if (!document.hidden) {
      startWhenReady();
    }
  });

  video.addEventListener('pointerdown', noteUserControl);
  video.addEventListener('keydown', noteUserControl);
  video.addEventListener('play', () => {
    if (document.hidden && automaticStarting && !userControlled) {
      deferredByVisibility = true;
      automaticAttempted = false;
      video.pause();
      return;
    }
    if (!automaticStarting) userControlled = true;
    setStatus('');
    updateSoundButton();
  });
  video.addEventListener('pause', () => {
    if (deferredByVisibility) deferredByVisibility = false;
    else userControlled = true;
  });
  video.addEventListener('volumechange', updateSoundButton);
  video.addEventListener('error', reportMediaError);

  if (soundButton) soundButton.addEventListener('click', () => {
    userControlled = true;
    video.muted = false;
    if (video.volume === 0) video.volume = 1;
    updateSoundButton();
    setStatus('');
    // This call stays inside the click's activation. Turning sound on after
    // the film has ended does not replay it; the native replay button does.
    if (video.paused && !video.ended) {
      const playback = video.play();
      if (playback && typeof playback.catch === 'function') {
        playback.catch((error) => {
          if (!mediaFailed && (!error || error.name !== 'AbortError')) setStatus('Press play to watch the video.');
        });
      }
    }
  });

  // motion.js normally sets the flag or dispatches the completion event. This
  // static fallback also covers a missing motion script or an empty headline.
  if (!heading.classList.contains('letter-reveal-ready')) headingReady = true;
  if (video.error) reportMediaError();
  startWhenReady();
})();
