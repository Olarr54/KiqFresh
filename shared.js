// Mobile nav toggle
const burger = document.getElementById('navBurger');
const navLinks = document.querySelector('.nav-links');
if (burger && navLinks) {
  burger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
}

// Smart nav: hide on scroll down, show on scroll up
(function () {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  let lastY = window.scrollY;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const currentY = window.scrollY;
      const menuOpen = navLinks && navLinks.classList.contains('open');
      if (!menuOpen) {
        if (currentY > lastY && currentY > 80) {
          nav.classList.add('nav-hidden');
        } else {
          nav.classList.remove('nav-hidden');
        }
      }
      lastY = currentY;
      ticking = false;
    });
  }, { passive: true });
})();

// Reveal on scroll
const reveals = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });
reveals.forEach(el => revealObserver.observe(el));

// Page transition ink splash
document.querySelectorAll('a[href]').forEach(link => {
  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;
  link.addEventListener('click', e => {
    e.preventDefault();
    document.body.style.transition = 'opacity 0.25s';
    document.body.style.opacity = '0';
    setTimeout(() => { window.location.href = href; }, 260);
  });
});
window.addEventListener('pageshow', () => {
  document.body.style.transition = 'opacity 0.3s';
  document.body.style.opacity = '0';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.style.opacity = '1';
    });
  });
});
