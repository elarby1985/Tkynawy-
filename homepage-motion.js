document.querySelectorAll('.tyk-delivery').forEach(panel => {
  const button = panel.querySelector('.tyk-motion-toggle');
  if (!button) return;
  button.addEventListener('click', () => {
    const paused = panel.classList.toggle('is-paused');
    button.setAttribute('aria-pressed', String(paused));
    button.textContent = paused ? button.dataset.resumeLabel : button.dataset.pauseLabel;
  });
});
