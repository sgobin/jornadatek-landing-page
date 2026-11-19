const config = window.JORNADA_CONFIG || {};

// Menu mobile
const toggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('#menu');
function closeMenu() {
  if (!menu || !toggle) return;
  menu.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
}
if (toggle && menu) {
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });
}

// Vídeo oficial sob demanda
const video = document.querySelector('#official-video');
if (video && config.videoUrl) {
  video.src = config.videoUrl;
}

// Sobrescrita opcional dos links sociais via config.js (progressive enhancement)
Object.entries(config.socialLinks || {}).forEach(([key, url]) => {
  const el = document.querySelector(`[data-social="${key}"]`);
  if (!el || !url || !/^https:\/\//.test(url)) return;
  if (el.tagName === 'A') {
    el.href = url;
  } else {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', el.getAttribute('aria-label') || key);
    link.innerHTML = el.innerHTML;
    el.replaceWith(link);
  }
});

// Captura de parâmetros UTM para atribuição de campanha
const params = new URLSearchParams(window.location.search);
const utmData = {
  utm_source: params.get('utm_source') || undefined,
  utm_medium: params.get('utm_medium') || undefined,
  utm_campaign: params.get('utm_campaign') || undefined,
  utm_content: params.get('utm_content') || undefined,
  utm_term: params.get('utm_term') || undefined,
};

// Formulário de leads
const form = document.querySelector('#lead-form');
if (form) {
  const phone = form.elements.phone;
  const statusEl = document.querySelector('#form-status');
  const submitBtn = form.querySelector('[type=submit]');

  function setStatus(message, type = '') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = type ? `is-${type}` : '';
  }

  phone.addEventListener('input', () => {
    const d = phone.value.replace(/\D/g, '').slice(0, 11);
    phone.value =
      d.length > 10
        ? d.replace(/^(\d{2})(\d{5})(\d{0,4})$/, '($1) $2-$3')
        : d.length > 6
          ? d.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3')
          : d.length > 2
            ? `(${d.slice(0, 2)}) ${d.slice(2)}`
            : d;
  });

  function validate(field) {
    let error = '';
    const value = field.value.trim();
    if (field.name === 'name' && !/^\S+\s+\S+/.test(value)) {
      error = 'Informe seu nome completo.';
    }
    if (field.name === 'farm' && value.length < 2) {
      error = 'Informe o nome da sua fazenda.';
    }
    if (field.name === 'city' && value.length < 3) {
      error = 'Informe sua cidade e estado.';
    }
    if (field.name === 'phone' && !/^[1-9]{2}\d{8,9}$/.test(value.replace(/\D/g, ''))) {
      error = 'Informe um telefone com DDD válido.';
    }
    field.setAttribute('aria-invalid', String(Boolean(error)));
    const errEl = document.getElementById(`${field.id}-error`);
    if (errEl) errEl.textContent = error;
    return !error;
  }

  ['name', 'farm', 'city', 'phone'].forEach(key => {
    const field = form.elements[key];
    if (!field) return;
    field.addEventListener('blur', () => validate(field));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validate(field);
    });
  });

  let sending = false;
  let sent = false;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending || sent) return;

    const fields = ['name', 'farm', 'city', 'phone'].map(k => form.elements[k]).filter(Boolean);
    const checks = fields.map(validate);
    if (checks.includes(false)) {
      fields[checks.indexOf(false)].focus();
      return;
    }

    if (!config.leadEndpoint) {
      setStatus(
        'O recebimento de solicitações ainda não está disponível neste site. Seus dados não foram enviados.',
        'error'
      );
      return;
    }

    sending = true;
    submitBtn.disabled = true;
    setStatus('Enviando sua solicitação…', 'loading');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const payload = {
        name: form.elements.name.value.trim(),
        farm: form.elements.farm ? form.elements.farm.value.trim() : '',
        city: form.elements.city.value.trim(),
        phone: phone.value.replace(/\D/g, ''),
        source: 'jornadatek',
        company_website: form.elements.company_website ? form.elements.company_website.value : '',
        page_url: window.location.href,
        referrer: document.referrer || undefined,
        ...utmData,
      };

      // Google Apps Script exige text/plain para evitar preflight CORS (OPTIONS).
      const isAppsScript = /script\.google\.com/i.test(config.leadEndpoint);
      const response = await fetch(config.leadEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': isAppsScript ? 'text/plain;charset=utf-8' : 'application/json',
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
        signal: controller.signal,
      });

      if (!response.ok) {
        let serverError = 'Falha no recebimento';
        try {
          const errJson = await response.json();
          if (errJson && errJson.error) serverError = errJson.error;
        } catch {
          // ignore JSON parse error
        }
        throw new Error(serverError);
      }

      try {
        const data = await response.json();
        if (data && data.ok === false) {
          throw new Error(data.error || 'Falha no recebimento');
        }
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message && parseErr.name !== 'SyntaxError') {
          throw parseErr;
        }
      }

      sent = true;
      setStatus(
        'Solicitação recebida! Nossa equipe entrará em contato para avaliar a visita. O envio não confirma o agendamento.',
        'success'
      );
      submitBtn.textContent = 'Solicitação enviada';
      form.reset();
    } catch (err) {
      const msg =
        err && err.name === 'AbortError'
          ? 'Tempo limite excedido ao enviar. Verifique sua conexão e tente novamente.'
          : 'Não foi possível confirmar o recebimento. Tente novamente em instantes.';
      setStatus(msg, 'error');
    } finally {
      clearTimeout(timeout);
      sending = false;
      submitBtn.disabled = sent;
    }
  });
}

