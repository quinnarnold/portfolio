(function () {
  document.addEventListener('click', function (e) {
    var toggle = document.getElementById('nav-toggle');
    var links = document.getElementById('nav-links');
    if (!toggle || !links) return;

    if (e.target.closest('#nav-toggle')) {
      toggle.classList.toggle('open');
      links.classList.toggle('open');
      return;
    }

    if (e.target.closest('.nav-links a')) {
      toggle.classList.remove('open');
      links.classList.remove('open');
    }
  });
})();
