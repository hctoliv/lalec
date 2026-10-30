(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* intro: uma vez por sessão, ?intro força */
  const intro = $('#intro');
  let seen = false;
  try { seen = sessionStorage.getItem('lalec-intro') === '1'; } catch (e) {}
  const force = /[?&]intro/.test(location.search);
  const ready = () => root.classList.add('ready');
  if ((!seen || force) && !reduce) {
    root.classList.add('intro-on');
    document.body.style.overflow = 'hidden';
    let done = false;
    const end = () => {
      if (done) return; done = true;
      intro.classList.add('out');
      document.body.style.overflow = '';
      setTimeout(ready, 250);
      setTimeout(() => root.classList.remove('intro-on'), 950);
      try { sessionStorage.setItem('lalec-intro', '1'); } catch (e) {}
    };
    setTimeout(end, 2900);
    intro.addEventListener('click', end);
    addEventListener('keydown', end, { once: true });
  } else {
    requestAnimationFrame(ready);
  }

  /* menu */
  const burger = $('#burger');
  burger.addEventListener('click', () => {
    const open = root.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', open);
  });
  $$('#nav a').forEach(a => a.addEventListener('click', () => {
    root.classList.remove('menu-open'); burger.setAttribute('aria-expanded', false);
  }));

  /* toast + copiar */
  const toast = $('#toast');
  let tt;
  const say = msg => { toast.textContent = msg; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('on'), 2200); };
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); }
    catch (e) {
      const t = document.createElement('textarea'); t.value = b.dataset.copy; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch (_) {} t.remove();
    }
    say(b.dataset.copyMsg || 'Copiado');
  }));

  const wa = (num, text) => window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(text), '_blank', 'noopener');

  /* formulários simples → WhatsApp */
  $$('form[data-wa]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const lines = [f.dataset.msg];
    $$('input,select,textarea', f).forEach(i => { if (i.value.trim()) lines.push(i.name + ': ' + i.value.trim()); });
    wa(f.dataset.wa, lines.join('\n'));
  }));

  /* manifesto: palavras que acendem */
  const lit = $('#lit');
  const hl = ['amor', 'cuidado,', 'seguro,', 'carinho.', 'futuro'];
  lit.innerHTML = lit.textContent.trim().split(/\s+/).map(w => `<span class="wd${hl.includes(w.toLowerCase()) ? ' hl' : ''}">${w}</span>`).join(' ');
  const words = $$('.wd', lit);

  /* contadores */
  const fmt = n => n.toLocaleString('pt-BR');
  const countUp = el => {
    if (el.dataset.done) return; el.dataset.done = 1;
    const to = +el.dataset.count, t0 = performance.now(), d = reduce ? 1 : 1600;
    const step = t => { const p = Math.min(1, (t - t0) / d); el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };

  /* reveal + contadores por IO */
  $$('.help-title,.panels,.lead,.foster-facts,.moments .m,.people li,.bazar-copy,.story-copy,.since,.res-top,.partners-head').forEach(el => el.classList.add('rv'));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('on');
    $$('.count', e.target).forEach(countUp);
    if (e.target.matches('.count')) countUp(e.target);
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('.rv,.res-big .count').forEach(el => io.observe(el));

  /* vídeos: carregar perto da tela, pausar fora */
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) {
      if (v.dataset.src && !v.src) { v.src = v.dataset.src; v.preload = 'auto'; }
      if (v.muted) v.play().catch(() => {});
    } else if (v.muted) v.pause();
  }), { rootMargin: '200px 300px' });
  $$('video[muted],video[data-src]').forEach(v => vio.observe(v));

  /* players com som */
  const phones = $$('.phone');
  phones.forEach(p => {
    const v = $('video', p);
    $('.play', p).addEventListener('click', () => {
      if (v.paused) {
        phones.forEach(o => { if (o !== p) { $('video', o).pause(); o.classList.remove('playing'); } });
        v.muted = false; v.play(); p.classList.add('playing');
      } else { v.pause(); p.classList.remove('playing'); }
    });
    v.addEventListener('ended', () => p.classList.remove('playing'));
  });

  /* abas de como ajudar */
  const tabs = $$('#tabs button');
  const showTab = id => {
    tabs.forEach(b => b.setAttribute('aria-selected', b.dataset.tab === id));
    $$('.panel').forEach(p => p.classList.toggle('on', p.dataset.panel === id));
    $$('.panel:not(.on) video').forEach(v => { v.pause(); v.closest('.phone')?.classList.remove('playing'); });
  };
  tabs.forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
  if (location.hash === '#bazar-doar') showTab('itens');

  /* caixa de doação */
  const crate = $('#crate'), crateItems = $('#crateItems'), crateCount = $('#crateCount');
  const picked = new Map();
  $$('#chips button').forEach(b => {
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      const item = b.dataset.item, on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', on);
      if (on) {
        const s = document.createElement('span');
        s.textContent = b.textContent.trim().split(' ')[0];
        crateItems.appendChild(s); picked.set(item, s);
        crate.classList.remove('bump'); void crate.offsetWidth; crate.classList.add('bump');
      } else { picked.get(item)?.remove(); picked.delete(item); }
      const n = picked.size;
      crateCount.textContent = n ? n + (n > 1 ? ' tipos de item' : ' tipo de item') : 'caixa vazia';
    });
  });
  $('#boxForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    if (!picked.size) { say('Escolha pelo menos um tipo de item'); return; }
    const msg = [
      'Olá, Bazar LALEC! Quero doar e gostaria de agendar a retirada.',
      'Itens: ' + [...picked.keys()].join(', '),
      f.obs.value.trim() && 'Detalhes: ' + f.obs.value.trim(),
      'Nome: ' + f.nome.value.trim(),
      'Bairro: ' + f.bairro.value.trim()
    ].filter(Boolean).join('\n');
    wa('5511974576160', msg);
  });

  /* quiz família acolhedora */
  const qs = $$('#quiz input'), qBar = $('#quizBar'), qMsg = $('#quizMsg'), qCta = $('#quizCta');
  const base = 'Olá! Quero saber mais sobre o Serviço de Família Acolhedora da LALEC.';
  const upd = () => {
    const n = qs.filter(i => i.checked).length;
    qBar.style.width = (n / qs.length * 100) + '%';
    if (n === qs.length) {
      qMsg.textContent = 'Você atende aos requisitos básicos! O próximo passo é o cadastro para o processo de seleção.';
      qCta.textContent = 'Quero me cadastrar';
      qCta.href = 'https://wa.me/5511957816572?text=' + encodeURIComponent('Olá! Atendo aos requisitos básicos e quero me cadastrar como Família Acolhedora da LALEC.');
    } else {
      qMsg.textContent = n ? `${n} de ${qs.length} requisitos. Ficou alguma dúvida? Fale com a nossa equipe.` : 'Marque os requisitos para ver se você pode participar.';
      qCta.textContent = 'Quero saber mais';
      qCta.href = 'https://wa.me/5511957816572?text=' + encodeURIComponent(base);
    }
  };
  qs.forEach(i => i.addEventListener('change', upd));

  /* bazar aberto agora? (horário de São Paulo) */
  const badge = $('#openBadge');
  const sp = () => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
    const h = +p.hour + p.minute / 60, wk = !['Sat', 'Sun'].includes(p.weekday);
    const open = wk && h >= 11 && h < 17;
    badge.classList.toggle('open', open);
    badge.textContent = open ? 'Aberto agora, até 17h' : 'Fechado agora · seg a sex, 11h às 17h';
  };
  sp(); setInterval(sp, 60000);

  /* rolagem: um único rAF */
  const hd = $('#hd'), heroArt = $('#heroArt'), house = $('.house', heroArt), sun = $('.sun', heroArt), blobs = $$('.blob', heroArt);
  const tour = $('#casa'), track = $('#tourTrack'), tourBar = $('#tourBar');
  const flow = $('#flow'), fps = $$('.fp', flow), labs = $$('.flow-lab', flow);
  fps.forEach(p => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.dataset.l = L; });
  const work = $$('.ws'), wms = $$('.wm');
  const path = $('#path'), pathFill = $('#pathFill'), steps = $$('#path li');
  const fosterImg = $('.foster-hero img');
  const navLinks = $$('#nav a');
  const secs = navLinks.map(a => $(a.getAttribute('href')));
  let lastY = scrollY, tourW = 0;

  const sizeTour = () => {
    tourW = Math.max(0, track.scrollWidth - innerWidth);
    tour.style.height = (innerHeight + tourW) + 'px';
  };
  sizeTour();
  addEventListener('resize', sizeTour);
  addEventListener('load', sizeTour);

  let px = 0, py = 0;
  if (matchMedia('(pointer:fine)').matches) addEventListener('pointermove', e => { px = e.clientX / innerWidth - .5; py = e.clientY / innerHeight - .5; });

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const frame = () => {
    const y = scrollY, vh = innerHeight;

    hd.classList.toggle('hide', y > lastY && y > 300 && !root.classList.contains('menu-open'));
    hd.classList.toggle('shadow', y > 20);
    lastY = y;

    if (y < vh * 1.2) {
      house.style.transform = `translate3d(${px * -10}px,${y * -.06 + py * -10}px,0)`;
      sun.style.transform = `translate3d(${px * 30}px,${y * -.22 + py * 24}px,0)`;
      blobs[0].style.transform = `translate3d(${px * 22}px,${y * .12 + py * 16}px,0) rotate(${y * .03}deg)`;
      blobs[1].style.transform = `translate3d(${px * -26}px,${y * -.1 + py * -18}px,0)`;
    }

    // manifesto
    const lr = lit.getBoundingClientRect();
    const lp = clamp((vh * .85 - lr.top) / (lr.height + vh * .4));
    const k = Math.round(lp * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < k));

    // tour horizontal
    const tr = tour.getBoundingClientRect();
    const tp = clamp(-tr.top / Math.max(1, tourW));
    track.style.transform = `translate3d(${-tp * tourW}px,0,0)`;
    tourBar.style.transform = `scaleX(${tp})`;

    // fluxo dos 560
    const fr = flow.getBoundingClientRect();
    const fp = clamp((vh - fr.top) / (vh * .75));
    fps.forEach((p, i) => { const q = clamp(fp * 1.25 - i * .12); p.style.strokeDashoffset = p.dataset.l * (1 - q); });
    labs.forEach((l, i) => { if (fp > .55 + i * .12 && !l.classList.contains('on')) { l.classList.add('on'); countUp($('.count', l)); } });

    // trabalho: foto acompanha o passo ativo
    let act = 0;
    work.forEach((w, i) => { const r = w.getBoundingClientRect(); if (r.top < vh * .6) act = i; });
    work.forEach((w, i) => w.classList.toggle('on', i === act));
    wms.forEach((m, i) => m.classList.toggle('on', i === act));

    // família acolhedora parallax
    const fr2 = fosterImg.parentElement.getBoundingClientRect();
    if (fr2.bottom > 0 && fr2.top < vh) fosterImg.style.transform = `translate3d(0,${fr2.top * -.12}px,0)`;

    // caminho da adoção
    const pr = path.getBoundingClientRect();
    const pp = clamp((vh * .65 - pr.top) / pr.height);
    pathFill.style.strokeDashoffset = 1 - pp;
    steps.forEach(s => s.classList.toggle('on', s.getBoundingClientRect().top < vh * .7));

    // menu ativo
    let cur = -1;
    secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < vh * .4) cur = i; });
    navLinks.forEach((a, i) => a.classList.toggle('on', i === cur));

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
