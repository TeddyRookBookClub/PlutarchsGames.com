/* Light or dark: follows the device unless the player picked one (remembered in this browser). Runs in <head> so there is no flash. */
(function () {
  var d = document.documentElement, k = 'pg-theme', saved = null;
  try { saved = localStorage.getItem(k); } catch (e) {}
  function sys() { return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  d.dataset.theme = saved || sys();
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.pg-theme');
    if (!b) return;
    var next = d.dataset.theme === 'dark' ? 'light' : 'dark';
    d.dataset.theme = next;
    try { localStorage.setItem(k, next); } catch (e2) {}
  });
})();
