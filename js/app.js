/* Minha Dieta — app em JavaScript puro. Os dados ficam salvos no aparelho (localStorage). */
(function () {
  'use strict';

  // ---------- Base de alimentos e nutrientes ----------
  const DB = window.DB;
  const REFS = DB.refs;
  const CATS = Object.fromEntries(DB.categorias.map(c => [c.id, c.nome]));
  const MACROS = [
    { k: 'kcal', n: 'Calorias', c: 'Kcal', u: 'kcal' },
    { k: 'proteina_g', n: 'Proteína', c: 'Prot', u: 'g' },
    { k: 'gordura_g', n: 'Gordura', c: 'Gord', u: 'g' },
    { k: 'carboidrato_g', n: 'Carboidrato', c: 'Carb', u: 'g' },
    { k: 'fibra_g', n: 'Fibra', c: 'Fibra', u: 'g' },
  ];
  const MICROS = Object.entries(REFS).map(([k, r]) => ({ k, n: r.nome, u: r.unidade, ref: r.ref }));
  const NUTS = [...MACROS, ...MICROS];
  const NUT = Object.fromEntries(NUTS.map(n => [n.k, n]));
  const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const DIAS_C = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const TIPOS_ROT = { sol: 'Sol', treino: 'Treino', outro: 'Outro' };

  // ---------- Utilidades ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const clone = o => JSON.parse(JSON.stringify(o));
  const fmt = (v, d) => {
    if (v == null || isNaN(v)) return '–';
    const dec = d ?? (Math.abs(v) >= 10 ? 0 : 1);
    return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: dec });
  };
  const H = 36e5, DIA_MS = 864e5;
  const isoDe = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dataDe = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  const somaDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const hoje = () => isoDe(new Date());
  const dow = d => (d.getDay() + 6) % 7; // 0 = segunda
  const inicioSemana = d => somaDias(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -dow(d));
  const quando = (ts, comDia = true) => {
    const d = new Date(ts), h = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (!comDia) return h;
    const diff = Math.round((dataDe(isoDe(d)) - dataDe(hoje())) / DIA_MS);
    const dia = diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : diff === -1 ? 'ontem' : `${DIAS_C[dow(d)].toLowerCase()} ${d.getDate()}/${d.getMonth() + 1}`;
    return `${dia}, ${h}`;
  };
  const duracao = h => { h = Math.max(0, h); const hh = Math.floor(h), mm = Math.floor((h - hh) * 60); return hh >= 1 ? `${hh}h ${String(mm).padStart(2, '0')}m` : `${mm}m`; };
  const tituloData = iso => { const d = dataDe(iso); return `${DIAS[dow(d)]}, ${d.getDate()} de ${MESES[d.getMonth()]}`; };
  const localInput = ts => { const d = new Date(ts); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

  // ---------- Ícones de interface ----------
  const ICO = {
    sol: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
    treino: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>',
    outro: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2.5"/></svg>',
    jejum: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M10 2.5h4"/></svg>',
    prato: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/></svg>',
    mais: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    play: '<svg viewBox="0 0 24 24" class="fill"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
    stop: '<svg viewBox="0 0 24 24" class="fill"><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg>',
    voltar: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    seta: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    lixo: '<svg viewBox="0 0 24 24"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/></svg>',
    fechar: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    ajuste: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  };

  // ---------- Modelos de refeição e dietas recomendadas ----------
  const MODELOS = {
    cafe_ovos: ['Café da manhã', '08:00', [['ovo', 200], ['manteiga', 15], ['queijo-minas', 30], ['mamao', 150]], 'Ovos, queijo e mamão'],
    cafe_queijo: ['Café da manhã', '08:00', [['ovo', 150], ['queijo-minas', 60], ['abacate', 150]], 'Ovos, queijo e abacate'],
    cafe_forte: ['Café da manhã', '07:30', [['ovo', 200], ['clara', 100], ['queijo-minas', 40], ['kiwi', 75]], 'Café alto em proteína'],
    almoco_contra: ['Almoço', '12:30', [['contrafile', 300], ['batata-doce', 200], ['brocolis', 150], ['manteiga', 15]], 'Contrafilé com batata-doce'],
    almoco_alcatra: ['Almoço', '12:30', [['alcatra', 300], ['mandioquinha', 200], ['couve', 100], ['tomate', 100], ['azeite', 15]], 'Alcatra com mandioquinha'],
    almoco_figado: ['Almoço', '12:30', [['figado', 150], ['cebola', 80], ['batata', 200], ['espinafre', 100], ['abacate', 100], ['manteiga', 20]], 'Fígado acebolado'],
    almoco_cordeiro: ['Almoço', '12:30', [['cordeiro', 300], ['abobora', 250], ['rucula', 60], ['azeite', 15]], 'Cordeiro com abóbora'],
    almoco_alta: ['Almoço', '12:30', [['alcatra', 300], ['batata-doce', 150], ['aspargo', 100]], 'Alcatra 300 g'],
    almoco_fibra: ['Almoço', '12:30', [['fraldinha', 250], ['couve-bruxelas', 200], ['batata-doce', 200], ['salsa', 10], ['azeite', 15]], 'Fraldinha com couve-de-bruxelas'],
    lanche_iogurte: ['Lanche', '16:00', [['iogurte', 170], ['morango', 100], ['chia', 15]], 'Iogurte, morango e chia'],
    lanche_castanhas: ['Lanche', '16:00', [['castanha-para', 10], ['nozes', 20], ['laranja', 130]], 'Castanhas e laranja'],
    lanche_fibra: ['Lanche', '16:00', [['goiaba', 150], ['iogurte', 170], ['linhaca', 15]], 'Goiaba, iogurte e linhaça'],
    jantar_patinho: ['Jantar', '19:30', [['patinho', 250], ['abobrinha', 150], ['cenoura', 100], ['abacate', 100], ['manteiga', 20]], 'Patinho com legumes'],
    jantar_ovos: ['Jantar', '19:30', [['ovo', 250], ['espinafre', 100], ['tomate', 100], ['parmesao', 30], ['manteiga', 10]], 'Omelete de espinafre'],
    jantar_musculo: ['Jantar', '19:30', [['musculo', 300], ['mandioca', 200], ['repolho', 120], ['manteiga', 15]], 'Músculo com mandioca'],
    jantar_alta: ['Jantar', '19:30', [['patinho', 300], ['brocolis', 200], ['ricota', 80]], 'Patinho 300 g com brócolis'],
    jantar_fibra: ['Jantar', '19:30', [['ovo', 200], ['quiabo', 150], ['berinjela', 150], ['queijo-minas', 40], ['azeite', 15]], 'Ovos com quiabo e berinjela'],
    pre_jejum: ['Pré-jejum', '19:00', [['picanha', 350], ['gema', 51], ['manteiga', 30], ['tutano', 40], ['abacate', 150], ['couve', 60]], 'Pré-jejum para 1 a 2 dias'],
    pre_jejum_forte: ['Pré-jejum', '19:00', [['costela', 400], ['ovo', 100], ['gema', 51], ['manteiga', 40], ['cheddar', 50], ['abacate', 150], ['brocolis', 80]], 'Pré-jejum para 3 dias ou mais'],
    quebra: ['Quebra do jejum', '12:00', [['ovo', 100], ['abacate', 80], ['patinho', 120], ['abobrinha', 100]], 'Quebra do jejum, leve'],
  };
  const ref = (key, hora) => { const [nome, h, it] = MODELOS[key]; return { id: uid(), nome, hora: hora || h, feito: false, itens: it.map(([a, g]) => ({ a, g })) }; };
  const sol = (min = 20, hora = '09:00') => ({ id: uid(), tipo: 'sol', min, hora, nota: '', feito: false });
  const treino = (min, nota, hora = '17:30') => ({ id: uid(), tipo: 'treino', min, hora, nota, feito: false });
  const mus = () => treino(45, 'Musculação'), cam = () => treino(30, 'Caminhada', '07:00');
  const D = (refs, rot) => ({ refeicoes: refs.map(k => ref(k)), rotina: rot });

  const RECS = [
    { id: 'rec-equilibrio', nome: 'Base equilibrada', desc: 'Três refeições por dia com carne vermelha, ovos, tubérculos e vegetais. Fígado uma vez na semana.', jejum: [], dias: [
      D(['cafe_ovos', 'almoco_contra', 'jantar_patinho'], [sol(), mus()]),
      D(['cafe_queijo', 'almoco_alcatra', 'jantar_ovos'], [sol(), cam()]),
      D(['cafe_ovos', 'almoco_figado', 'jantar_musculo'], [sol(), mus()]),
      D(['cafe_queijo', 'almoco_cordeiro', 'jantar_patinho'], [sol(), cam()]),
      D(['cafe_ovos', 'almoco_contra', 'jantar_ovos'], [sol(), mus()]),
      D(['cafe_queijo', 'almoco_alcatra', 'lanche_castanhas', 'jantar_musculo'], [sol(30), cam()]),
      D(['almoco_cordeiro', 'jantar_patinho'], [sol(30)]),
    ] },
    { id: 'rec-proteina', nome: 'Alta proteína', desc: 'Perto de 200 g de proteína por dia, para ganhar ou manter músculo com treino forte.', jejum: [], dias: [
      D(['cafe_forte', 'almoco_alta', 'jantar_alta'], [sol(), mus()]),
      D(['cafe_forte', 'almoco_contra', 'lanche_iogurte', 'jantar_alta'], [sol(), mus()]),
      D(['cafe_forte', 'almoco_alta', 'jantar_musculo'], [sol(), cam()]),
      D(['cafe_forte', 'almoco_alta', 'jantar_alta'], [sol(), mus()]),
      D(['cafe_forte', 'almoco_figado', 'lanche_iogurte', 'jantar_alta'], [sol(), mus()]),
      D(['cafe_forte', 'almoco_cordeiro', 'jantar_alta'], [sol(30), cam()]),
      D(['cafe_queijo', 'almoco_alta', 'jantar_patinho'], [sol(30)]),
    ] },
    { id: 'rec-fibras', nome: 'Fibras e micronutrientes', desc: 'Mais verduras, frutas e sementes ao lado da carne, para subir fibra, vitamina C, K e folato.', jejum: [], dias: [
      D(['cafe_ovos', 'almoco_fibra', 'lanche_fibra', 'jantar_fibra'], [sol(), mus()]),
      D(['cafe_queijo', 'almoco_alcatra', 'lanche_iogurte', 'jantar_ovos'], [sol(), cam()]),
      D(['cafe_ovos', 'almoco_figado', 'lanche_fibra', 'jantar_fibra'], [sol(), mus()]),
      D(['cafe_queijo', 'almoco_fibra', 'lanche_castanhas', 'jantar_patinho'], [sol(), cam()]),
      D(['cafe_ovos', 'almoco_cordeiro', 'lanche_fibra', 'jantar_fibra'], [sol(), mus()]),
      D(['cafe_queijo', 'almoco_fibra', 'lanche_iogurte', 'jantar_musculo'], [sol(30), cam()]),
      D(['almoco_alcatra', 'lanche_fibra', 'jantar_ovos'], [sol(30)]),
    ] },
    { id: 'rec-jejum2', nome: 'Jejum de 2 dias', desc: 'Pré-jejum gordo na terça às 19 h. Quarta e quinta sem comer. Quebra leve na sexta ao meio-dia (cerca de 65 h).', jejum: [{ dia: 1, hora: '20:00', horas: 64 }], dias: [
      D(['almoco_contra', 'jantar_patinho'], [sol(), mus()]),
      D(['almoco_alcatra', 'pre_jejum'], [sol(), cam()]),
      D([], [sol(), cam()]),
      D([], [sol(), cam()]),
      D(['quebra', 'jantar_musculo'], [sol()]),
      D(['cafe_queijo', 'almoco_cordeiro', 'jantar_patinho'], [sol(30), mus()]),
      D(['cafe_queijo', 'almoco_contra', 'jantar_ovos'], [sol(30)]),
    ] },
    { id: 'rec-jejum4', nome: 'Jejum de 4 dias', desc: 'Pré-jejum forte no domingo às 19 h, jejum de segunda a quinta e quebra leve na sexta ao meio-dia (cerca de 112 h).', jejum: [{ dia: 6, hora: '20:00', horas: 112 }], dias: [
      D([], [sol(), cam()]),
      D([], [sol(), cam()]),
      D([], [sol(), cam()]),
      D([], [sol()]),
      D(['quebra', 'jantar_patinho'], [sol()]),
      D(['cafe_ovos', 'almoco_contra', 'lanche_castanhas', 'jantar_musculo'], [sol(30), mus()]),
      D(['cafe_queijo', 'almoco_alcatra', 'pre_jejum_forte'], [sol(30)]),
    ] },
  ];

  // ---------- Estado ----------
  const KEY = 'minha-dieta.v2';
  let S;
  function estadoInicial() {
    const s = { v: 2, metas: { kcal: 2400, proteina_g: 170, gordura_g: 150, carboidrato_g: 120, fibra_g: 30 }, dias: {}, jejuns: [], dietas: [], custom: [], exemplo: true };
    aplicarDieta(RECS[3], inicioSemana(new Date()), true, s);
    return s;
  }
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  if (!S || S.v !== 2) S = estadoInicial();
  const salvar = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* armazenamento indisponível */ } };

  const alimentos = () => [...DB.alimentos, ...S.custom];
  const FOOD = id => alimentos().find(f => f.id === id);
  const diaDe = iso => S.dias[iso] || { refeicoes: [], rotina: [] };
  const diaEdit = iso => (S.dias[iso] = S.dias[iso] || { refeicoes: [], rotina: [] });

  // ---------- Cálculos ----------
  const valor = (f, k) => !f ? 0 : k in f ? (f[k] || 0) : (f.micro?.[k] || 0);
  function soma(itens) {
    const t = Object.fromEntries(NUTS.map(n => [n.k, 0]));
    for (const it of itens) { const f = FOOD(it.a); if (f) for (const n of NUTS) t[n.k] += valor(f, n.k) * it.g / 100; }
    return t;
  }
  const totalDia = (iso, soFeito) => soma(diaDe(iso).refeicoes.filter(r => !soFeito || r.feito).flatMap(r => r.itens));
  const minutos = (iso, tipo, soFeito) => diaDe(iso).rotina.filter(r => r.tipo === tipo && (!soFeito || r.feito)).reduce((s, r) => s + (+r.min || 0), 0);
  const pct = (v, ref) => ref ? Math.round(v / ref * 100) : 0;
  const fimJ = j => j.fim || j.fimPrev;
  const jejumAtivo = () => S.jejuns.find(j => !j.fim && j.inicio <= Date.now());
  const proxJejum = () => S.jejuns.filter(j => j.inicio > Date.now()).sort((a, b) => a.inicio - b.inicio)[0];
  const jejunsDoDia = iso => { const a = dataDe(iso).getTime(), b = a + DIA_MS; return S.jejuns.filter(j => j.inicio < b && fimJ(j) > a); };
  const horasJejumDia = iso => { const a = dataDe(iso).getTime(), b = a + DIA_MS; return jejunsDoDia(iso).reduce((s, j) => s + (Math.min(b, j.fim || (j.inicio <= Date.now() && !j.fim ? Math.min(Date.now(), j.fimPrev) : j.fimPrev)) - Math.max(a, j.inicio)) / H, 0); };
  const iconeDe = r => FOOD([...r.itens].sort((x, y) => (valor(FOOD(y.a), 'kcal') * y.g) - (valor(FOOD(x.a), 'kcal') * x.g))[0]?.a);

  function aplicarDieta(dt, segunda, substituir, s = S) {
    for (let k = 0; k < 7; k++) {
      const iso = isoDe(somaDias(segunda, k)), src = dt.dias[k];
      const novo = { refeicoes: src.refeicoes.map(r => ({ ...clone(r), id: uid(), feito: false })), rotina: src.rotina.map(r => ({ ...r, id: uid(), feito: false })) };
      if (substituir || !s.dias[iso]) s.dias[iso] = novo;
      else { s.dias[iso].refeicoes.push(...novo.refeicoes); s.dias[iso].rotina.push(...novo.rotina); }
    }
    const ini = segunda.getTime(), fim = ini + 7 * DIA_MS;
    if (substituir) s.jejuns = s.jejuns.filter(j => !(j.inicio >= ini && j.inicio < fim && j.inicio > Date.now()));
    for (const j of dt.jejum || []) {
      const d = somaDias(segunda, j.dia), [hh, mm] = j.hora.split(':').map(Number); d.setHours(hh, mm, 0, 0);
      s.jejuns.push({ id: uid(), inicio: d.getTime(), fimPrev: d.getTime() + j.horas * H, fim: null });
    }
  }

  // ---------- Componentes ----------
  const foto = (f, cls = '') => f?.img ? `<img class="ph ${cls}" src="${f.img}" alt="" loading="lazy" decoding="async">` : `<span class="ph ph-x ${cls}">${esc((f?.nome || '?')[0])}</span>`;
  const icone = (n, cls = '') => `<span class="ico ${cls}">${ICO[n]}</span>`;
  const range = (id, min, max, step, val, act, extra = '') => `<input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}" data-act="${act}" style="--p:${((val - min) / (max - min) * 100).toFixed(1)}%" ${extra}>`;
  const resumoMacros = t => `${fmt(t.kcal, 0)} kcal · ${fmt(t.proteina_g, 0)} g prot`;
  function barrasMacros(t, mult = 1) {
    return `<div class="macros">${MACROS.map(m => { const meta = (S.metas[m.k] || 0) * mult, p = pct(t[m.k], meta);
      return `<div class="mac m-${m.k}"><div class="mac-h"><span>${m.n}</span><b>${fmt(t[m.k], 0)}<small> / ${fmt(meta, 0)} ${m.u}</small></b></div><span class="bar"><i style="width:${Math.min(100, p)}%"></i></span></div>`; }).join('')}</div>`;
  }
  function listaMicros(t, mult = 1, soComValor = false) {
    const L = MICROS.map(m => ({ ...m, v: t[m.k], p: pct(t[m.k], m.ref * mult) })).filter(m => !soComValor || m.v > 0).sort((a, b) => b.p - a.p);
    if (!L.length) return '<p class="muted">Sem vitaminas e minerais listados.</p>';
    return `<div class="micros">${L.map(m => `<div class="mic ${m.p >= 100 ? 'ok' : m.p < 40 ? 'low' : ''}"><span>${m.n}</span><span class="muted">${fmt(m.v)} ${m.u}</span><b>${m.p}%</b><span class="bar"><i style="width:${Math.min(100, m.p)}%"></i></span></div>`).join('')}</div>`;
  }

  // ---------- Rotas ----------
  let rota = 'hoje', diaRota = null;
  const TABS = ['hoje', 'calendario', 'alimentos', 'dietas', 'resumo'];
  function render() {
    const h = (location.hash || '').slice(1);
    if (/^dia-\d{4}-\d{2}-\d{2}$/.test(h)) { rota = 'dia'; diaRota = h.slice(4); }
    else rota = TABS.includes(h) || h === 'metas' ? h : 'hoje';
    $$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === (rota === 'dia' ? 'calendario' : rota)));
    const v = { hoje: () => vDia(hoje(), true), dia: () => vDia(diaRota), calendario: vCalendario, alimentos: vAlimentos, dietas: vDietas, resumo: vResumo, metas: vMetas }[rota];
    $('#main').innerHTML = v();
    $('#fab').hidden = !(rota === 'hoje' || rota === 'dia');
    tick();
  }

  // ----- Dia (Hoje e qualquer data do calendário) -----
  function vDia(iso, ehHoje = false) {
    const d = diaDe(iso), t = totalDia(iso), feito = totalDia(iso, true);
    const passado = iso < hoje();
    const refs = [...d.refeicoes].sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));
    const rot = [...d.rotina].sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));
    return `
    <header class="head">
      ${ehHoje ? '' : `<a class="back" href="#calendario" aria-label="Voltar ao calendário">${ICO.voltar}</a>`}
      <div class="head-t"><p class="eyebrow">${ehHoje ? 'Hoje' : passado ? 'Dia passado' : iso === hoje() ? 'Hoje' : 'Planejado'}</p><h1>${tituloData(iso)}</h1></div>
      <a class="icon-btn" href="#metas" aria-label="Metas e dados">${ICO.ajuste}</a>
    </header>
    ${cartaoJejum(iso, ehHoje)}
    <button class="stats" data-act="nutrientes" data-iso="${iso}" aria-label="Ver nutrientes do dia">
      <span><b>${fmt(t.kcal, 0)}</b><small>kcal</small></span>
      <span><b>${fmt(t.proteina_g, 0)}</b><small>g proteína</small></span>
      <span><b>${fmt(t.gordura_g, 0)}</b><small>g gordura</small></span>
      <span class="go">${ICO.seta}</span>
    </button>
    ${d.refeicoes.some(r => r.feito) ? `<p class="muted small center">Comido até agora: ${resumoMacros(feito)}</p>` : ''}
    <section class="group">
      <h2 class="label">Refeições</h2>
      ${refs.length ? `<div class="rows">${refs.map(r => { const tt = soma(r.itens);
        return `<div class="row-item ${r.feito ? 'done' : ''}">
          <button class="row-main" data-act="abrirRef" data-iso="${iso}" data-id="${r.id}">${foto(iconeDe(r))}<span class="row-t"><b>${esc(r.nome)}</b><small>${esc(r.hora || '')}${r.hora ? ' · ' : ''}${fmt(tt.kcal, 0)} kcal · ${r.itens.length} ${r.itens.length === 1 ? 'item' : 'itens'}</small></span></button>
          <button class="tick" data-act="feitoRef" data-iso="${iso}" data-id="${r.id}" aria-pressed="${r.feito}" aria-label="${r.feito ? 'Desmarcar' : 'Marcar como comida'}">${ICO.check}</button></div>`; }).join('')}</div>`
        : `<p class="empty">${jejunsDoDia(iso).length ? 'Dia de jejum, sem refeições.' : 'Nenhuma refeição.'}</p>`}
    </section>
    <section class="group">
      <h2 class="label">Rotina</h2>
      ${rot.length ? `<div class="rows">${rot.map(r => `<div class="row-item ${r.feito ? 'done' : ''}">
          <button class="row-main" data-act="abrirRot" data-iso="${iso}" data-id="${r.id}">${icone(r.tipo, 't-' + r.tipo)}<span class="row-t"><b>${TIPOS_ROT[r.tipo]} · ${r.min} min</b><small>${esc([r.hora, r.nota].filter(Boolean).join(' · '))}</small></span></button>
          <button class="tick" data-act="feitoRot" data-iso="${iso}" data-id="${r.id}" aria-pressed="${r.feito}" aria-label="${r.feito ? 'Desmarcar' : 'Marcar como feito'}">${ICO.check}</button></div>`).join('')}</div>`
        : '<p class="empty">Sem sol ou treino.</p>'}
    </section>
    <div class="fab-space"></div>`;
  }

  function cartaoJejum(iso, ehHoje) {
    const ativo = jejumAtivo(), prox = proxJejum();
    let j = ehHoje ? (ativo || (prox && prox.inicio - Date.now() < 2 * DIA_MS ? prox : null)) : jejunsDoDia(iso)[0];
    if (!j) {
      if (!ehHoje) return '';
      return `<section class="fast idle"><div class="fast-row"><button class="play" data-act="comecarJejum" aria-label="Começar jejum agora">${ICO.play}</button>
        <div class="fast-t"><b>Começar jejum agora</b><small>Ou planeje um para depois</small></div><button class="pill" data-act="planejarJejum">Planejar</button></div></section>`;
    }
    const now = Date.now(), total = (j.fimPrev - j.inicio) / H;
    const estado = j.fim ? 'feito' : j.inicio > now ? 'futuro' : 'ativo';
    const decorrido = estado === 'ativo' ? (now - j.inicio) / H : estado === 'feito' ? (j.fim - j.inicio) / H : 0;
    const p = Math.min(1, decorrido / total), R = 52, C = 2 * Math.PI * R;
    return `<section class="fast ${estado}" data-jejum="${j.id}">
      <div class="fast-ring">
        <svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="gr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--red)"/><stop offset="1" stop-color="var(--orange)"/></linearGradient></defs>
          <circle cx="60" cy="60" r="${R}" class="ring-bg"/><circle cx="60" cy="60" r="${R}" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}" id="ringFg" data-c="${C}"/></svg>
        <div class="ring-c">${estado === 'futuro' ? `<small>começa em</small><b id="jTempo">${duracao((j.inicio - now) / H)}</b>` : estado === 'feito' ? `<small>jejum de</small><b>${duracao(decorrido)}</b>` : `<small>em jejum há</small><b id="jTempo">${duracao(decorrido)}</b>`}</div>
      </div>
      <div class="fast-info">
        <div><small>Começo</small><b>${quando(j.inicio)}</b></div>
        <div><small>${estado === 'feito' ? 'Terminou' : 'Fim previsto'}</small><b>${quando(fimJ(j))}</b></div>
        <div><small>${estado === 'ativo' ? 'Faltam' : estado === 'feito' ? 'Meta' : 'Duração'}</small><b id="jFalta">${estado === 'ativo' ? duracao((j.fimPrev - now) / H) : fmt(total, 0) + ' h'}</b></div>
      </div>
      <div class="fast-act">
        ${estado === 'ativo' ? `<button class="btn ghost" data-act="encerrarJejum" data-id="${j.id}">${ICO.stop} Encerrar</button>` : ''}
        <button class="btn ghost" data-act="editarJejum" data-id="${j.id}">Editar</button>
      </div>
    </section>`;
  }
  let timer;
  function tick() {
    clearInterval(timer);
    const upd = () => {
      const el = $('[data-jejum]'); if (!el) return clearInterval(timer);
      const j = S.jejuns.find(x => x.id === el.dataset.jejum); if (!j || j.fim) return;
      const now = Date.now(), total = (j.fimPrev - j.inicio) / H;
      if (j.inicio > now) { $('#jTempo') && ($('#jTempo').textContent = duracao((j.inicio - now) / H)); return; }
      const dec = (now - j.inicio) / H;
      $('#jTempo') && ($('#jTempo').textContent = duracao(dec));
      $('#jFalta') && ($('#jFalta').textContent = duracao((j.fimPrev - now) / H));
      const r = $('#ringFg'); if (r) r.setAttribute('stroke-dashoffset', r.dataset.c * (1 - Math.min(1, dec / total)));
    };
    upd(); timer = setInterval(upd, 20000);
  }

  // ----- Calendário -----
  let mesCal = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();
  function vCalendario() {
    const ini = inicioSemana(mesCal), m = mesCal.getMonth(), cells = [];
    for (let k = 0; k < 42; k++) { const d = somaDias(ini, k); if (k >= 35 && d.getMonth() !== m) break; cells.push(d); }
    const ativo = jejumAtivo(), prox = proxJejum(), jj = ativo || prox;
    return `
    <header class="head"><div class="head-t"><p class="eyebrow">Calendário</p><h1>${MESES[m][0].toUpperCase() + MESES[m].slice(1)} <span class="muted">${mesCal.getFullYear()}</span></h1></div>
      <div class="row"><button class="icon-btn" data-act="mes" data-d="-1" aria-label="Mês anterior">${ICO.voltar}</button><button class="icon-btn" data-act="mes" data-d="1" aria-label="Próximo mês">${ICO.seta}</button></div></header>
    <div class="cal">
      ${DIAS_C.map(n => `<span class="cal-h">${n[0]}</span>`).join('')}
      ${cells.map(d => { const iso = isoDe(d), dd = diaDe(iso), js = jejunsDoDia(iso);
        const a = d.getTime(), b = a + DIA_MS;
        const jc = js.length ? `fasting ${js.some(j => j.inicio >= a) ? 'f-start' : ''} ${js.some(j => fimJ(j) <= b) ? 'f-end' : ''}` : '';
        return `<a class="cal-d ${d.getMonth() !== m ? 'out' : ''} ${iso === hoje() ? 'today' : ''} ${jc}" href="#dia-${iso}">
          <span class="n">${d.getDate()}</span>
          <span class="dots">${dd.refeicoes.length ? '<i class="d-ref"></i>' : ''}${dd.rotina.some(r => r.tipo === 'sol') ? '<i class="d-sol"></i>' : ''}${dd.rotina.some(r => r.tipo === 'treino') ? '<i class="d-treino"></i>' : ''}</span></a>`; }).join('')}
    </div>
    <div class="legend"><span><i class="d-ref"></i>Refeição</span><span><i class="d-sol"></i>Sol</span><span><i class="d-treino"></i>Treino</span><span><i class="d-fast"></i>Jejum</span></div>
    ${jj ? `<button class="card-btn" data-act="editarJejum" data-id="${jj.id}">${icone('jejum', 't-fast')}<span class="row-t"><b>${ativo ? 'Em jejum' : 'Próximo jejum'}</b><small>${quando(jj.inicio)} até ${quando(jj.fimPrev)} · ${fmt((jj.fimPrev - jj.inicio) / H, 0)} h</small></span>${ICO.seta}</button>` : ''}
    <div class="row wrap"><button class="btn" data-act="planejarJejum">Planejar jejum</button><a class="btn ghost" href="#dia-${hoje()}">Ir para hoje</a></div>`;
  }

  // ----- Alimentos -----
  const filtro = { q: '', cat: '', ord: 'proteina_g', base: 'g' };
  function vAlimentos() {
    return `
    <header class="head"><div class="head-t"><p class="eyebrow">${alimentos().length} alimentos · por 100 g</p><h1>Alimentos</h1></div></header>
    <input type="search" id="busca" class="search" placeholder="Buscar alimento" value="${esc(filtro.q)}" data-act="busca" aria-label="Buscar alimento">
    <div class="chips">
      <button class="chip sel" data-act="escolherOrdem">Mais ${esc(NUT[filtro.ord].n.toLowerCase())}${filtro.base === 'kcal' ? ' por kcal' : ''} ▾</button>
      ${[['', 'Todos'], ...Object.entries(CATS)].map(([k, n]) => `<button class="chip ${filtro.cat === k ? 'on' : ''}" data-act="cat" data-c="${k}">${n.split(',')[0]}</button>`).join('')}
    </div>
    <div id="lista">${listaAlimentos()}</div>
    <button class="btn ghost" data-act="novoAlimento">Cadastrar alimento</button>`;
  }
  const semAcento = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function listaAlimentos(picker = false) {
    const q = semAcento((picker ? filtro.qP : filtro.q) || '').trim(), k = filtro.ord;
    const L = alimentos().filter(f => (!filtro.cat || f.categoria === filtro.cat) && (!q || semAcento(f.nome).includes(q)))
      .map(f => ({ f, s: filtro.base === 'kcal' ? (f.kcal ? valor(f, k) / f.kcal * 100 : 0) : valor(f, k) })).sort((a, b) => b.s - a.s);
    if (!L.length) return '<p class="empty">Nenhum alimento encontrado.</p>';
    return `<div class="rows foods">${L.map(({ f, s }) => `<button class="food" data-act="${picker ? 'escolher' : 'verAlimento'}" data-a="${esc(f.id)}">
      ${foto(f)}<span class="row-t"><b>${esc(f.nome)}</b><small>${esc((CATS[f.categoria] || '').split(',')[0])} <i>|</i> ${fmt(f.kcal, 0)} kcal</small></span>
      <span class="fv">${s > 0 ? `<b>${fmt(s)}</b><small>${NUT[k].u}</small>` : '<small>–</small>'}</span>${picker ? `<span class="add">${ICO.mais}</span>` : ''}</button>`).join('')}</div>`;
  }

  // ----- Dietas -----
  function mediaDieta(dt) {
    const t = soma(dt.dias.flatMap(d => d.refeicoes.flatMap(r => r.itens))), comendo = dt.dias.filter(d => d.refeicoes.length).length || 1;
    return { kcal: t.kcal / comendo, prot: t.proteina_g / comendo, jejum: (dt.jejum || []).reduce((s, j) => s + j.horas, 0) };
  }
  function cardDieta(dt, mine) {
    const m = mediaDieta(dt);
    return `<button class="diet" data-act="verDieta" data-id="${dt.id}">
      <span class="row-t"><b>${esc(dt.nome)}</b><small>${esc(dt.desc || '')}</small></span>
      <span class="diet-n"><span><b>${fmt(m.kcal, 0)}</b><small>kcal/dia</small></span><span><b>${fmt(m.prot, 0)} g</b><small>proteína</small></span><span><b>${m.jejum ? fmt(m.jejum, 0) + ' h' : '–'}</b><small>jejum</small></span></span></button>`;
  }
  function vDietas() {
    return `
    <header class="head"><div class="head-t"><p class="eyebrow">Semanas prontas</p><h1>Dietas</h1></div></header>
    <p class="muted">Escolha uma semana e aplique no calendário. Depois ajuste o que quiser em cada dia.</p>
    <section class="group"><h2 class="label">Recomendadas</h2><div class="stack">${RECS.map(d => cardDieta(d)).join('')}</div></section>
    <section class="group"><h2 class="label">Minhas</h2>
      ${S.dietas.length ? `<div class="stack">${S.dietas.map(d => cardDieta(d, true)).join('')}</div>` : '<p class="empty">Monte uma semana no calendário e salve aqui para repetir depois.</p>'}
      <button class="btn ghost" data-act="salvarSemana">Salvar uma semana do calendário</button></section>
    <section class="group"><h2 class="label">Refeições prontas</h2>
      <div class="rows">${Object.keys(MODELOS).map(k => { const r = ref(k), t = soma(r.itens);
        return `<button class="row-main solo" data-act="verModelo" data-k="${k}">${foto(iconeDe(r))}<span class="row-t"><b>${esc(MODELOS[k][3])}</b><small>${fmt(t.kcal, 0)} kcal · ${fmt(t.proteina_g, 0)} g prot · ${fmt(t.gordura_g, 0)} g gord</small></span>${ICO.seta}</button>`; }).join('')}</div></section>`;
  }

  // ----- Resumo -----
  let semRes = inicioSemana(new Date()), nutRes = 'proteina_g', soFeito = false;
  function vResumo() {
    const dias = Array.from({ length: 7 }, (_, k) => isoDe(somaDias(semRes, k)));
    const L = dias.map(iso => ({ iso, t: totalDia(iso, soFeito), sol: minutos(iso, 'sol', soFeito), tr: minutos(iso, 'treino', soFeito), j: horasJejumDia(iso) }));
    const T = Object.fromEntries(NUTS.map(n => [n.k, L.reduce((s, l) => s + l.t[n.k], 0)]));
    const meta = S.metas[nutRes] ?? REFS[nutRes]?.ref ?? 0, max = Math.max(meta, ...L.map(l => l.t[nutRes]), 1), n = NUT[nutRes];
    const fimSem = somaDias(semRes, 6);
    return `
    <header class="head"><div class="head-t"><p class="eyebrow">Semana</p><h1>${semRes.getDate()}/${semRes.getMonth() + 1} – ${fimSem.getDate()}/${fimSem.getMonth() + 1}</h1></div>
      <div class="row"><button class="icon-btn" data-act="sem" data-d="-7" aria-label="Semana anterior">${ICO.voltar}</button><button class="icon-btn" data-act="sem" data-d="7" aria-label="Próxima semana">${ICO.seta}</button></div></header>
    <div class="seg" role="group" aria-label="O que contar"><button class="${!soFeito ? 'on' : ''}" data-act="soFeito" data-v="0">Tudo do calendário</button><button class="${soFeito ? 'on' : ''}" data-act="soFeito" data-v="1">Só o que marquei</button></div>
    <div class="big-nums">
      <div><small>Proteína</small><b>${fmt(T.proteina_g, 0)}<i> g</i></b><small>${fmt(T.proteina_g / 7, 0)} g por dia</small></div>
      <div><small>Calorias</small><b>${fmt(T.kcal / 7, 0)}<i> kcal</i></b><small>média por dia</small></div>
      <div><small>Jejum</small><b>${fmt(L.reduce((s, l) => s + l.j, 0), 0)}<i> h</i></b><small>na semana</small></div>
      <div><small>Sol · Treino</small><b>${L.reduce((s, l) => s + l.sol, 0)}<i> · </i>${L.reduce((s, l) => s + l.tr, 0)}<i> min</i></b><small>na semana</small></div>
    </div>
    <section class="panel">
      <div class="chips">${['proteina_g', 'kcal', 'gordura_g', 'carboidrato_g', 'fibra_g'].map(k => `<button class="chip ${nutRes === k ? 'on' : ''}" data-act="nutRes" data-k="${k}">${NUT[k].n}</button>`).join('')}<button class="chip ${MICROS.some(m => m.k === nutRes) ? 'on' : ''}" data-act="nutResMais">${MICROS.some(m => m.k === nutRes) ? n.n : 'Vitaminas…'} ▾</button></div>
      <div class="chart" style="--m:${(meta / max).toFixed(3)}">
        ${meta ? `<span class="chart-meta"><span>meta ${fmt(meta)} ${n.u}</span></span>` : ''}
        ${L.map(l => `<a class="col ${l.iso === hoje() ? 'today' : ''}" href="#dia-${l.iso}"><span class="cb"><i style="height:${(l.t[nutRes] / max * 100).toFixed(1)}%"></i></span><span class="cl">${DIAS_C[dow(dataDe(l.iso))]}</span></a>`).join('')}
      </div>
      <p class="muted small">Total na semana: ${fmt(T[nutRes])} ${n.u}. Toque num dia para abrir.</p>
    </section>
    <button class="card-btn" data-act="microsSemana">${icone('prato')}<span class="row-t"><b>Vitaminas e minerais da semana</b><small>% da referência para 7 dias</small></span>${ICO.seta}</button>`;
  }

  // ----- Metas e dados -----
  const LIM = { kcal: [1200, 4500, 50], proteina_g: [60, 320, 5], gordura_g: [30, 320, 5], carboidrato_g: [0, 400, 5], fibra_g: [0, 80, 1] };
  function vMetas() {
    return `
    <header class="head"><a class="back" href="#hoje" aria-label="Voltar">${ICO.voltar}</a><div class="head-t"><p class="eyebrow">Ajustes</p><h1>Metas e dados</h1></div></header>
    <section class="panel"><h2 class="label">Metas por dia</h2>
      ${MACROS.map(m => `<div class="slider"><div class="slider-h"><label for="meta-${m.k}">${m.n}</label><b id="v-meta-${m.k}">${fmt(S.metas[m.k], 0)} ${m.u}</b></div>${range('meta-' + m.k, ...LIM[m.k], S.metas[m.k], 'meta', `data-k="${m.k}" data-u="${m.u}"`)}</div>`).join('')}
      <p class="muted small">Vitaminas e minerais usam a referência diária para homem adulto (DRI).</p></section>
    <section class="panel"><h2 class="label">Backup</h2>
      <p class="muted small">Os dados ficam neste aparelho. Exporte para guardar uma cópia ou levar do iPhone para o computador.</p>
      <div class="row wrap"><button class="btn" data-act="exportar">Exportar</button><label class="btn ghost">Importar<input type="file" accept="application/json,.json" data-act="importar" hidden></label><button class="btn ghost" data-act="textoBackup">Copiar como texto</button></div></section>
    ${S.custom.length ? `<section class="panel"><h2 class="label">Alimentos que você cadastrou</h2><div class="rows">${S.custom.map(f => `<div class="row-item"><span class="row-main">${foto(f)}<span class="row-t"><b>${esc(f.nome)}</b></span></span><button class="tick plain" data-act="delCustom" data-id="${f.id}" aria-label="Apagar">${ICO.lixo}</button></div>`).join('')}</div></section>` : ''}
    <section class="panel"><h2 class="label">Recomeçar</h2><p class="muted small">${S.exemplo ? 'A semana atual veio preenchida como exemplo. ' : ''}Apaga o calendário, os jejuns e as dietas salvas.</p><button class="btn ghost danger" data-act="resetar">Apagar tudo</button></section>
    <p class="muted small">Valores aproximados por 100 g cru (USDA FoodData Central e TACO). Ícones: Fluent Emoji, Microsoft (licença MIT).</p>`;
  }

  // ---------- Painel (sheet) ----------
  let ctx = {};
  function sheet(html, c = {}) { ctx = c; $('#sheet-c').innerHTML = html; $('#sheet').hidden = false; document.body.classList.add('locked'); }
  function fechar() { $('#sheet').hidden = true; document.body.classList.remove('locked'); ctx = {}; }
  const topo = (titulo, sub = '', voltar = '') => `<div class="sheet-h">${voltar ? `<button class="icon-btn" data-act="${voltar}" aria-label="Voltar">${ICO.voltar}</button>` : ''}<div class="head-t"><h2>${titulo}</h2>${sub ? `<p class="muted small">${sub}</p>` : ''}</div><button class="icon-btn" data-act="fechar" aria-label="Fechar">${ICO.fechar}</button></div>`;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2200); }
  function confirmar(msg, acao, rotulo = 'Confirmar') { sheet(`${topo(esc(msg))}<div class="row end"><button class="btn ghost" data-act="fechar">Cancelar</button><button class="btn" data-act="okConfirmar">${esc(rotulo)}</button></div>`, { acao }); }

  // Adicionar ao dia
  function sheetAdicionar(iso) {
    const ops = [['novaRef', 'prato', 'Refeição', 'Em branco ou pronta'], ['addSol', 'sol', 'Sol', 'Minutos de sol'], ['addTreino', 'treino', 'Treino', 'Minutos de treino'], ['planejarJejum', 'jejum', 'Jejum', 'Início e duração']];
    sheet(`${topo('Adicionar', tituloData(iso))}<div class="grid-ops">${ops.map(([a, i, n, s]) => `<button class="op" data-act="${a}" data-iso="${iso}">${icone(i, 't-' + i)}<b>${n}</b><small>${s}</small></button>`).join('')}</div>`, { iso });
  }
  function sheetNovaRef(iso) {
    sheet(`${topo('Nova refeição', tituloData(iso), 'voltarAdd')}
      <button class="row-main solo" data-act="refBranco" data-iso="${iso}">${icone('mais')}<span class="row-t"><b>Em branco</b><small>Você escolhe os alimentos</small></span></button>
      <h3 class="label">Prontas</h3>
      <div class="rows">${Object.keys(MODELOS).map(k => { const r = ref(k), t = soma(r.itens); return `<button class="row-main solo" data-act="refModelo" data-k="${k}" data-iso="${iso}">${foto(iconeDe(r))}<span class="row-t"><b>${esc(MODELOS[k][3])}</b><small>${fmt(t.kcal, 0)} kcal · ${fmt(t.proteina_g, 0)} g prot</small></span>${ICO.mais}</button>`; }).join('')}</div>`, { iso });
  }

  // Editar refeição
  const acharRef = (iso, id) => diaEdit(iso).refeicoes.find(r => r.id === id);
  const passo = f => f?.un || (f?.kcal > 500 ? 5 : 25);
  function sheetRef(iso, id) {
    const r = acharRef(iso, id); if (!r) return fechar();
    const t = soma(r.itens);
    sheet(`<div class="sheet-h"><div class="head-t"><input class="title-in" value="${esc(r.nome)}" data-act="refNome" aria-label="Nome da refeição"><p class="muted small">${tituloData(iso)}</p></div><button class="icon-btn" data-act="fechar" aria-label="Fechar">${ICO.fechar}</button></div>
      <div class="row wrap"><label class="inline">Horário <input type="time" value="${esc(r.hora || '')}" data-act="refHora"></label><span class="muted small">${resumoMacros(t)} · ${fmt(t.gordura_g, 0)} g gord</span></div>
      ${r.itens.length ? `<div class="rows">${r.itens.map((it, k) => { const f = FOOD(it.a);
        return `<div class="item">${foto(f)}<span class="row-t"><b>${esc(f?.nome || it.a)}</b><small>${fmt(soma([it]).kcal, 0)} kcal${f?.un ? ` · ${fmt(it.g / f.un, 1)} un` : ''}</small></span>
          <span class="step"><button data-act="menos" data-k="${k}" aria-label="Menos">−</button><input type="number" inputmode="numeric" min="0" value="${it.g}" data-act="itemG" data-k="${k}" aria-label="Gramas"><span class="u">g</span><button data-act="maisG" data-k="${k}" aria-label="Mais">+</button></span>
          <button class="icon-btn sm" data-act="delItem" data-k="${k}" aria-label="Remover">${ICO.fechar}</button></div>`; }).join('')}</div>` : '<p class="empty">Sem alimentos ainda.</p>'}
      <button class="btn" data-act="addItem">${ICO.mais} Adicionar alimento</button>
      <div class="row between"><button class="btn ghost danger" data-act="delRef">Apagar refeição</button><button class="btn ghost" data-act="feitoRefSheet">${r.feito ? 'Desmarcar' : 'Marcar como comida'}</button></div>`, { tipo: 'ref', iso, id });
  }
  function sheetPicker() {
    sheet(`${topo('Escolher alimento', '', 'voltarRef')}
      <input type="search" id="buscaP" class="search" placeholder="Buscar" value="${esc(filtro.qP || '')}" data-act="buscaP" aria-label="Buscar">
      <div class="chips">${[['', 'Todos'], ...Object.entries(CATS)].map(([k, n]) => `<button class="chip ${filtro.cat === k ? 'on' : ''}" data-act="catP" data-c="${k}">${n.split(',')[0]}</button>`).join('')}</div>
      <div id="listaP">${listaAlimentos(true)}</div>`, { ...ctx, tipo: 'picker' });
    setTimeout(() => $('#buscaP')?.focus({ preventScroll: true }), 60);
  }
  function sheetGramas(a) {
    const f = FOOD(a), st = passo(f), g0 = f.un ? f.un * 2 : (f.kcal > 500 ? 20 : 150), max = f.un ? f.un * 12 : (f.kcal > 500 ? 150 : 600);
    sheet(`${topo(esc(f.nome), esc(CATS[f.categoria] || ''), 'voltarPicker')}
      <div class="hero-food">${foto(f, 'lg')}</div>
      <div class="slider"><div class="slider-h"><span>Quantidade</span><b id="gLbl">${g0} g${f.un ? ` · ${fmt(g0 / f.un, 1)} un` : ''}</b></div>${range('gIn', 0, max, st, g0, 'gramas', `data-a="${esc(a)}"`)}</div>
      <p class="muted small center" id="gPrev">${resumoMacros(soma([{ a, g: g0 }]))}</p>
      <button class="btn" data-act="confirmarItem" data-a="${esc(a)}">Adicionar</button>`, { ...ctx, tipo: 'gramas' });
  }

  // Rotina
  function sheetRot(iso, id, tipoNovo) {
    const novo = !id, r = novo ? (tipoNovo === 'sol' ? sol(20, '09:00') : treino(40, '', '17:30')) : diaEdit(iso).rotina.find(x => x.id === id);
    sheet(`${topo(novo ? 'Adicionar à rotina' : 'Rotina', tituloData(iso), novo ? 'voltarAdd' : '')}
      <div class="seg" role="group" aria-label="Tipo">${Object.entries(TIPOS_ROT).map(([k, n]) => `<button class="${r.tipo === k ? 'on' : ''}" data-act="rotTipo" data-t="${k}">${n}</button>`).join('')}</div>
      <div class="slider"><div class="slider-h"><label for="rMin">Duração</label><b id="v-rMin">${r.min} min</b></div>${range('rMin', 5, 180, 5, r.min, 'rotMin')}</div>
      <div class="row wrap"><label class="inline">Horário <input type="time" id="rHora" value="${esc(r.hora || '')}"></label><input type="text" id="rNota" class="grow" placeholder="${r.tipo === 'treino' ? 'Musculação, corrida…' : 'Observação'}" value="${esc(r.nota || '')}"></div>
      <div class="row between">${novo ? '<span></span>' : `<button class="btn ghost danger" data-act="delRot">Apagar</button>`}<button class="btn" data-act="salvarRot">Salvar</button></div>`, { tipo: 'rot', iso, id, rot: clone(r), novo });
  }

  // Jejum
  function sheetJejum(id, iso) {
    const j = id ? S.jejuns.find(x => x.id === id) : null;
    let ini;
    if (j) ini = j.inicio; else { const d = iso ? dataDe(iso) : new Date(); d.setHours(20, 0, 0, 0); ini = d.getTime(); }
    const horas = j ? Math.round((j.fimPrev - j.inicio) / H) : 48;
    sheet(`${topo(j ? 'Jejum' : 'Planejar jejum', '', !j && ctx.iso ? 'voltarAdd' : '')}
      <label class="field">Começa<input type="datetime-local" id="jIni" value="${localInput(ini)}" data-act="jPrev"></label>
      <div class="slider"><div class="slider-h"><label for="jH">Duração</label><b id="v-jH">${rotHoras(horas)}</b></div>${range('jH', 12, 144, 4, horas, 'jHoras')}</div>
      <p class="fim-prev" id="jFim"></p>
      ${j ? '' : `<label class="toggle"><input type="checkbox" id="jPre" checked><span></span>Refeição pré-jejum gordurosa antes de começar</label>
      <label class="toggle"><input type="checkbox" id="jQuebra" checked><span></span>Quebra do jejum leve no fim</label>`}
      ${horas > 72 || !j ? `<p class="muted small" id="jAviso">Acima de 72 h, reponha sódio, potássio e magnésio e tenha acompanhamento médico.</p>` : ''}
      <div class="row between">${j ? `<button class="btn ghost danger" data-act="delJejum">Apagar</button>` : '<span></span>'}<span class="row">${j && !j.fim && j.inicio <= Date.now() ? `<button class="btn ghost" data-act="encerrarJejum" data-id="${j.id}">Encerrar agora</button>` : ''}<button class="btn" data-act="salvarJejum">${j ? 'Salvar' : 'Planejar'}</button></span></div>`, { tipo: 'jejum', id, iso: ctx.iso });
    jPrev();
  }
  const rotHoras = h => `${h} h${h >= 24 ? ` · ${fmt(h / 24, 1)} ${h >= 48 ? 'dias' : 'dia'}` : ''}`;
  function jPrev() {
    const ini = new Date($('#jIni').value).getTime(), h = +$('#jH').value;
    $('#jFim').innerHTML = isNaN(ini) ? '' : `Termina <b>${quando(ini + h * H)}</b>`;
  }

  // Detalhe do alimento
  function sheetAlimento(a, g = 100) {
    const f = FOOD(a); if (!f) return;
    const t = soma([{ a, g }]);
    sheet(`${topo(esc(f.nome), esc(CATS[f.categoria] || ''))}
      <div class="hero-food">${foto(f, 'lg')}${f.beneficio ? `<p>${esc(f.beneficio)}</p>` : ''}</div>
      ${f.obs ? `<p class="note">${esc(f.obs)}</p>` : ''}
      <div class="slider"><div class="slider-h"><span>Quantidade</span><b id="vqLbl">${g} g</b></div>${range('qG', 10, f.kcal > 500 ? 200 : 500, f.un || 10, g, 'qtd', `data-a="${esc(a)}"`)}</div>
      <div class="quad" id="quad">${quad(t)}</div>
      <details class="more"><summary>Vitaminas e minerais</summary><div id="micA">${listaMicros(t, 1, true)}</div></details>
      <div class="row wrap"><input type="date" id="addData" value="${hoje()}" aria-label="Dia"><button class="btn grow" data-act="addAoDia" data-a="${esc(a)}">Adicionar ao dia</button></div>
      <p class="muted small">${esc(f.fonte || '')}</p>`, { tipo: 'alimento', a });
  }
  const quad = t => MACROS.map(m => `<div class="m-${m.k}"><small>${m.n}</small><b>${fmt(t[m.k])}<i> ${m.u}</i></b></div>`).join('');

  function sheetNutrientes(iso) {
    const t = totalDia(iso);
    sheet(`${topo('Nutrientes do dia', tituloData(iso))}${barrasMacros(t)}<p class="muted small">${t.kcal ? Math.round(t.gordura_g * 9 / t.kcal * 100) : 0}% das calorias vêm da gordura.</p>
      <h3 class="label">Vitaminas e minerais</h3>${listaMicros(t)}<p class="muted small">Soma dos nutrientes listados na base. O que falta conta como zero.</p>`);
  }
  function sheetDieta(id) {
    const dt = RECS.find(d => d.id === id) || S.dietas.find(d => d.id === id), minha = !RECS.includes(dt);
    const seg = inicioSemana(new Date()), op = [0, 7, 14].map(n => somaDias(seg, n));
    sheet(`${topo(esc(dt.nome), esc(dt.desc || ''))}
      <div class="rows">${dt.dias.map((d, k) => { const t = soma(d.refeicoes.flatMap(r => r.itens)), j = (dt.jejum || []).find(x => x.dia === k);
        return `<div class="row-item"><span class="row-main"><span class="dname">${DIAS_C[k]}</span><span class="row-t"><b>${d.refeicoes.length ? d.refeicoes.map(r => esc(r.nome)).join(', ') : 'Sem refeições'}</b><small>${d.refeicoes.length ? resumoMacros(t) : 'jejum'}${j ? ` · jejum começa ${j.hora}, ${j.horas} h` : ''}${d.rotina.length ? ' · ' + d.rotina.map(r => `${TIPOS_ROT[r.tipo].toLowerCase()} ${r.min}`).join(', ') + ' min' : ''}</small></span></span></div>`; }).join('')}</div>
      <label class="field">Aplicar na semana de<select id="semAplicar">${op.map((d, k) => `<option value="${isoDe(d)}">${['Esta semana', 'Próxima semana', 'Daqui a 2 semanas'][k]} · ${d.getDate()}/${d.getMonth() + 1}</option>`).join('')}</select></label>
      <label class="toggle"><input type="checkbox" id="substituir" checked><span></span>Substituir o que já está nesses dias</label>
      <div class="row between">${minha ? `<button class="btn ghost danger" data-act="delDieta" data-id="${dt.id}">Apagar</button>` : '<span></span>'}<button class="btn" data-act="aplicar" data-id="${dt.id}">Aplicar no calendário</button></div>`);
  }
  function sheetModelo(k) {
    const r = ref(k), t = soma(r.itens);
    sheet(`${topo(esc(MODELOS[k][3]), resumoMacros(t) + ` · ${fmt(t.gordura_g, 0)} g gord`)}
      <div class="rows">${r.itens.map(it => { const f = FOOD(it.a); return `<div class="item">${foto(f)}<span class="row-t"><b>${esc(f.nome)}</b><small>${fmt(soma([it]).kcal, 0)} kcal</small></span><span class="muted">${it.g} g</span></div>`; }).join('')}</div>
      <div class="row wrap"><input type="date" id="addData" value="${hoje()}" aria-label="Dia"><button class="btn grow" data-act="modeloAoDia" data-k="${k}">Adicionar ao dia</button></div>`);
  }
  function sheetSalvarSemana() {
    const seg = inicioSemana(new Date()), op = [-7, 0, 7].map(n => somaDias(seg, n));
    sheet(`${topo('Salvar semana como dieta')}
      <label class="field">Semana<select id="semSalvar">${op.map((d, k) => `<option value="${isoDe(d)}" ${k === 1 ? 'selected' : ''}>${['Semana passada', 'Esta semana', 'Próxima semana'][k]} · ${d.getDate()}/${d.getMonth() + 1}</option>`).join('')}</select></label>
      <label class="field">Nome<input type="text" id="nomeDieta" value="Minha semana"></label>
      <button class="btn" data-act="confirmarSalvarSemana">Salvar</button>`);
  }
  function sheetOrdem(destino) {
    sheet(`${topo('Ordenar por')}
      <div class="seg" role="group" aria-label="Base"><button class="${filtro.base === 'g' ? 'on' : ''}" data-act="base" data-b="g">Por 100 g</button><button class="${filtro.base === 'kcal' ? 'on' : ''}" data-act="base" data-b="kcal">Por 100 kcal</button></div>
      <div class="chips wrapc">${NUTS.map(n => `<button class="chip ${(destino === 'res' ? nutRes : filtro.ord) === n.k ? 'on' : ''}" data-act="${destino === 'res' ? 'nutRes' : 'ord'}" data-k="${n.k}">${n.n}</button>`).join('')}</div>`);
    if (destino === 'res') $('#sheet-c .seg').remove();
  }
  function sheetNovoAlimento() {
    sheet(`${topo('Cadastrar alimento', 'Valores por 100 g')}
      <form id="formAl" class="form">
        <label class="field">Nome<input name="nome" required></label>
        <label class="field">Categoria<select name="categoria">${Object.entries(CATS).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
        <div class="grid2">${MACROS.map(m => `<label class="field">${m.n} (${m.u})<input name="${m.k}" type="number" step="0.1" min="0" value="0"></label>`).join('')}</div>
        <details class="more"><summary>Vitaminas e minerais</summary><div class="grid2">${MICROS.map(m => `<label class="field">${m.n} (${m.u})<input name="${m.k}" type="number" step="0.01" min="0"></label>`).join('')}</div></details>
        <button class="btn" type="submit">Salvar alimento</button></form>`);
  }

  // ---------- Ações ----------
  const reRef = () => { salvar(); sheetRef(ctx.iso, ctx.id); render(); };
  const CLICK = {
    fechar, okConfirmar: () => { const a = ctx.acao; fechar(); a && a(); },
    fab: () => sheetAdicionar(rota === 'dia' ? diaRota : hoje()),
    voltarAdd: () => sheetAdicionar(ctx.iso),
    nutrientes: el => sheetNutrientes(el.dataset.iso),
    feitoRef: el => { const r = acharRef(el.dataset.iso, el.dataset.id); r.feito = !r.feito; salvar(); render(); },
    feitoRot: el => { const r = diaEdit(el.dataset.iso).rotina.find(x => x.id === el.dataset.id); r.feito = !r.feito; salvar(); render(); },
    abrirRef: el => sheetRef(el.dataset.iso, el.dataset.id),
    abrirRot: el => sheetRot(el.dataset.iso, el.dataset.id),
    novaRef: el => sheetNovaRef(el.dataset.iso),
    refBranco: el => { const r = { id: uid(), nome: 'Refeição', hora: '', feito: false, itens: [] }; diaEdit(el.dataset.iso).refeicoes.push(r); salvar(); render(); sheetRef(el.dataset.iso, r.id); },
    refModelo: el => { const r = ref(el.dataset.k); diaEdit(el.dataset.iso).refeicoes.push(r); S.exemplo = false; salvar(); render(); sheetRef(el.dataset.iso, r.id); },
    addItem: () => { filtro.qP = ''; sheetPicker(); },
    voltarRef: () => sheetRef(ctx.iso, ctx.id),
    voltarPicker: () => sheetPicker(),
    escolher: el => sheetGramas(el.dataset.a),
    confirmarItem: el => { const g = +$('#gIn').value; if (g > 0) { acharRef(ctx.iso, ctx.id).itens.push({ a: el.dataset.a, g }); toast(`${FOOD(el.dataset.a).nome} adicionado`); } reRef(); },
    menos: el => { const it = acharRef(ctx.iso, ctx.id).itens[+el.dataset.k]; it.g = Math.max(0, it.g - passo(FOOD(it.a))); reRef(); },
    maisG: el => { const it = acharRef(ctx.iso, ctx.id).itens[+el.dataset.k]; it.g += passo(FOOD(it.a)); reRef(); },
    delItem: el => { acharRef(ctx.iso, ctx.id).itens.splice(+el.dataset.k, 1); reRef(); },
    delRef: () => { const d = diaEdit(ctx.iso); d.refeicoes = d.refeicoes.filter(r => r.id !== ctx.id); salvar(); fechar(); render(); },
    feitoRefSheet: () => { const r = acharRef(ctx.iso, ctx.id); r.feito = !r.feito; reRef(); },
    addSol: el => sheetRot(el.dataset.iso, null, 'sol'),
    addTreino: el => sheetRot(el.dataset.iso, null, 'treino'),
    rotTipo: el => { ctx.rot.tipo = el.dataset.t; $$('[data-act=rotTipo]').forEach(b => b.classList.toggle('on', b === el)); },
    salvarRot: () => {
      const r = Object.assign(ctx.rot, { min: +$('#rMin').value, hora: $('#rHora').value, nota: $('#rNota').value.trim() });
      const d = diaEdit(ctx.iso); if (ctx.novo) d.rotina.push(r); else d.rotina[d.rotina.findIndex(x => x.id === r.id)] = r;
      salvar(); fechar(); render();
    },
    delRot: () => { const d = diaEdit(ctx.iso); d.rotina = d.rotina.filter(x => x.id !== ctx.id); salvar(); fechar(); render(); },
    comecarJejum: () => { S.jejuns.push({ id: uid(), inicio: Date.now(), fimPrev: Date.now() + 48 * H, fim: null }); salvar(); render(); toast('Jejum começou. Meta de 48 h, ajuste em Editar.'); },
    planejarJejum: el => { ctx.iso = el.dataset.iso || ctx.iso; sheetJejum(null, el.dataset.iso); },
    editarJejum: el => sheetJejum(el.dataset.id),
    salvarJejum: () => {
      const ini = new Date($('#jIni').value).getTime(), h = +$('#jH').value; if (isNaN(ini)) return toast('Escolha o dia e a hora do começo.');
      if (ctx.id) { const j = S.jejuns.find(x => x.id === ctx.id); j.inicio = ini; j.fimPrev = ini + h * H; if (j.fim && j.fim < ini) j.fim = null; }
      else {
        S.jejuns.push({ id: uid(), inicio: ini, fimPrev: ini + h * H, fim: null });
        if ($('#jPre')?.checked) { const d0 = new Date(ini - H), iso = isoDe(d0); diaEdit(iso).refeicoes.push(ref(h >= 72 ? 'pre_jejum_forte' : 'pre_jejum', d0.toTimeString().slice(0, 5))); }
        if ($('#jQuebra')?.checked) { const d1 = new Date(ini + h * H), iso = isoDe(d1); diaEdit(iso).refeicoes.push(ref('quebra', d1.toTimeString().slice(0, 5))); }
      }
      salvar(); fechar(); render(); toast(ctx.id ? 'Jejum atualizado' : `Jejum de ${h} h planejado`);
    },
    encerrarJejum: el => { const id = el.dataset.id; confirmar('Encerrar o jejum agora?', () => { const j = S.jejuns.find(x => x.id === id); j.fim = Date.now(); salvar(); render(); toast(`Jejum de ${duracao((j.fim - j.inicio) / H)} registrado`); }, 'Encerrar'); },
    delJejum: () => { const id = ctx.id; confirmar('Apagar este jejum?', () => { S.jejuns = S.jejuns.filter(j => j.id !== id); salvar(); render(); }, 'Apagar'); },
    mes: el => { mesCal = new Date(mesCal.getFullYear(), mesCal.getMonth() + +el.dataset.d, 1); render(); },
    sem: el => { semRes = somaDias(semRes, +el.dataset.d); render(); },
    soFeito: el => { soFeito = el.dataset.v === '1'; render(); },
    nutRes: el => { nutRes = el.dataset.k; fechar(); render(); },
    nutResMais: () => sheetOrdem('res'),
    microsSemana: () => { const t = Object.fromEntries(NUTS.map(n => [n.k, 0])); for (let k = 0; k < 7; k++) { const x = totalDia(isoDe(somaDias(semRes, k)), soFeito); NUTS.forEach(n => t[n.k] += x[n.k]); }
      sheet(`${topo('Vitaminas e minerais', 'Semana inteira, % da referência para 7 dias')}${listaMicros(t, 7)}`); },
    verAlimento: el => sheetAlimento(el.dataset.a),
    escolherOrdem: () => sheetOrdem('lista'),
    ord: el => { filtro.ord = el.dataset.k; fechar(); render(); },
    base: el => { filtro.base = el.dataset.b; $$('[data-act=base]').forEach(b => b.classList.toggle('on', b === el)); render(); },
    cat: el => { filtro.cat = el.dataset.c; render(); },
    catP: el => { filtro.cat = el.dataset.c; $$('[data-act=catP]').forEach(b => b.classList.toggle('on', b === el)); $('#listaP').innerHTML = listaAlimentos(true); },
    addAoDia: el => { const iso = $('#addData').value || hoje(), g = +$('#qG').value; const d = diaEdit(iso); let r = d.refeicoes.find(x => x.nome === 'Avulsos'); if (!r) { r = { id: uid(), nome: 'Avulsos', hora: '', feito: false, itens: [] }; d.refeicoes.push(r); } r.itens.push({ a: el.dataset.a, g }); salvar(); fechar(); render(); toast(`Adicionado em ${tituloData(iso)}`); },
    modeloAoDia: el => { const iso = $('#addData').value || hoje(); diaEdit(iso).refeicoes.push(ref(el.dataset.k)); salvar(); fechar(); render(); toast(`Adicionado em ${tituloData(iso)}`); },
    novoAlimento: () => sheetNovoAlimento(),
    verDieta: el => sheetDieta(el.dataset.id),
    verModelo: el => sheetModelo(el.dataset.k),
    aplicar: el => { const dt = RECS.find(d => d.id === el.dataset.id) || S.dietas.find(d => d.id === el.dataset.id); const seg = dataDe($('#semAplicar').value); aplicarDieta(dt, seg, $('#substituir').checked); S.exemplo = false; salvar(); fechar(); mesCal = new Date(seg.getFullYear(), seg.getMonth(), 1); location.hash = 'calendario'; render(); toast(`“${dt.nome}” aplicada`); },
    delDieta: el => { S.dietas = S.dietas.filter(d => d.id !== el.dataset.id); salvar(); fechar(); render(); },
    salvarSemana: () => sheetSalvarSemana(),
    confirmarSalvarSemana: () => {
      const seg = dataDe($('#semSalvar').value), a = seg.getTime(), b = a + 7 * DIA_MS;
      const dias = Array.from({ length: 7 }, (_, k) => clone(diaDe(isoDe(somaDias(seg, k)))));
      const jejum = S.jejuns.filter(j => j.inicio >= a && j.inicio < b).map(j => { const d = new Date(j.inicio); return { dia: dow(d), hora: d.toTimeString().slice(0, 5), horas: Math.round((j.fimPrev - j.inicio) / H) }; });
      S.dietas.push({ id: 'minha-' + uid(), nome: $('#nomeDieta').value.trim() || 'Minha semana', desc: `Salva da semana de ${seg.getDate()}/${seg.getMonth() + 1}.`, dias, jejum });
      salvar(); fechar(); render(); toast('Semana salva em Minhas dietas');
    },
    exportar: () => { const blob = new Blob([JSON.stringify(S)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `minha-dieta-${hoje()}.json`; document.body.appendChild(a); a.click(); a.remove(); toast('Backup exportado'); },
    textoBackup: () => sheet(`${topo('Backup em texto', 'Copie e guarde, ou cole um backup e importe')}<textarea id="bkTxt" rows="6" aria-label="Backup">${esc(JSON.stringify(S))}</textarea><div class="row end"><button class="btn ghost" data-act="copiarBk">Copiar</button><button class="btn" data-act="colarBk">Importar este texto</button></div>`),
    copiarBk: () => { const t = $('#bkTxt'); navigator.clipboard?.writeText(t.value).then(() => toast('Copiado'), () => { t.select(); toast('Selecione e copie'); }); },
    colarBk: () => importar($('#bkTxt').value),
    delCustom: el => { S.custom = S.custom.filter(f => f.id !== el.dataset.id); salvar(); render(); },
    resetar: () => confirmar('Apagar todos os dados deste aparelho?', () => { S = { v: 2, metas: S.metas, dias: {}, jejuns: [], dietas: [], custom: [], exemplo: false }; salvar(); render(); toast('Dados apagados'); }, 'Apagar tudo'),
  };
  function importar(txt) {
    try { const o = JSON.parse(txt); if (o.v !== 2 || typeof o.dias !== 'object') throw 0; S = o; salvar(); fechar(); render(); toast('Backup importado'); }
    catch (e) { toast('Arquivo inválido. Use um backup exportado por este app.'); }
  }
  const setRange = el => el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100).toFixed(1) + '%');
  const INPUT = {
    busca: el => { filtro.q = el.value; $('#lista').innerHTML = listaAlimentos(); },
    buscaP: el => { filtro.qP = el.value; $('#listaP').innerHTML = listaAlimentos(true); },
    gramas: el => { const f = FOOD(el.dataset.a), g = +el.value; $('#gLbl').textContent = `${g} g${f.un ? ` · ${fmt(g / f.un, 1)} un` : ''}`; $('#gPrev').textContent = resumoMacros(soma([{ a: el.dataset.a, g }])); },
    qtd: el => { const g = +el.value, t = soma([{ a: el.dataset.a, g }]); $('#vqLbl').textContent = g + ' g'; $('#quad').innerHTML = quad(t); $('#micA').innerHTML = listaMicros(t, 1, true); },
    rotMin: el => { $('#v-rMin').textContent = el.value + ' min'; },
    jHoras: el => { $('#v-jH').textContent = rotHoras(+el.value); jPrev(); },
    jPrev: () => jPrev(),
    meta: el => { $('#v-meta-' + el.dataset.k).textContent = `${fmt(+el.value, 0)} ${el.dataset.u}`; S.metas[el.dataset.k] = +el.value; salvar(); },
  };
  const CHANGE = {
    refNome: el => { acharRef(ctx.iso, ctx.id).nome = el.value.trim() || 'Refeição'; salvar(); render(); },
    refHora: el => { acharRef(ctx.iso, ctx.id).hora = el.value; salvar(); render(); },
    itemG: el => { acharRef(ctx.iso, ctx.id).itens[+el.dataset.k].g = Math.max(0, +el.value || 0); reRef(); },
    importar: el => { const f = el.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => importar(r.result); r.readAsText(f); },
  };

  document.addEventListener('click', e => {
    if (e.target.id === 'sheet') return fechar();
    const el = e.target.closest('[data-act]');
    if (!el || !CLICK[el.dataset.act] || el.tagName === 'INPUT' || el.tagName === 'SELECT') return;
    CLICK[el.dataset.act](el, e);
  });
  document.addEventListener('input', e => { const el = e.target; if (el.type === 'range') setRange(el); const a = el.dataset?.act; if (a && INPUT[a]) INPUT[a](el); });
  document.addEventListener('change', e => { const a = e.target.dataset?.act; if (a && CHANGE[a]) CHANGE[a](e.target); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheet').hidden) fechar(); });
  document.addEventListener('submit', e => {
    if (e.target.id !== 'formAl') return; e.preventDefault();
    const fd = new FormData(e.target), f = { id: 'custom-' + uid(), nome: fd.get('nome').trim(), categoria: fd.get('categoria'), fonte: 'Cadastrado por você', micro: {} };
    MACROS.forEach(m => f[m.k] = +fd.get(m.k) || 0);
    MICROS.forEach(m => { const v = fd.get(m.k); if (v !== '' && v != null) f.micro[m.k] = +v; });
    S.custom.push(f); salvar(); fechar(); render(); toast(`${f.nome} cadastrado`);
  });
  window.addEventListener('hashchange', () => { fechar(); render(); window.scrollTo(0, 0); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  render();
})();
