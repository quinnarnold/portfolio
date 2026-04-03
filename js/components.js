(function () {
  var SVG_NS = 'http://www.w3.org/2000/svg';

  var pages = [
    { href: 'research.html', label: 'Research' },
    { href: 'demos.html', label: 'Demos' },
    { href: 'cv.html', label: 'CV' }
  ];

  var current = location.pathname.split('/').pop() || 'index.html';
  var demoSubPages = ['playground.html', 'convolution.html', 'gradient-descent.html'];

  function createSunSVG() {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('class', 'theme-icon-sun');

    var circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '5');
    svg.appendChild(circle);

    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42');
    svg.appendChild(path);

    return svg;
  }

  function createMoonSVG() {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('class', 'theme-icon-moon');

    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
    svg.appendChild(path);

    return svg;
  }

  function buildNav() {
    var el = document.getElementById('nav');
    if (!el) return;

    var container = document.createElement('div');
    container.className = 'container';

    var navName = document.createElement('a');
    navName.href = 'index.html';
    navName.className = 'nav-name';
    navName.textContent = 'Quinn Arnold';

    var navRight = document.createElement('div');
    navRight.className = 'nav-right';

    var navLinks = document.createElement('nav');
    navLinks.className = 'nav-links';
    navLinks.setAttribute('aria-label', 'Main navigation');

    pages.forEach(function (p) {
      var a = document.createElement('a');
      a.href = p.href;
      a.textContent = p.label;
      var isActive = p.href === current ||
        (p.href === 'demos.html' && demoSubPages.indexOf(current) !== -1);
      if (isActive) a.className = 'active';
      navLinks.appendChild(a);
    });

    var themeToggle = document.createElement('button');
    themeToggle.id = 'theme-toggle';
    themeToggle.className = 'theme-toggle';
    themeToggle.setAttribute('aria-label', 'Toggle light/dark theme');
    themeToggle.appendChild(createSunSVG());
    themeToggle.appendChild(createMoonSVG());

    var navToggle = document.createElement('button');
    navToggle.className = 'nav-toggle';
    navToggle.id = 'nav-toggle';
    navToggle.setAttribute('aria-label', 'Toggle navigation');
    navToggle.style.minWidth = '44px';
    navToggle.style.minHeight = '44px';
    for (var i = 0; i < 3; i++) {
      navToggle.appendChild(document.createElement('span'));
    }

    navRight.appendChild(navLinks);
    navRight.appendChild(themeToggle);
    navRight.appendChild(navToggle);

    container.appendChild(navName);
    container.appendChild(navRight);
    el.appendChild(container);
  }

  function buildFooter() {
    var el = document.getElementById('footer');
    if (!el) return;

    var container = document.createElement('div');
    container.className = 'container';

    var text = document.createElement('span');
    text.className = 'footer-text';
    text.textContent = 'Quinn Arnold \u2014 2026';

    var links = document.createElement('div');
    links.className = 'footer-links';

    var emailLink = document.createElement('a');
    emailLink.href = 'mailto:qarnold@bryant.edu';
    emailLink.textContent = 'qarnold@bryant.edu';
    links.appendChild(emailLink);

    var githubLink = document.createElement('a');
    githubLink.href = 'https://github.com/quinnarnold';
    githubLink.textContent = 'GitHub';
    githubLink.target = '_blank';
    githubLink.rel = 'noopener';
    githubLink.setAttribute('aria-label', 'GitHub (opens in new tab)');
    links.appendChild(githubLink);

    var linkedinLink = document.createElement('a');
    linkedinLink.href = 'https://www.linkedin.com/in/quinnkarnold';
    linkedinLink.textContent = 'LinkedIn';
    linkedinLink.target = '_blank';
    linkedinLink.rel = 'noopener';
    linkedinLink.setAttribute('aria-label', 'LinkedIn (opens in new tab)');
    links.appendChild(linkedinLink);

    container.appendChild(text);
    container.appendChild(links);
    el.appendChild(container);
  }

  buildNav();
  buildFooter();
})();
