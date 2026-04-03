(function () {
  var toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  var root = document.documentElement;
  var stored = localStorage.getItem('theme');

  if (stored) {
    root.setAttribute('data-theme', stored);
  }

  function updateIcon() {
    var isDark = root.getAttribute('data-theme') === 'dark' ||
      (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var sun = toggle.querySelector('.theme-icon-sun');
    var moon = toggle.querySelector('.theme-icon-moon');
    if (sun) sun.style.display = isDark ? 'block' : 'none';
    if (moon) moon.style.display = isDark ? 'none' : 'block';
  }

  toggle.addEventListener('click', function () {
    var current = root.getAttribute('data-theme');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    var next;
    if (!current) {
      next = systemDark ? 'light' : 'dark';
    } else if (current === 'dark') {
      next = 'light';
    } else {
      next = 'dark';
    }

    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateIcon();
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateIcon);
  updateIcon();
})();
