/* Progressive enhancement for the findings. Native details remain usable without JS. */
(() => {
  'use strict';

  const motionPreference = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };
  const controllers = [];
  const motionStopped = () => motionPreference.matches || document.documentElement.classList.contains('motion-paused');

  document.querySelectorAll('details.finding, details.figure-detail').forEach((details) => {
    const summary = details.querySelector('summary');
    const panel = details.querySelector('.finding-panel, .disclosure-panel');
    if (!summary || !panel) return;

    const label = summary.querySelector('.finding-toggle-label');
    const closedLabel = label ? label.textContent : '';
    const openLabel = summary.dataset.openLabel || 'Hide the evidence';
    let targetOpen = details.open;
    let animation = null;
    let revealTimer = null;
    let chartCleanupTimer = null;
    let generation = 0;

    function updateSummary() {
      details.classList.toggle('is-expanded', targetOpen);
      if (label) label.textContent = targetOpen ? openLabel : closedLabel;
    }

    function clearRevealTimer() {
      if (revealTimer !== null) {
        window.clearTimeout(revealTimer);
        revealTimer = null;
      }
    }

    function finishChartEntrance() {
      if (chartCleanupTimer !== null) {
        window.clearTimeout(chartCleanupTimer);
        chartCleanupTimer = null;
      }
      details.querySelectorAll('.bar-chart.chart-enter').forEach((chart) => {
        chart.classList.remove('chart-enter');
      });
    }

    function revealCharts(immediate) {
      if (details.classList.contains('has-revealed')) return;
      clearRevealTimer();
      const reveal = () => {
        revealTimer = null;
        if (!targetOpen) return;
        details.classList.add('has-revealed');
        if (motionStopped()) { finishChartEntrance(); return; }
        details.querySelectorAll('.bar-chart').forEach((chart) => {
          chart.classList.add('chart-enter');
        });
        // Clear the animation class so reopening native details cannot replay it.
        chartCleanupTimer = window.setTimeout(finishChartEntrance, 1700);
      };
      if (immediate || motionStopped()) reveal();
      else revealTimer = window.setTimeout(reveal, 110);
    }

    function stopAnimation() {
      generation += 1;
      if (animation) {
        animation.onfinish = null;
        animation.oncancel = null;
        animation.cancel();
        animation = null;
      }
    }

    function settle(open) {
      targetOpen = open;
      details.open = open;
      panel.style.removeProperty('height');
      panel.style.removeProperty('overflow');
      details.classList.remove('is-animating');
      updateSummary();
      if (!open) {
        clearRevealTimer();
        finishChartEntrance();
      }
    }

    function setOpen(open, immediate = false) {
      const startHeight = details.open ? panel.getBoundingClientRect().height : 0;
      stopAnimation();
      targetOpen = open;
      updateSummary();

      if (!open) {
        clearRevealTimer();
        finishChartEntrance();
      }
      if (immediate || motionStopped() || typeof panel.animate !== 'function') {
        settle(open);
        if (open) revealCharts(true);
        return;
      }

      // Keep the native disclosure open while its content animates closed.
      details.open = true;
      panel.style.height = 'auto';
      const fullHeight = Math.max(panel.getBoundingClientRect().height, panel.scrollHeight);
      panel.style.height = `${startHeight}px`;
      panel.style.overflow = 'hidden';
      details.classList.add('is-animating');
      if (open) revealCharts(false);

      const currentGeneration = generation;
      try {
        animation = panel.animate(
          [{ height: `${startHeight}px` }, { height: `${open ? fullHeight : 0}px` }],
          { duration: open ? 440 : 330, easing: 'cubic-bezier(.22,.68,0,1)', fill: 'forwards' }
        );
        animation.onfinish = () => {
          if (currentGeneration !== generation) return;
          // Remove the animation's filled height after restoring natural layout.
          const completedAnimation = animation;
          animation = null;
          settle(open);
          if (completedAnimation) {
            completedAnimation.onfinish = null;
            completedAnimation.cancel();
          }
        };
      } catch (_) {
        // Unsupported or interrupted animation must never hide the evidence.
        animation = null;
        settle(open);
        if (open) revealCharts(true);
      }
    }

    summary.addEventListener('click', (event) => {
      if (event.defaultPrevented) return;
      const interactive = event.target.closest('a, button, input, select, textarea');
      if (interactive && interactive !== summary) return;
      event.preventDefault();
      setOpen(!targetOpen);
    });

    // Also handle disclosures opened by browser search or external native actions.
    details.addEventListener('toggle', () => {
      if (animation || details.open === targetOpen) return;
      targetOpen = details.open;
      updateSummary();
      if (targetOpen) revealCharts(true);
      else {
        clearRevealTimer();
        finishChartEntrance();
      }
    });

    updateSummary();
    if (targetOpen) revealCharts(true);
    controllers.push({
      isOpen: () => targetOpen,
      setOpen,
      finish: () => {
        stopAnimation();
        settle(targetOpen);
        if (targetOpen) revealCharts(true);
        finishChartEntrance();
      }
    });
  });

  document.addEventListener('sson:motionchange', (event) => {
    if (event.detail && event.detail.paused) controllers.forEach((controller) => controller.finish());
  });

  function motionChanged() {
    if (motionStopped()) controllers.forEach((controller) => controller.finish());
  }
  if (typeof motionPreference.addEventListener === 'function') {
    motionPreference.addEventListener('change', motionChanged);
  } else if (typeof motionPreference.addListener === 'function') {
    motionPreference.addListener(motionChanged);
  }

  // Printed copies include all evidence, then restore the reader's disclosures.
  let printState = null;
  window.addEventListener('beforeprint', () => {
    if (printState) return;
    printState = controllers.map((controller) => controller.isOpen());
    controllers.forEach((controller) => controller.setOpen(true, true));
  });
  window.addEventListener('afterprint', () => {
    if (!printState) return;
    controllers.forEach((controller, index) => controller.setOpen(printState[index], true));
    printState = null;
  });
})();
