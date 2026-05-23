/* =============================================================
   KiqFresh — Security Module
   Covers: sanitisation · validation · rate limiting ·
           honeypot detection · file upload checks
   ============================================================= */

const KiqSecurity = (() => {

  // ── Sanitise: neutralise characters that can become XSS payloads ──
  function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;')
      .trim()
      .slice(0, 2000);           // hard cap — no field ever sends >2000 chars
  }

  // ── Validators ──
  const validate = {
    // RFC-5321-aware email check
    email: v => {
      const t = v.trim();
      if (!t || t.length > 254) return false;
      return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(t);
    },

    // Name: letters, spaces, hyphens, apostrophes only
    name: v => {
      const t = v.trim();
      return t.length >= 1 && t.length <= 60 && /^[a-zA-ZÀ-ÿ '\-]+$/.test(t);
    },

    // Phone: optional — digits, spaces, +, (), - only
    phone: v => !v.trim() || /^[\d\s+\-(). ]{7,25}$/.test(v.trim()),

    // Free text with a length cap and no script injection
    text: (v, max = 1000) => v.length <= max && !/<script/i.test(v),

    // Shoe type: no HTML, reasonable length
    shoeType: v => {
      const t = v.trim();
      return t.length >= 1 && t.length <= 120 && !/<|>/.test(t);
    },
  };

  // ── Client-side rate limiting via localStorage ──
  function rateLimit(key, maxAttempts, windowMs) {
    const now = Date.now();
    let log = [];
    try { log = JSON.parse(localStorage.getItem('kiq_rl_' + key) || '[]'); } catch {}

    const recent = log.filter(t => now - t < windowMs);

    if (recent.length >= maxAttempts) {
      const wait = Math.ceil((windowMs - (now - recent[0])) / 1000);
      return { allowed: false, wait };
    }

    try {
      localStorage.setItem('kiq_rl_' + key, JSON.stringify([...recent, now]));
    } catch {}

    return { allowed: true };
  }

  // ── Honeypot: bot has checked a hidden checkbox ──
  function honeypotClean(form) {
    const hp = form.querySelector('[name="botcheck"]');
    return !hp || !hp.checked;
  }

  // ── File upload validation ──
  const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  const MAX_FILE_MB   = 10;

  function validateFiles(files) {
    for (const f of Array.from(files)) {
      if (!ALLOWED_TYPES.has(f.type))
        return { ok: false, msg: `"${f.name}" is not a supported format. Please use JPEG, PNG, WebP or GIF.` };
      if (f.size > MAX_FILE_MB * 1024 * 1024)
        return { ok: false, msg: `"${f.name}" is over ${MAX_FILE_MB} MB. Please use a smaller image.` };
    }
    return { ok: true };
  }

  // ── Sanitise every string field in a FormData before it is sent ──
  function cleanFormData(fd) {
    const out = new FormData();
    for (const [k, v] of fd.entries())
      out.append(k, typeof v === 'string' ? sanitize(v) : v);
    return out;
  }

  // ── Inline error banner on a form ──
  function showError(form, msg) {
    let el = form.querySelector('.kiq-sec-err');
    if (!el) {
      el = document.createElement('p');
      el.className = 'kiq-sec-err';
      Object.assign(el.style, {
        color: '#e53', fontWeight: '900', fontSize: '.85rem',
        marginTop: '.75rem', letterSpacing: '.02em', lineHeight: '1.5',
      });
      form.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = 'block';
  }

  function clearError(form) {
    const el = form.querySelector('.kiq-sec-err');
    if (el) el.style.display = 'none';
  }

  return {
    sanitize,
    validate,
    rateLimit,
    honeypotClean,
    validateFiles,
    cleanFormData,
    showError,
    clearError,
  };
})();
