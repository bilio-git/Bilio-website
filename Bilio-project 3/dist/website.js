(() => {
  const toggle = document.querySelector('.view-toggle');
  const home = document.getElementById('home');
  const about = document.getElementById('about');
  const mascot = document.querySelector('.deployer svg');
  const startupDelay = 1200;
  let physics;
  let showingAbout = false;

  function syncMotion() {
    // Keep the wordmark's simulation continuous through the page transition.
    physics?.setPaused(document.hidden);
    mascot.dataset.paused = String(document.hidden || !showingAbout);
  }

  function showAbout(value) {
    showingAbout = value;
    document.body.dataset.view = value ? 'about' : 'home';
    about.classList.toggle('is-active', value);
    home.inert = value;
    about.inert = !value;
    home.setAttribute('aria-hidden', String(value));
    about.setAttribute('aria-hidden', String(!value));
    toggle.setAttribute('aria-expanded', String(value));
    toggle.setAttribute('aria-label', value ? 'Close about page' : 'About Bilio');
    if (value) about.scrollTop = 0;
    syncMotion();
  }

  toggle.addEventListener('click', () => showAbout(!showingAbout));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && showingAbout) {
      showAbout(false);
      toggle.focus({ preventScroll: true });
    }
  });
  document.addEventListener('visibilitychange', syncMotion);
  syncMotion();

  function startWordmark() {
    window.setTimeout(() => {
      physics = BilioPhysics.mount(document.querySelector('.wordmark svg'));
      syncMotion();
    }, startupDelay);
  }

  if (document.readyState === 'complete') startWordmark();
  else window.addEventListener('load', startWordmark, { once: true });
})();
