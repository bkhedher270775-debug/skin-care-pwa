if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        console.log('Service Worker enregistré avec succès, scope :', reg.scope);
      })
      .catch((err) => {
        console.error('Échec de l\'enregistrement du Service Worker :', err);
      });
  });
}