// Movimento progressivo: o conteúdo permanece visível sem JavaScript.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const runningCounters = new Map();
const counters = [...document.querySelectorAll('.numbers strong')];
const targets = new Map(counters.map(el => [el, Number(el.textContent.replace(/\D/g, ''))]));

function finishCounters() {
  runningCounters.forEach(id => cancelAnimationFrame(id));
  runningCounters.clear();
  counters.forEach(el => {
    el.textContent = `+${targets.get(el)}`;
  });
}

function countUp(el) {
  const target = targets.get(el);
  el.setAttribute('aria-label', `Mais de ${target}`);
  const start = performance.now();
  function frame(now) {
    if (motionPreference.matches) {
      finishCounters();
      return;
    }
    const progress = Math.min((now - start) / 1700, 1);
    el.textContent = `+${Math.round(target * (1 - Math.pow(1 - progress, 3)))}`;
    if (progress < 1) runningCounters.set(el, requestAnimationFrame(frame));
    else runningCounters.delete(el);
  }
  runningCounters.set(el, requestAnimationFrame(frame));
}

if ('IntersectionObserver' in window && !motionPreference.matches) {
  const numbersSection = document.querySelector('.numbers');
  if (numbersSection) {
    const numbersObserver = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          counters.forEach(countUp);
          numbersObserver.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    numbersObserver.observe(numbersSection);
  }

  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll('.card, .steps article, .split-heading, .video-section h2').forEach((el, i) => {
    el.classList.add('reveal-on-scroll');
    el.style.setProperty('--reveal-delay', `${(i % 3) * 90}ms`);
    revealObserver.observe(el);
  });
}

motionPreference.addEventListener('change', () => {
  if (motionPreference.matches) {
    finishCounters();
    document.querySelectorAll('.reveal-on-scroll').forEach(el => el.classList.add('is-revealed'));
    document.querySelectorAll('.click-ripple').forEach(el => el.remove());
  }
});

// A primeira etapa funciona como um atalho real ao formulário.
const firstStep = document.querySelector('.steps article');
if (firstStep) {
  const stepLink = document.createElement('a');
  stepLink.href = '#formulario';
  stepLink.className = 'step-link';
  stepLink.setAttribute('aria-label', 'Preencha o formulário — ir para inscrição');
  while (firstStep.firstChild) stepLink.append(firstStep.firstChild);
  firstStep.append(stepLink);
}

let arrivalTimer;
document.querySelectorAll('a[href="#formulario"]').forEach(link => {
  link.addEventListener('click', () => {
    if (!form) return;
    clearTimeout(arrivalTimer);
    form.classList.remove('form-arrival');
    if (!motionPreference.matches) {
      arrivalTimer = setTimeout(() => {
        form.classList.add('form-arrival');
        form.addEventListener('animationend', () => form.classList.remove('form-arrival'), { once: true });
      }, 450);
    }
  });
});

document.querySelectorAll('.button, .step-link').forEach(button => {
  button.addEventListener('click', event => {
    if (motionPreference.matches) return;
    button.querySelectorAll('.click-ripple').forEach(el => el.remove());
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'click-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    const size = Math.max(rect.width, rect.height) * 2;
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${(event.detail ? event.clientX - rect.left : rect.width / 2) - size / 2}px`;
    ripple.style.top = `${(event.detail ? event.clientY - rect.top : rect.height / 2) - size / 2}px`;
    button.append(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });
});
