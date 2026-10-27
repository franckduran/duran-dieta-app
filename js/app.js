/* Minha Dieta — app em JavaScript puro. Os dados ficam salvos no aparelho (localStorage). */
(function () {
  'use strict';

  // ---------- Base de alimentos e nutrientes ----------
  const DB = window.DB;
  const REFS = DB.refs;
  const DBMAP = new Map(DB.alimentos.map(f => [f.id, f]));
  const CATS = Object.fromEntries([...DB.categorias, { id: 'receitas', nome: 'Minhas combinações' }].map(c => [c.id, c.id === 'bebidas' ? 'Líquidos' : c.nome]));
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
  const horaMenos = (h, n) => { const [a, b] = h.split(':').map(Number), t = Math.max(6 * 60, a * 60 + b - n * 60); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
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
    baixo: '<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg>',
    em_breve: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 12h6"/></svg>',
    dieta: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/></svg>',
    intelectual: '<svg viewBox="0 0 24 24"><path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5v13c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/><path d="M12 6v13.5"/></svg>',
    financeiro: '<svg viewBox="0 0 24 24"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>',
    trabalho: '<svg viewBox="0 0 24 24"><rect x="3.5" y="7" width="17" height="12.5" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17"/></svg>',
    gota: '<svg viewBox="0 0 24 24"><path d="M12 3.5c3 4 6 7.2 6 10.5a6 6 0 0 1-12 0c0-3.3 3-6.5 6-10.5z"/></svg>',
    estrela: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
    balanca: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 9.5a5 5 0 0 1 7 0M12 9.5l1.5-1.5"/></svg>',
    lista: '<svg viewBox="0 0 24 24"><path d="M9 6.5h11M9 12h11M9 17.5h11"/><path d="M4 6.5l1 1 2-2M4 12l1 1 2-2M4 17.5l1 1 2-2"/></svg>',
    historico: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4.5v3.5h3.5"/><path d="M12 8v4l2.5 2"/></svg>',
    copiar: '<svg viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/></svg>',
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
    quebra: ['Quebra do jejum', '12:00', [['contrafile', 250], ['ovo', 150], ['figado', 80], ['batata-doce', 150], ['abacate', 100], ['espinafre', 80], ['manteiga', 15]], 'Quebra do jejum, forte e nutritiva'],
  };
  // Refeição nova a partir de um modelo (pronto do app ou salvo por você, com id 'salva-…')
  const ref = (key, hora) => {
    const sv = MODELOS[key] ? null : S.refsSalvas.find(r => r.id === key);
    if (sv) return { id: uid(), nome: sv.nome, hora: hora || sv.hora || '', feito: false, itens: clone(sv.itens) };
    const [nome, h, it] = MODELOS[key]; return { id: uid(), nome, hora: hora || h, feito: false, itens: it.map(([a, g]) => ({ a, g })) };
  };
  const tituloModelo = k => MODELOS[k]?.[3] || S.refsSalvas.find(r => r.id === k)?.nome || 'Refeição';
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
    { id: 'rec-jejum2', nome: 'Jejum de 2 dias', desc: 'Pré-jejum gordo na terça às 19 h. Quarta e quinta sem comer. Quebra forte e nutritiva na sexta ao meio-dia (cerca de 64 h).', jejum: [{ dia: 1, hora: '20:00', horas: 64 }], dias: [
      D(['almoco_contra', 'jantar_patinho'], [sol(), mus()]),
      D(['almoco_alcatra', 'pre_jejum'], [sol(), cam()]),
      D([], [sol(), cam()]),
      D([], [sol(), cam()]),
      D(['quebra', 'jantar_musculo'], [sol()]),
      D(['cafe_queijo', 'almoco_cordeiro', 'jantar_patinho'], [sol(30), mus()]),
      D(['cafe_queijo', 'almoco_contra', 'jantar_ovos'], [sol(30)]),
    ] },
    { id: 'rec-jejum4', nome: 'Jejum de 4 dias', desc: 'Pré-jejum forte na segunda às 19 h, jejum de terça a sexta e quebra forte e nutritiva no sábado ao meio-dia (cerca de 112 h).', jejum: [{ dia: 0, hora: '20:00', horas: 112 }], dias: [
      D(['cafe_ovos', 'almoco_alcatra', 'pre_jejum_forte'], [sol(), mus()]),
      D([], [sol(), cam()]),
      D([], [sol(), cam()]),
      D([], [sol(), cam()]),
      D([], [sol()]),
      D(['quebra', 'jantar_patinho'], [sol(30)]),
      D(['cafe_ovos', 'almoco_contra', 'lanche_castanhas', 'jantar_musculo'], [sol(30), mus()]),
    ] },
  ];

  // ---------- Estado ----------
  const KEY = 'minha-dieta.v2';
  let S;
  function estadoInicial() {
    const s = { v: 2, metas: { kcal: 2400, proteina_g: 170, gordura_g: 150, carboidrato_g: 120, fibra_g: 30 }, dias: {}, jejuns: [], dietas: [], custom: [], favs: [], exemplo: true };
    aplicarDieta(RECS[3], inicioSemana(new Date()), true, s);
    return s;
  }
  const METAS_PADRAO = { kcal: 2400, proteina_g: 170, gordura_g: 150, carboidrato_g: 120, fibra_g: 30 };
  const arr = x => Array.isArray(x) ? x : [];
  // Garante que todo estado (salvo, importado ou antigo) tenha o formato que o app espera
  function normalizar(s) {
    if (!s || typeof s !== 'object' || s.v !== 2) return null;
    s.metas = { ...METAS_PADRAO, ...(s.metas && typeof s.metas === 'object' ? s.metas : {}) };
    s.dias = s.dias && typeof s.dias === 'object' && !Array.isArray(s.dias) ? s.dias : {};
    for (const [iso, d] of Object.entries(s.dias)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !d || typeof d !== 'object') { delete s.dias[iso]; continue; }
      d.refeicoes = arr(d.refeicoes).filter(r => r && typeof r === 'object').map(r => ({ ...r, id: r.id || uid(), itens: arr(r.itens).filter(it => it && it.a && +it.g >= 0) }));
      d.rotina = arr(d.rotina).filter(r => r && TIPOS_ROT[r.tipo]).map(r => ({ ...r, id: r.id || uid() }));
      d.liquidos = arr(d.liquidos).filter(l => l && l.a).map(l => ({ ...l, id: l.id || uid() }));
    }
    s.jejuns = arr(s.jejuns).filter(j => j && isFinite(j.inicio) && isFinite(j.fimPrev) && j.fimPrev > j.inicio).map(j => ({ ...j, id: j.id || uid(), fim: isFinite(j.fim) && j.fim ? j.fim : null }));
    s.dietas = arr(s.dietas).filter(d => d && d.id && Array.isArray(d.dias) && d.dias.length === 7);
    s.custom = arr(s.custom).filter(f => f && f.id && f.nome);
    s.favs = [...new Set(arr(s.favs))];
    s.pesos = arr(s.pesos).filter(p => p && /^\d{4}-\d{2}-\d{2}$/.test(p.d) && +p.kg > 0).sort((a, b) => a.d.localeCompare(b.d));
    s.refsSalvas = arr(s.refsSalvas).filter(r => r && r.id && Array.isArray(r.itens));
    s.compras = s.compras && typeof s.compras === 'object' ? s.compras : {};
    if (!s.criado) s.criado = Date.now();
    return s;
  }
  try { S = normalizar(JSON.parse(localStorage.getItem(KEY))); } catch (e) { S = null; }
  let novoEstado = false;
  if (!S) { S = normalizar(estadoInicial()); novoEstado = true; }
  const ehFav = id => S.favs.includes(id);
  let avisouErro = false;
  const salvar = () => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); avisouErro = false; }
    catch (e) { if (!avisouErro) { avisouErro = true; setTimeout(() => toast('Não foi possível salvar neste aparelho. Exporte um backup em Metas e dados.'), 0); } }
  };
  // Pede ao navegador para não apagar os dados sozinho (Safari apaga sites sem uso)
  try { navigator.storage?.persist?.(); } catch (e) { /* sem suporte */ }

  // Alimentos ocultos (apagados mas ainda usados em refeições) continuam nos cálculos, mas saem das listas
  const alimentos = () => [...DB.alimentos, ...S.custom.filter(f => !f.oculto)];
  const FOOD = id => DBMAP.get(id) || S.custom.find(f => f.id === id);
  const diaDe = iso => S.dias[iso] || { refeicoes: [], rotina: [], liquidos: [] };
  const diaEdit = iso => { const d = (S.dias[iso] = S.dias[iso] || { refeicoes: [], rotina: [] }); d.liquidos = d.liquidos || []; return d; };
  const liqsDe = iso => diaDe(iso).liquidos || [];
  // Líquidos (água, café, combinações que são bebidas) ficam fora das refeições
  const ehLiquido = f => !!f && (f.categoria === 'bebidas' || (!!f.receita && f.receita.reduce((t, it) => t + (FOOD(it.a)?.categoria === 'bebidas' ? it.g : 0), 0) >= (f.un || 1) / 2));
  const fmtL = g => g >= 1000 ? `${fmt(g / 1000, g % 1000 ? 1 : 0)} L` : `${fmt(g, 0)} ml`;

  // ---------- Cálculos ----------
  const valor = (f, k) => !f ? 0 : k in f ? (f[k] || 0) : (f.micro?.[k] || 0);
  function soma(itens) {
    const t = Object.fromEntries(NUTS.map(n => [n.k, 0]));
    for (const it of itens) { const f = FOOD(it.a); if (f) for (const n of NUTS) t[n.k] += valor(f, n.k) * it.g / 100; }
    return t;
  }
  const totalDia = (iso, soFeito) => soma([...diaDe(iso).refeicoes.filter(r => !soFeito || r.feito).flatMap(r => r.itens), ...liqsDe(iso).filter(l => !soFeito || l.feito)]);
  const minutos = (iso, tipo, soFeito) => diaDe(iso).rotina.filter(r => r.tipo === tipo && (!soFeito || r.feito)).reduce((s, r) => s + (+r.min || 0), 0);
  const pct = (v, ref) => ref ? Math.round(v / ref * 100) : 0;
  // Fim do jejum: o real se já terminou; se está em andamento e passou da meta, vai até agora
  const fimJ = j => j.fim || (j.inicio <= Date.now() ? Math.max(Date.now(), j.fimPrev) : j.fimPrev);
  const jejumAtivo = () => S.jejuns.filter(j => !j.fim && j.inicio <= Date.now()).sort((a, b) => b.inicio - a.inicio)[0];
  const proxJejum = () => S.jejuns.filter(j => j.inicio > Date.now()).sort((a, b) => a.inicio - b.inicio)[0];
  const jejunsDoDia = iso => { const a = dataDe(iso).getTime(), b = a + DIA_MS; return S.jejuns.filter(j => j.inicio < b && fimJ(j) > a).sort((x, y) => x.inicio - y.inicio); };
  // Horas de jejum no dia. soFeito: só o que já aconteceu (até agora)
  const horasJejumDia = (iso, soFeito) => { const a = dataDe(iso).getTime(), b = a + DIA_MS, now = Date.now();
    return jejunsDoDia(iso).reduce((s, j) => { const fim = Math.min(b, soFeito ? Math.min(now, fimJ(j)) : fimJ(j)), ini = Math.max(a, j.inicio); return s + Math.max(0, fim - ini) / H; }, 0); };
  const sobrepoe = (ini, fim, exceto) => S.jejuns.find(j => j.id !== exceto && j.inicio < fim && fimJ(j) > ini);
  // Momento de uma refeição (dia + hora); sem hora conta como meio-dia
  const tsRef = (iso, hora) => { const d = dataDe(iso); const [h, m] = (hora || '12:00').split(':').map(Number); d.setHours(h || 0, m || 0, 0, 0); return d.getTime(); };
  const hhmm = ts => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  // Fases aproximadas do jejum (variam de pessoa para pessoa)
  const FASES = [
    [0, 'Digestão', 'O corpo ainda usa a última refeição.'],
    [4, 'Glicose em queda', 'A insulina baixa e o corpo começa a usar as reservas.'],
    [12, 'Início da cetose', 'O glicogênio do fígado acaba e a gordura vira a principal fonte de energia.'],
    [18, 'Cetose', 'Mais cetonas no sangue. A fome costuma diminuir.'],
    [24, 'Autofagia em alta', 'Renovação celular mais intensa. Mantenha a água com sal.'],
    [48, 'Cetose profunda', 'Hormônio do crescimento mais alto. Reponha sódio, potássio e magnésio.'],
    [72, 'Jejum prolongado', 'Atenção a tontura e fraqueza. Tenha acompanhamento médico.'],
  ];
  const faseDe = h => { let k = 0; FASES.forEach((f, i) => { if (h >= f[0]) k = i; }); return { k, f: FASES[k], prox: FASES[k + 1] }; };
  const aguaSal = receitaComoAlimento({ id: 'agua-sal', nome: 'Água com sal integral', itens: [{ a: 'agua', g: 1000 }, { a: 'sal-marinho', g: 2 }] });
  Object.assign(aguaSal, { categoria: 'bebidas', un: 1000, unNome: 'litro', img: DB.alimentos.find(f => f.id === 'agua')?.img, fonte: '1 litro de água com 2 g de sal marinho integral', beneficio: 'Para beber ao longo dos dias de jejum. Repõe sódio.' });
  if (!DBMAP.has('agua-sal')) { DB.alimentos.push(aguaSal); DBMAP.set('agua-sal', aguaSal); }
  if (!S.migLiq) {
    const tira = d => { d.liquidos = d.liquidos || [];
      d.refeicoes = d.refeicoes.filter(r => { const liq = r.itens.filter(it => ehLiquido(FOOD(it.a))); if (!liq.length) return true;
        r.itens = r.itens.filter(it => !liq.includes(it)); liq.forEach(it => d.liquidos.push({ id: uid(), a: it.a, g: it.g, hora: r.hora || '', feito: !!r.feito })); return r.itens.length > 0; }); };
    Object.values(S.dias).forEach(tira); (S.dietas || []).forEach(dt => dt.dias.forEach(tira));
    S.jejuns.filter(j => !j.fim).forEach(j => garantirAguaSal(j));
    S.migLiq = true; novoEstado = true;
  }
  if (!S.migJejum) {
    // Liga pré-jejum e quebra aos jejuns e marca a água com sal colocada pelo app
    S.jejuns.forEach(j => ligarRefsJejum(j));
    Object.values(S.dias).forEach(d => d.liquidos.forEach(l => { if (l.a === 'agua-sal' && !l.hora && l.g === 2000) l.auto = true; }));
    S.migJejum = true; novoEstado = true;
  }
  const iconeDe = r => FOOD([...r.itens].sort((x, y) => (valor(FOOD(y.a), 'kcal') * y.g) - (valor(FOOD(x.a), 'kcal') * x.g))[0]?.a);

  // Água com sal integral em todo dia com pelo menos 12 h de jejum
  function horasCobertas(iso, s = S, j0) { const a = dataDe(iso).getTime(), b = a + DIA_MS;
    return [...s.jejuns, ...(j0 && !s.jejuns.includes(j0) ? [j0] : [])].reduce((t, j) => t + Math.max(0, Math.min(b, j.fim || j.fimPrev) - Math.max(a, j.inicio)) / H, 0); }
  function garantirAguaSal(j, s = S) {
    const fim = j.fim || j.fimPrev;
    for (let d = dataDe(isoDe(new Date(j.inicio))); d.getTime() < fim; d = somaDias(d, 1)) {
      const iso = isoDe(d);
      if (horasCobertas(iso, s, j) < 12) continue;
      const dia = s.dias[iso] = s.dias[iso] || { refeicoes: [], rotina: [] };
      dia.liquidos = dia.liquidos || [];
      if (!dia.liquidos.some(l => l.a === 'agua-sal')) dia.liquidos.unshift({ id: uid(), a: 'agua-sal', g: 2000, hora: '', feito: false, auto: true });
    }
  }
  // Tira a água com sal que o app colocou em dias que não têm mais 12 h de jejum (se ainda não foi bebida)
  function limparAguaSal(s = S) {
    for (const [iso, d] of Object.entries(s.dias)) {
      if (!d.liquidos?.some(l => l.auto && !l.feito)) continue;
      if (horasCobertas(iso, s) >= 12) continue;
      d.liquidos = d.liquidos.filter(l => !(l.auto && !l.feito));
    }
  }
  // Pré-jejum e quebra ligados a um jejum: acha pelo id, ou pelo nome no dia do começo e do fim
  function ligarRefsJejum(j, s = S) {
    const ini = s.dias[isoDe(new Date(j.inicio))], fim = s.dias[isoDe(new Date(j.fimPrev))];
    const pre = ini?.refeicoes.find(r => r.nome === 'Pré-jejum' && !r.jejum), qb = fim?.refeicoes.find(r => r.nome === 'Quebra do jejum' && !r.jejum);
    if (pre) pre.jejum = j.id;
    if (qb) qb.jejum = j.id;
  }
  const refsDoJejum = j => Object.entries(S.dias).flatMap(([iso, d]) => d.refeicoes.filter(r => r.jejum === j.id).map(r => ({ iso, r })));
  // Move uma refeição para outro dia e hora
  function moverRef(deIso, r, ts) {
    const de = S.dias[deIso]; if (de) de.refeicoes = de.refeicoes.filter(x => x !== r);
    r.hora = hhmm(ts); diaEdit(isoDe(new Date(ts))).refeicoes.push(r);
  }
  // Depois de criar, mudar ou encerrar um jejum: pré-jejum 1 h antes do começo, quebra no fim, água com sal nos dias certos
  function sincronizarJejum(j) {
    for (const { iso, r } of refsDoJejum(j)) {
      if (r.feito) continue;
      if (r.nome === 'Pré-jejum') moverRef(iso, r, j.inicio - H);
      else if (r.nome === 'Quebra do jejum') moverRef(iso, r, j.fim || j.fimPrev);
    }
    garantirAguaSal(j); limparAguaSal();
  }
  // Refeições ainda não comidas que caem dentro do jejum (fora pré-jejum e quebra)
  function refsNoJejum(j) {
    const out = [], fim = j.fim || j.fimPrev;
    for (let d = dataDe(isoDe(new Date(j.inicio))); d.getTime() < fim; d = somaDias(d, 1)) {
      const iso = isoDe(d);
      (S.dias[iso]?.refeicoes || []).forEach(r => { const t = tsRef(iso, r.hora); if (!r.feito && !r.jejum && r.itens.length && t > j.inicio + 60e3 && t < fim - 60e3) out.push({ iso, r }); });
    }
    return out;
  }
  const tirarRefs = L => L.forEach(({ iso, r }) => { const d = S.dias[iso]; if (d) d.refeicoes = d.refeicoes.filter(x => x !== r); });
  // Dietas com jejum começam no dia do pré-jejum, no dia da semana escolhido (diaIni) e na hora escolhida
  function inicioPadrao(dt) { return dt.jejum?.length ? (dt.diaInicio ?? dt.jejum[0].dia) : 0; }
  function aplicarDieta(dt, segunda, substituir, s = S, diaIni, horaIni) {
    const temJ = !!dt.jejum?.length, off = temJ ? dt.jejum[0].dia : 0, w = temJ ? (diaIni ?? inicioPadrao(dt)) : 0;
    const base = somaDias(segunda, w), j0 = dt.jejum?.[0], difH = temJ && horaIni ? (() => { const f = h => { const [a, b] = h.split(':').map(Number); return a + b / 60; }; return f(j0.hora) - f(horaIni); })() : 0;
    for (let k = 0; k < 7; k++) {
      const iso = isoDe(somaDias(base, k)), src = dt.dias[(off + k) % 7];
      const novo = { refeicoes: src.refeicoes.map(r => { const c = { ...clone(r), id: uid(), feito: false }; delete c.jejum; return c; }), rotina: src.rotina.map(r => ({ ...r, id: uid(), feito: false })), liquidos: (src.liquidos || []).map(l => ({ ...l, id: uid(), feito: false })) };
      if (k === 0 && temJ && horaIni) novo.refeicoes.forEach(r => { if (r.nome === 'Pré-jejum') r.hora = horaMenos(horaIni, 1); });
      if (substituir || !s.dias[iso]) s.dias[iso] = novo;
      else { const d = s.dias[iso]; d.liquidos = d.liquidos || []; d.refeicoes.push(...novo.refeicoes); d.rotina.push(...novo.rotina); d.liquidos.push(...novo.liquidos); }
    }
    const ini = base.getTime(), fim = ini + 7 * DIA_MS;
    if (substituir) s.jejuns = s.jejuns.filter(j => !(j.inicio >= ini && j.inicio < fim && j.inicio > Date.now()));
    for (const j of dt.jejum || []) {
      const hora = j === j0 && horaIni ? horaIni : j.hora, horas = j.horas + (j === j0 ? difH : 0);
      const d = somaDias(base, (j.dia - off + 7) % 7), [hh, mm] = hora.split(':').map(Number); d.setHours(hh, mm, 0, 0);
      let jj = s.jejuns.find(x => x.inicio === d.getTime());
      if (jj) { if (!jj.fim) jj.fimPrev = d.getTime() + horas * H; }
      else { jj = { id: uid(), inicio: d.getTime(), fimPrev: d.getTime() + horas * H, fim: null }; s.jejuns.push(jj); }
      garantirAguaSal(jj, s); ligarRefsJejum(jj, s);
    }
    limparAguaSal(s);
  }

  // ---------- Componentes ----------
  const foto = (f, cls = '') => f?.imgs?.length > 1 ? `<span class="ph ph-multi n${Math.min(3, f.imgs.length)} ${cls}">${f.imgs.slice(0, 3).map(i => `<img src="${i}" alt="" loading="lazy" decoding="async">`).join('')}</span>`
    : f?.img ? `<img class="ph ${cls}" src="${f.img}" alt="" loading="lazy" decoding="async">` : `<span class="ph ph-x ${cls}">${esc((f?.nome || '?')[0])}</span>`;
  // Barras do dia: comido (cheia) e planejado (clara), contra a meta
  function barrasDia(iso, t, feito) {
    return MACROS.map(m => { const meta = S.metas[m.k] || 0, c = feito[m.k], wc = Math.min(100, pct(c, meta)), wp = Math.min(100, pct(t[m.k], meta));
      return `<span class="dm m-${m.k} ${c > meta * 1.1 && meta ? 'over' : ''}"><span class="dm-h"><span>${m.n}</span><b>${fmt(c, 0)}<small> / ${fmt(meta, 0)} ${m.u}</small></b></span><span class="dbar"><i class="pl" style="width:${wp}%"></i><i class="ok" data-k="${iso}-${m.k}" style="width:${wc}%"></i></span></span>`; }).join('');
  }
  const prevW = {};
  function animarBarras() {
    $$('.dbar i.ok').forEach(i => { const k = i.dataset.k, w = i.style.width, p = prevW[k] ?? '0%'; prevW[k] = w;
      if (p === w) return; i.style.transition = 'none'; i.style.width = p; void i.offsetWidth; i.style.transition = ''; i.style.width = w; });
  }
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
  const AREAS = [
    { id: 'corpo', nome: 'Corpo', mods: [{ id: 'dieta', nome: 'Dieta', rota: 'hoje', pronto: true }, { id: 'treino', nome: 'Treino', rota: 'treino' }] },
    { id: 'mente', nome: 'Mente', mods: [{ id: 'intelectual', nome: 'Intelectual', rota: 'intelectual', desc: 'Estudo e leitura' }] },
    { id: 'business', nome: 'Business', mods: [{ id: 'financeiro', nome: 'Financeiro', rota: 'financeiro' }, { id: 'trabalho', nome: 'Trabalho', rota: 'trabalho' }] },
  ];
  const MODS = Object.fromEntries(AREAS.flatMap(a => a.mods.map(m => [m.id, { ...m, area: a.nome }])));
  const modAtual = () => MODS[rota] && !MODS[rota].pronto ? MODS[rota] : MODS.dieta;
  const modBar = () => { const m = modAtual(); return `<button class="modbar" data-act="areas" aria-label="Trocar de área"><span class="mb-a">${m.area}</span><span class="mb-sep">/</span><b>${m.nome}</b>${ICO.baixo}</button>`; };
  function vModulo(id) {
    const m = MODS[id];
    return `<header class="head"><div class="head-t"><p class="eyebrow">${m.area}</p><h1>${m.nome}</h1></div></header>
      <div class="soon"><span class="soon-i">${ICO.em_breve}</span><b>${m.nome} entra aqui em breve</b><p class="muted">Vamos montar esta parte depois de terminar a Dieta.</p></div>`;
  }
  function sheetAreas() {
    const atual = modAtual().id;
    sheet(`${topo('Áreas')}
      ${AREAS.map(a => `<section class="group"><h3 class="label">${a.nome}</h3><div class="rows">${a.mods.map(m => `<a class="row-main solo ${m.id === atual ? 'cur' : ''}" href="#${m.rota}">${icone(m.id, 't-' + a.id)}<span class="row-t"><b>${m.nome}</b><small>${m.pronto ? 'Hoje, calendário, alimentos, dietas e resumo' : (m.desc ? m.desc + ' · ' : '') + 'Em breve'}</small></span>${m.id === atual ? ICO.check : ICO.seta}</a>`).join('')}</div></section>`).join('')}`);
  }
  function render() {
    diaRender = hoje();
    const h = (location.hash || '').slice(1);
    if (/^dia-\d{4}-\d{2}-\d{2}$/.test(h)) { rota = 'dia'; diaRota = h.slice(4); }
    else rota = TABS.includes(h) || h === 'metas' || (MODS[h] && !MODS[h].pronto) ? h : 'hoje';
    $$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === (rota === 'dia' ? 'calendario' : rota)));
    const v = MODS[rota] && !MODS[rota].pronto ? null : { hoje: () => vDia(hoje(), true), dia: () => vDia(diaRota), calendario: vCalendario, alimentos: vAlimentos, dietas: vDietas, resumo: vResumo, metas: vMetas }[rota];
    const emBreve = MODS[rota] && !MODS[rota].pronto;
    document.body.classList.toggle('mod-vazio', !!emBreve);
    $$('[data-mod]').forEach(a => a.classList.toggle('on', a.dataset.mod === modAtual().id));
    $('#main').innerHTML = modBar() + (emBreve ? vModulo(rota) : v());
    $('#fab').hidden = !(rota === 'hoje' || rota === 'dia');
    animarBarras();
    if (emBreve) $('#fab').hidden = true;
    tick();
  }

  // ----- Dia (Hoje e qualquer data do calendário) -----
  function vDia(iso, ehHoje = false) {
    const d = diaDe(iso), t = totalDia(iso), feito = totalDia(iso, true);
    const passado = iso < hoje();
    const refs = [...d.refeicoes].sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));
    const rot = [...d.rotina].sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));
    const liqs = [...liqsDe(iso)].sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    const js = jejunsDoDia(iso), noJejum = r => !r.feito && !r.jejum && r.hora && js.some(j => { const t = tsRef(iso, r.hora); return t > j.inicio + 60e3 && t < fimJ(j) - 60e3; });
    const peso = S.pesos.find(p => p.d === iso);
    const lembrarBackup = ehHoje && Object.keys(S.dias).length > 3 && Date.now() - (S.ultimoBackup || S.criado || Date.now()) > 21 * DIA_MS;
    return `
    <header class="head">
      ${ehHoje ? '' : `<a class="back" href="#calendario" aria-label="Voltar ao calendário">${ICO.voltar}</a>`}
      <div class="head-t"><p class="eyebrow">${ehHoje ? 'Hoje' : passado ? 'Dia passado' : iso === hoje() ? 'Hoje' : 'Planejado'}</p><h1>${tituloData(iso)}</h1></div>
      <a class="icon-btn" href="#metas" aria-label="Metas e dados">${ICO.ajuste}</a>
    </header>
    ${cartaoJejum(iso, ehHoje)}
    ${lembrarBackup ? `<a class="card-btn" href="#metas">${icone('ajuste')}<span class="row-t"><b>Faça um backup</b><small>${S.ultimoBackup ? 'O último foi há ' + Math.floor((Date.now() - S.ultimoBackup) / DIA_MS) + ' dias' : 'Os dados ficam só neste aparelho'}</small></span>${ICO.seta}</a>` : ''}
    <button class="daybars" data-act="nutrientes" data-iso="${iso}" aria-label="Ver nutrientes do dia">
      <span class="db-h"><span class="label">${iso === hoje() ? 'Comido hoje' : passado ? 'Comido no dia' : 'Metas do dia'}</span><span class="go">Detalhes ${ICO.seta}</span></span>
      ${barrasDia(iso, t, feito)}
      <span class="db-leg"><span><i class="ok"></i>Comido</span><span><i class="pl"></i>Planejado</span></span>
    </button>
    <section class="group">
      <h2 class="label">Refeições</h2>
      ${refs.length ? `<div class="rows">${refs.map(r => { const tt = soma(r.itens);
        return `<div class="row-item ${r.feito ? 'done' : ''}">
          <button class="row-main" data-act="abrirRef" data-iso="${iso}" data-id="${r.id}">${foto(iconeDe(r))}<span class="row-t"><b>${esc(r.nome)}${noJejum(r) ? ' <span class="badge">no jejum</span>' : ''}</b><small>${esc(r.hora || '')}${r.hora ? ' · ' : ''}${fmt(tt.kcal, 0)} kcal · ${r.itens.length} ${r.itens.length === 1 ? 'item' : 'itens'}</small></span></button>
          <button class="tick" data-act="feitoRef" data-iso="${iso}" data-id="${r.id}" aria-pressed="${r.feito}" aria-label="${r.feito ? 'Desmarcar' : 'Marcar como comida'}">${ICO.check}</button></div>`; }).join('')}</div>`
        : `<p class="empty">${js.length ? 'Dia de jejum, sem refeições.' : 'Nenhuma refeição.'}</p>`}
    </section>
    <section class="group">
      <h2 class="label">Líquidos</h2>
      ${liqs.length ? `<div class="rows">${liqs.map(l => { const f = FOOD(l.a);
        return `<div class="row-item ${l.feito ? 'done' : ''}">
          <button class="row-main" data-act="abrirLiq" data-iso="${iso}" data-id="${l.id}">${foto(f)}<span class="row-t"><b>${esc(f?.nome || l.a)}</b><small>${esc(l.hora || '')}${l.hora ? ' · ' : ''}${fmtL(l.g)}${soma([l]).kcal >= 5 ? ` · ${fmt(soma([l]).kcal, 0)} kcal` : ''}</small></span></button>
          <button class="tick" data-act="feitoLiq" data-iso="${iso}" data-id="${l.id}" aria-pressed="${l.feito}" aria-label="${l.feito ? 'Desmarcar' : 'Marcar como bebido'}">${ICO.check}</button></div>`; }).join('')}</div>`
        : '<p class="empty">Nenhum líquido.</p>'}
    </section>
    <section class="group">
      <h2 class="label">Rotina</h2>
      ${rot.length ? `<div class="rows">${rot.map(r => `<div class="row-item ${r.feito ? 'done' : ''}">
          <button class="row-main" data-act="abrirRot" data-iso="${iso}" data-id="${r.id}">${icone(r.tipo, 't-' + r.tipo)}<span class="row-t"><b>${TIPOS_ROT[r.tipo]} · ${r.min} min</b><small>${esc([r.hora, r.nota].filter(Boolean).join(' · '))}</small></span></button>
          <button class="tick" data-act="feitoRot" data-iso="${iso}" data-id="${r.id}" aria-pressed="${r.feito}" aria-label="${r.feito ? 'Desmarcar' : 'Marcar como feito'}">${ICO.check}</button></div>`).join('')}</div>`
        : '<p class="empty">Sem sol ou treino.</p>'}
      ${peso ? `<button class="row-main solo" data-act="addPeso" data-iso="${iso}">${icone('balanca', 't-peso')}<span class="row-t"><b>Peso · ${fmt(peso.kg, 1)} kg</b><small>${variacaoPeso(iso)}</small></span>${ICO.seta}</button>` : ''}
    </section>
    <div class="row wrap day-tools"><button class="btn ghost sm" data-act="copiarDia" data-iso="${iso}">Copiar este dia</button>${peso ? '' : `<button class="btn ghost sm" data-act="addPeso" data-iso="${iso}">Registrar peso</button>`}</div>
    <div class="fab-space"></div>`;
  }

  const ultimoJejum = () => S.jejuns.filter(j => j.fim).sort((a, b) => b.fim - a.fim)[0];
  function cartaoJejum(iso, ehHoje) {
    const ativo = jejumAtivo(), prox = proxJejum();
    const j = ehHoje ? (ativo || (prox && prox.inicio - Date.now() < 2 * DIA_MS ? prox : null)) : jejunsDoDia(iso)[0];
    if (!j) {
      if (!ehHoje) return '';
      const u = ultimoJejum();
      return `<section class="fast idle"><div class="fast-row"><button class="play" data-act="comecarJejum" aria-label="Começar jejum agora">${ICO.play}</button>
        <div class="fast-t"><b>Começar jejum agora</b><small>${u ? `Último: ${duracao((u.fim - u.inicio) / H)}, terminou ${quando(u.fim)}` : 'Ou planeje um para depois'}</small></div><button class="pill" data-act="planejarJejum">Planejar</button></div></section>`;
    }
    const now = Date.now(), total = (j.fimPrev - j.inicio) / H;
    const estado = j.fim ? 'feito' : j.inicio > now ? 'futuro' : 'ativo';
    const decorrido = estado === 'ativo' ? (now - j.inicio) / H : estado === 'feito' ? (j.fim - j.inicio) / H : 0;
    const passou = estado === 'ativo' && now >= j.fimPrev;
    const p = Math.min(1, decorrido / total), R = 52, C = 2 * Math.PI * R;
    const titulo = passou ? 'Meta do jejum atingida' : { futuro: 'Próximo jejum', ativo: 'Jejum em andamento', feito: 'Jejum concluído' }[estado];
    const fz = estado === 'futuro' ? null : faseDe(decorrido);
    return `<section class="fast ${estado} ${passou ? 'meta' : ''}" data-jejum="${j.id}" data-estado="${estado}${passou ? '-meta' : ''}">
      <div class="fast-title">${icone('jejum', 't-fast')}<span><b>${titulo}</b><small>meta de ${fmt(total, 0)} h${total >= 24 ? ` (${fmt(total / 24, 1)} ${total >= 48 ? 'dias' : 'dia'})` : ''}</small></span></div>
      <div class="fast-ring">
        <svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="gr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--red)"/><stop offset="1" stop-color="var(--orange)"/></linearGradient></defs>
          <circle cx="60" cy="60" r="${R}" class="ring-bg"/><circle cx="60" cy="60" r="${R}" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}" id="ringFg" data-c="${C}"/></svg>
        <div class="ring-c">${estado === 'futuro' ? `<small>começa em</small><b id="jTempo">${duracao((j.inicio - now) / H)}</b>` : estado === 'feito' ? `<small>você jejuou</small><b>${duracao(decorrido)}</b>` : `<small>em jejum há</small><b id="jTempo">${duracao(decorrido)}</b>`}</div>
      </div>
      ${fz ? `<button class="phase" data-act="fases" data-h="${decorrido}"><span class="phase-k">${fz.k + 1}/${FASES.length}</span><span class="row-t"><b id="jFase">${fz.f[1]}</b><small id="jFaseD">${estado === 'feito' ? 'Fase alcançada' : fz.prox ? `Próxima: ${fz.prox[1].toLowerCase()} em ${duracao(fz.prox[0] - decorrido)}` : fz.f[2]}</small></span>${ICO.seta}</button>` : ''}
      <div class="fast-info">
        <div><small>Começo</small><b>${quando(j.inicio)}</b></div>
        <div><small>${estado === 'feito' ? 'Terminou' : 'Fim previsto'}</small><b>${quando(j.fim || j.fimPrev)}</b></div>
        <div><small>${passou ? 'Além da meta' : estado === 'ativo' ? 'Faltam' : estado === 'feito' ? 'Meta' : 'Duração'}</small><b id="jFalta">${estado === 'ativo' ? duracao(Math.abs(j.fimPrev - now) / H) : fmt(total, 0) + ' h'}</b></div>
      </div>
      <div class="fast-act">
        ${estado === 'ativo' ? `<button class="btn ${passou ? '' : 'ghost'}" data-act="encerrarJejum" data-id="${j.id}">${ICO.stop} Encerrar</button>` : ''}
        ${estado === 'futuro' ? `<button class="btn ghost" data-act="comecarAgora" data-id="${j.id}">${ICO.play} Começar agora</button>` : ''}
        <button class="btn ghost" data-act="editarJejum" data-id="${j.id}">Editar</button>
      </div>
    </section>`;
  }
  // Atualiza o cartão do jejum e troca de dia à meia-noite
  let timer, diaRender = hoje();
  function tick() {
    clearInterval(timer);
    const upd = () => {
      if (hoje() !== diaRender) return render();
      const el = $('[data-jejum]'); if (!el) return;
      const j = S.jejuns.find(x => x.id === el.dataset.jejum); if (!j || j.fim) return;
      const now = Date.now(), total = (j.fimPrev - j.inicio) / H;
      const est = j.inicio > now ? 'futuro' : now >= j.fimPrev ? 'ativo-meta' : 'ativo';
      if (est !== el.dataset.estado) return render();
      if (est === 'futuro') { $('#jTempo') && ($('#jTempo').textContent = duracao((j.inicio - now) / H)); return; }
      const dec = (now - j.inicio) / H, fz = faseDe(dec);
      $('#jTempo') && ($('#jTempo').textContent = duracao(dec));
      $('#jFalta') && ($('#jFalta').textContent = duracao(Math.abs(j.fimPrev - now) / H));
      $('#jFase') && ($('#jFase').textContent = fz.f[1]);
      $('#jFaseD') && ($('#jFaseD').textContent = fz.prox ? `Próxima: ${fz.prox[1].toLowerCase()} em ${duracao(fz.prox[0] - dec)}` : fz.f[2]);
      const r = $('#ringFg'); if (r) r.setAttribute('stroke-dashoffset', r.dataset.c * (1 - Math.min(1, dec / total)));
    };
    upd(); timer = setInterval(upd, 15000);
  }

  // ----- Calendário -----
  let calSel = null;
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
        const tag = calSel ? `button data-act="selDia" data-iso="${iso}" aria-pressed="${calSel.has(iso)}"` : `a href="#dia-${iso}"`;
        return `<${tag} class="cal-d ${d.getMonth() !== m ? 'out' : ''} ${iso === hoje() ? 'today' : ''} ${calSel?.has(iso) ? 'sel' : ''} ${jc}">
          <span class="n">${d.getDate()}</span>
          <span class="dots">${dd.refeicoes.length ? '<i class="d-ref"></i>' : ''}${dd.rotina.some(r => r.tipo === 'sol') ? '<i class="d-sol"></i>' : ''}${dd.rotina.some(r => r.tipo === 'treino') ? '<i class="d-treino"></i>' : ''}</span></${calSel ? 'button' : 'a'}>`; }).join('')}
    </div>
    ${calSel ? `<div class="selbar"><span class="row-t"><b>${calSel.size ? `${calSel.size} ${calSel.size === 1 ? 'dia selecionado' : 'dias selecionados'}` : 'Toque nos dias'}</b><small>Apaga refeições, rotina e jejuns que começam nesses dias</small></span><div class="row"><button class="btn ghost grow" data-act="calSel">Cancelar</button><button class="btn grow" data-act="apagarDias" ${calSel.size ? '' : 'disabled'}>${ICO.lixo} Apagar</button></div></div>` : `
    <div class="legend"><span><i class="d-ref"></i>Refeição</span><span><i class="d-sol"></i>Sol</span><span><i class="d-treino"></i>Treino</span><span><i class="d-fast"></i>Jejum</span></div>
    ${jj ? `<button class="card-btn" data-act="editarJejum" data-id="${jj.id}">${icone('jejum', 't-fast')}<span class="row-t"><b>${ativo ? `Em jejum há ${duracao((Date.now() - jj.inicio) / H)}` : 'Próximo jejum'}</b><small>${ativo ? `Desde ${quando(jj.inicio)} · meta de ${fmt((jj.fimPrev - jj.inicio) / H, 0)} h` : `${quando(jj.inicio)} até ${quando(jj.fimPrev)} · ${fmt((jj.fimPrev - jj.inicio) / H, 0)} h`}</small></span>${ICO.seta}</button>` : ''}
    <button class="card-btn" data-act="compras">${icone('lista')}<span class="row-t"><b>Lista de compras</b><small>Tudo o que está planejado no calendário</small></span>${ICO.seta}</button>
    <div class="row wrap"><button class="btn" data-act="planejarJejum">Planejar jejum</button><a class="btn ghost" href="#dia-${hoje()}">Ir para hoje</a><button class="btn ghost" data-act="calSel">Selecionar dias</button></div>`}`;
  }

  // ----- Alimentos -----
  const filtro = { q: '', cat: S.favs.length ? 'fav' : '', ord: 'proteina_g', base: 'g' };
  // Alimentos usados nos últimos 30 dias, do mais recente para o mais antigo
  function recentes() {
    const ids = [];
    for (let k = 0; k <= 30; k++) { const d = diaDe(isoDe(somaDias(new Date(), -k)));
      [...d.refeicoes].sort((a, b) => (b.hora || '').localeCompare(a.hora || '')).forEach(r => r.itens.forEach(it => ids.push(it.a))); (d.liquidos || []).forEach(l => ids.push(l.a)); }
    return [...new Set(ids)].filter(id => FOOD(id) && !FOOD(id).oculto).slice(0, 24);
  }
  const chipsCat = act => [['fav', '★ Favoritos'], ...(act === 'catP' && recentes().length ? [['rec', 'Recentes']] : []), ['', 'Todos'], ...Object.entries(CATS).filter(([k]) => !(act === 'catP' && k === 'bebidas' && !ctx.receita))].map(([k, n]) => `<button class="chip ${(act === 'catP' ? filtro.catP : filtro.cat) === k ? 'on' : ''} ${k === 'fav' ? 'fav' : ''}" data-act="${act}" data-c="${k}">${n.split(',')[0]}</button>`).join('');
  function vAlimentos() {
    return `
    <header class="head"><div class="head-t"><p class="eyebrow">${alimentos().length} alimentos · por 100 g</p><h1>Alimentos</h1></div></header>
    <input type="search" id="busca" class="search" placeholder="Buscar alimento" value="${esc(filtro.q)}" data-act="busca" aria-label="Buscar alimento">
    <div class="chips">
      <button class="chip sel" data-act="escolherOrdem">Mais ${esc(NUT[filtro.ord].n.toLowerCase())}${filtro.base === 'kcal' ? ' por kcal' : ''} ▾</button>
      ${chipsCat('cat')}
    </div>
    <div id="lista">${listaAlimentos()}</div>
    <div class="row wrap"><button class="btn ghost grow" data-act="novaReceita">${ICO.mais} Combinar alimentos</button><button class="btn ghost grow" data-act="novoAlimento">Cadastrar do zero</button></div>
    <p class="muted small">Combinar junta alimentos que já existem (por exemplo, café + óleo de coco + leite, ou água + sal) num só, com os nutrientes somados.</p>`;
  }
  const semAcento = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function listaAlimentos(picker = false) {
    const q = semAcento((picker ? filtro.qP : filtro.q) || '').trim(), k = filtro.ord;
    const modo = picker ? (ctx.liq ? 'liq' : ctx.receita ? 'todos' : 'ref') : 'todos';
    const cat = modo === 'liq' ? '' : picker ? filtro.catP : filtro.cat;
    const rec = cat === 'rec' ? recentes() : null;
    const L = alimentos().filter(f => (modo === 'todos' || (modo === 'liq') === ehLiquido(f)) && (!cat || (cat === 'fav' ? ehFav(f.id) : cat === 'rec' ? rec.includes(f.id) : f.categoria === cat)) && (!q || semAcento(f.nome).includes(q)))
      .map(f => ({ f, s: filtro.base === 'kcal' ? (f.kcal ? valor(f, k) / f.kcal * 100 : 0) : valor(f, k) })).sort((a, b) => rec ? rec.indexOf(a.f.id) - rec.indexOf(b.f.id) : b.s - a.s);
    const maior = f => ['proteina_g', 'gordura_g', 'carboidrato_g', 'fibra_g'].map(n => [n, f[n] || 0]).sort((a, b) => b[1] - a[1])[0];
    const extra = (f, s) => MACROS.some(m => m.k === k) || !s ? '' : ` <i>|</i> ${esc(NUT[k].n.split(' (')[0])} ${fmt(s)} ${NUT[k].u}`;
    if (!L.length && cat === 'rec') return '<p class="empty">Nada usado nos últimos 30 dias.</p>';
    if (!L.length) return cat === 'fav' && !q ? '<p class="empty">Nenhum favorito ainda. Abra um alimento e toque na estrela para guardar os que você mais usa.</p>' : '<p class="empty">Nenhum alimento encontrado.</p>';
    return `<div class="rows foods">${L.map(({ f, s }) => `<div class="food"><button class="food-main" data-act="${picker ? 'escolher' : 'verAlimento'}" data-a="${esc(f.id)}">
      ${foto(f)}<span class="row-t"><b>${esc(f.nome)}</b><small>${esc((CATS[f.categoria] || '').split(',')[0])} <i>|</i> ${fmt(f.kcal, 0)} kcal${extra(f, s)}</small></span>
      ${(([n, v]) => v >= 0.5 ? `<span class="fv"><small>${NUT[n].n}</small><b>${fmt(v)} g</b></span>` : '<span class="fv"><small>–</small></span>')(maior(f))}${picker ? `<span class="add">${ICO.mais}</span>` : ''}</button>
      ${picker ? '' : `<button class="fav-btn ${ehFav(f.id) ? 'on' : ''}" data-act="fav" data-a="${esc(f.id)}" aria-pressed="${ehFav(f.id)}" aria-label="${ehFav(f.id) ? 'Tirar dos favoritos' : 'Favoritar'} ${esc(f.nome)}">${ICO.estrela}</button>`}</div>`).join('')}</div>`;
  }

  // Linha de uma refeição pronta (do app ou salva por você)
  const linhaModelo = (k, act, iso, ic = ICO.seta) => { const r = ref(k), t = soma(r.itens);
    return `<button class="row-main solo" data-act="${act}" data-k="${esc(k)}" ${iso ? `data-iso="${iso}"` : ''}>${foto(iconeDe(r))}<span class="row-t"><b>${esc(tituloModelo(k))}</b><small>${fmt(t.kcal, 0)} kcal · ${fmt(t.proteina_g, 0)} g prot · ${fmt(t.gordura_g, 0)} g gord</small></span>${ic}</button>`; };

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
    <button class="auto-card" data-act="gerarAuto">${icone('estrela', 't-fav')}<span class="row-t"><b>Criar dieta com meus favoritos</b><small>${S.favs.length ? `${S.favs.length} ${S.favs.length === 1 ? 'favorito' : 'favoritos'} · monta a semana nas suas metas` : 'Marque alimentos com a estrela primeiro'}</small></span>${ICO.seta}</button>
    <section class="group"><h2 class="label">Recomendadas</h2><div class="stack">${RECS.map(d => cardDieta(d)).join('')}</div></section>
    <section class="group"><h2 class="label">Minhas</h2>
      ${S.dietas.length ? `<div class="stack">${S.dietas.map(d => cardDieta(d, true)).join('')}</div>` : '<p class="empty">Monte uma semana no calendário e salve aqui para repetir depois.</p>'}
      <button class="btn ghost" data-act="salvarSemana">Salvar uma semana do calendário</button></section>
    <section class="group"><h2 class="label">Minhas refeições</h2>
      ${S.refsSalvas.length ? `<div class="rows">${S.refsSalvas.map(r => linhaModelo(r.id, 'verModelo')).join('')}</div>` : '<p class="empty">Abra uma refeição do dia e toque em "Salvar como pronta" para reutilizar depois.</p>'}</section>
    <section class="group"><h2 class="label">Refeições prontas</h2>
      <div class="rows">${Object.keys(MODELOS).map(k => linhaModelo(k, 'verModelo')).join('')}</div></section>`;
  }

  // ----- Resumo -----
  let semRes = inicioSemana(new Date()), nutRes = 'proteina_g', soFeito = false;
  function vResumo() {
    const dias = Array.from({ length: 7 }, (_, k) => isoDe(somaDias(semRes, k)));
    const L = dias.map(iso => ({ iso, t: totalDia(iso, soFeito), sol: minutos(iso, 'sol', soFeito), tr: minutos(iso, 'treino', soFeito), j: horasJejumDia(iso, soFeito) }));
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
    <button class="card-btn" data-act="microsSemana">${icone('prato')}<span class="row-t"><b>Vitaminas e minerais da semana</b><small>% da referência para 7 dias</small></span>${ICO.seta}</button>
    ${painelPeso()}
    <button class="card-btn" data-act="historicoJejum">${icone('historico')}<span class="row-t"><b>Histórico de jejuns</b><small>${(() => { const f = S.jejuns.filter(j => j.fim); return f.length ? `${f.length} ${f.length === 1 ? 'jejum feito' : 'jejuns feitos'} · o mais longo: ${duracao(Math.max(...f.map(j => (j.fim - j.inicio) / H)))}` : 'Nenhum jejum concluído ainda'; })()}</small></span>${ICO.seta}</button>
    <button class="card-btn" data-act="compras" data-sem="${isoDe(semRes)}">${icone('lista')}<span class="row-t"><b>Lista de compras desta semana</b><small>${semRes.getDate()}/${semRes.getMonth() + 1} – ${fimSem.getDate()}/${fimSem.getMonth() + 1}</small></span>${ICO.seta}</button>`;
  }

  // ----- Metas e dados -----
  const LIM = { kcal: [1200, 4500, 50], proteina_g: [60, 320, 5], gordura_g: [30, 320, 5], carboidrato_g: [0, 400, 5], fibra_g: [0, 80, 1] };
  function vMetas() {
    return `
    <header class="head"><a class="back" href="#hoje" aria-label="Voltar">${ICO.voltar}</a><div class="head-t"><p class="eyebrow">Ajustes</p><h1>Metas e dados</h1></div></header>
    <section class="panel"><h2 class="label">Metas por dia</h2>
      ${MACROS.map(m => `<div class="slider"><div class="slider-h"><label for="meta-${m.k}">${m.n}</label><b id="v-meta-${m.k}">${fmt(S.metas[m.k], 0)} ${m.u}</b></div>${range('meta-' + m.k, ...LIM[m.k], S.metas[m.k], 'meta', `data-k="${m.k}" data-u="${m.u}"`)}</div>`).join('')}
      <p class="muted small" id="kcalCheck">${checkKcal()}</p>
      <button class="btn ghost" data-act="calcMetas">Calcular pelas minhas medidas</button>
      <p class="muted small">Vitaminas e minerais usam a referência diária para homem adulto (DRI).</p></section>
    <section class="panel"><h2 class="label">Backup</h2>
      <p class="muted small">Os dados ficam neste aparelho. Exporte para guardar uma cópia ou levar do iPhone para o computador. ${S.ultimoBackup ? `Último backup: ${quando(S.ultimoBackup)}.` : 'Você ainda não fez nenhum backup.'}</p>
      <div class="row wrap"><button class="btn" data-act="exportar">Exportar</button><label class="btn ghost">Importar<input type="file" accept="application/json,.json" data-act="importar" hidden></label><button class="btn ghost" data-act="textoBackup">Copiar como texto</button></div></section>
    ${S.custom.some(f => !f.oculto) ? `<section class="panel"><h2 class="label">Alimentos que você cadastrou</h2><div class="rows">${S.custom.filter(f => !f.oculto).map(f => `<div class="row-item"><span class="row-main">${foto(f)}<span class="row-t"><b>${esc(f.nome)}</b></span></span><button class="tick plain" data-act="delCustom" data-id="${f.id}" aria-label="Apagar">${ICO.lixo}</button></div>`).join('')}</div></section>` : ''}
    <section class="panel"><h2 class="label">Recomeçar</h2><p class="muted small">${S.exemplo ? 'A semana atual veio preenchida como exemplo. ' : ''}Apaga o calendário, os jejuns e as dietas salvas.</p><button class="btn ghost danger" data-act="resetar">Apagar tudo</button></section>
    <p class="muted small">Valores aproximados por 100 g cru (USDA FoodData Central e TACO). Ícones: Fluent Emoji, Microsoft (licença MIT).</p>`;
  }

  // ---------- Painel (sheet) ----------
  let ctx = {};
  function sheet(html, c = {}) { ctx = c; $('#sheet-c').innerHTML = html; $('#sheet').hidden = false; document.body.classList.add('locked'); }
  function fechar() { $('#sheet').hidden = true; document.body.classList.remove('locked'); ctx = {}; }
  const topo = (titulo, sub = '', voltar = '') => `<div class="sheet-h">${voltar ? `<button class="icon-btn" data-act="${voltar}" aria-label="Voltar">${ICO.voltar}</button>` : ''}<div class="head-t"><h2>${titulo}</h2>${sub ? `<p class="muted small">${sub}</p>` : ''}</div><button class="icon-btn" data-act="fechar" aria-label="Fechar">${ICO.fechar}</button></div>`;
  // Aviso rápido. Com desfazer, mostra o botão Desfazer por alguns segundos.
  let snapDesfazer = null;
  function toast(msg, desfazer = false) {
    const t = $('#toast'); if (!desfazer) snapDesfazer = null;
    t.innerHTML = `<span>${esc(msg)}</span>${desfazer ? '<button class="undo" data-act="desfazer">Desfazer</button>' : ''}`; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; snapDesfazer = null; }, desfazer ? 6000 : 2400);
  }
  // Roda uma mudança que pode ser desfeita: guarda o estado antes, salva, redesenha e mostra Desfazer
  function comDesfazer(msg, fn) {
    const snap = JSON.stringify(S);
    const r = fn(); if (r === false) return;
    salvar(); render(); snapDesfazer = snap; toast(typeof r === 'string' ? r : msg, true);
  }
  function confirmar(msg, acao, rotulo = 'Confirmar') { sheet(`${topo(esc(msg))}<div class="row end"><button class="btn ghost" data-act="fechar">Cancelar</button><button class="btn" data-act="okConfirmar">${esc(rotulo)}</button></div>`, { acao }); }

  // Adicionar ao dia
  function sheetAdicionar(iso) {
    const ops = [['novaRef', 'prato', 'Refeição', 'Em branco ou pronta'], ['novoLiq', 'gota', 'Líquido', 'Água, café, água com sal'], ['addSol', 'sol', 'Sol', 'Minutos de sol'], ['addTreino', 'treino', 'Treino', 'Minutos de treino'], ['planejarJejum', 'jejum', 'Jejum', 'Início e duração'], ['addPeso', 'balanca', 'Peso', 'Peso do dia']];
    sheet(`${topo('Adicionar', tituloData(iso))}<div class="grid-ops">${ops.map(([a, i, n, s]) => `<button class="op" data-act="${a}" data-iso="${iso}">${icone(i, 't-' + i)}<b>${n}</b><small>${s}</small></button>`).join('')}</div>`, { iso });
  }
  function sheetNovaRef(iso) {
    sheet(`${topo('Nova refeição', tituloData(iso), 'voltarAdd')}
      <button class="row-main solo" data-act="refBranco" data-iso="${iso}">${icone('mais')}<span class="row-t"><b>Em branco</b><small>Você escolhe os alimentos</small></span></button>
      ${S.refsSalvas.length ? `<h3 class="label">Minhas</h3><div class="rows">${S.refsSalvas.map(r => linhaModelo(r.id, 'refModelo', iso, ICO.mais)).join('')}</div>` : ''}
      <h3 class="label">Prontas</h3>
      <div class="rows">${Object.keys(MODELOS).map(k => linhaModelo(k, 'refModelo', iso, ICO.mais)).join('')}</div>`, { iso });
  }

  // Editar refeição
  const acharRef = (iso, id) => diaEdit(iso).refeicoes.find(r => r.id === id);
  const refCtx = () => ctx.rasc || acharRef(ctx.iso, ctx.id);
  const passo = f => f?.passo || f?.un || (f?.kcal > 500 ? 5 : 25);
  const unid = (f, g) => f?.un ? ` · ${fmt(g / f.un, 1)} ${f.unNome || 'un'}` : '';
  function sheetRef(iso, id, rasc) {
    const r = rasc || acharRef(iso, id); if (!r) return fechar();
    const t = soma(r.itens);
    sheet(`<div class="sheet-h"><div class="head-t"><input class="title-in" value="${esc(r.nome)}" data-act="refNome" aria-label="Nome da refeição"><p class="muted small">${tituloData(iso)}</p></div><button class="icon-btn" data-act="fechar" aria-label="Fechar">${ICO.fechar}</button></div>
      <div class="row wrap"><label class="inline">Horário <input type="time" value="${esc(r.hora || '')}" data-act="refHora"></label><span class="muted small">${resumoMacros(t)} · ${fmt(t.gordura_g, 0)} g gord</span></div>
      ${r.itens.length ? `<div class="rows">${r.itens.map((it, k) => { const f = FOOD(it.a);
        return `<div class="item">${foto(f)}<span class="row-t"><b>${esc(f?.nome || it.a)}</b><small>${fmt(soma([it]).kcal, 0)} kcal${unid(f, it.g)}</small></span>
          <span class="step"><button data-act="menos" data-k="${k}" aria-label="Menos">−</button><input type="number" inputmode="numeric" min="0" value="${it.g}" data-act="itemG" data-k="${k}" aria-label="Gramas"><span class="u">g</span><button data-act="maisG" data-k="${k}" aria-label="Mais">+</button></span>
          <button class="icon-btn sm" data-act="delItem" data-k="${k}" aria-label="Remover">${ICO.fechar}</button></div>`; }).join('')}</div>` : '<p class="empty">Sem alimentos ainda.</p>'}
      ${rasc ? `<button class="btn ghost" data-act="addItem">${ICO.mais} Adicionar alimento</button>
      <div class="row between"><button class="btn ghost" data-act="fechar">Cancelar</button><button class="btn grow" data-act="addRasc" ${r.itens.length ? '' : 'disabled'}>Adicionar ao dia</button></div>`
      : `<button class="btn" data-act="addItem">${ICO.mais} Adicionar alimento</button>
      ${r.itens.length ? `<div class="row wrap"><button class="btn ghost sm grow" data-act="salvarPronta">Salvar como pronta</button><button class="btn ghost sm grow" data-act="copiarRef">${ICO.copiar} Copiar para outro dia</button></div>` : ''}
      <div class="row between"><button class="btn ghost danger" data-act="delRef">Apagar refeição</button><button class="btn ghost" data-act="feitoRefSheet">${r.feito ? 'Desmarcar' : 'Marcar como comida'}</button></div>`}`, rasc ? { tipo: 'ref', iso, rasc } : { tipo: 'ref', iso, id });
  }
  function sheetLiq(iso, id) {
    const l = liqsDe(iso).find(x => x.id === id); if (!l) return; const f = FOOD(l.a);
    sheet(`${topo(esc(f?.nome || l.a), tituloData(iso))}
      <div class="hero-food">${foto(f, 'lg')}${f?.beneficio ? `<p>${esc(f.beneficio)}</p>` : ''}</div>
      <div class="slider"><div class="slider-h"><span>Quantidade</span><b id="lLbl">${fmtL(l.g)}</b></div>${range('lG', 0, 4000, 50, l.g, 'liqG')}</div>
      <label class="inline">Horário <input type="time" id="lHora" value="${esc(l.hora || '')}"></label>
      <div class="row between"><button class="btn ghost danger" data-act="delLiq">Apagar</button><button class="btn" data-act="salvarLiq">Salvar</button></div>`, { tipo: 'liq', iso, id });
  }
  function sheetPicker() {
    sheet(`${topo(ctx.liq ? 'Escolher líquido' : 'Escolher alimento', ctx.liq ? tituloData(ctx.iso) : '', ctx.liq ? 'voltarAdd' : 'voltarRef')}
      <input type="search" id="buscaP" class="search" placeholder="Buscar" value="${esc(filtro.qP || '')}" data-act="buscaP" aria-label="Buscar">
      ${ctx.liq ? '' : `<div class="chips">${chipsCat('catP')}</div>`}
      <div id="listaP">${listaAlimentos(true)}</div>`, { ...ctx, tipo: 'picker' });
    setTimeout(() => $('#buscaP')?.focus({ preventScroll: true }), 60);
  }
  function sheetGramas(a) {
    const f = FOOD(a), liq = ehLiquido(f), st = liq ? 50 : passo(f), g0 = liq ? (f.id === 'agua-sal' ? 1000 : f.id === 'agua' ? 500 : 200) : f.passo ? 2 : f.un ? f.un * (f.un >= 100 ? 1 : 2) : (f.kcal > 500 ? 20 : 150), max = liq ? 4000 : f.passo ? 30 : f.un ? f.un * 12 : (f.kcal > 500 ? 150 : 600);
    sheet(`${topo(esc(f.nome), esc(CATS[f.categoria] || ''), 'voltarPicker')}
      <div class="hero-food">${foto(f, 'lg')}</div>
      <div class="slider"><div class="slider-h"><span>Quantidade</span><b id="gLbl">${liq ? fmtL(g0) : `${g0} g${unid(f, g0)}`}</b></div>${range('gIn', 0, max, st, g0, 'gramas', `data-a="${esc(a)}"`)}</div>
      <p class="muted small center" id="gPrev">${resumoMacros(soma([{ a, g: g0 }]))}</p>
      <button class="btn" data-act="confirmarItem" data-a="${esc(a)}">${ctx.liq ? 'Adicionar ao dia' : 'Adicionar'}</button>`, { ...ctx, tipo: 'gramas' });
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
    if (j) ini = j.inicio; else { const d = iso ? dataDe(iso) : new Date(); d.setHours(20, 0, 0, 0); ini = d.getTime();
      if (ini < Date.now()) { const n = new Date(); n.setMinutes(0, 0, 0); ini = n.getTime() + H; } }
    const horas = j ? Math.min(144, Math.max(12, Math.round((j.fimPrev - j.inicio) / H))) : (S.ultimaDuracao || 48);
    sheet(`${topo(j ? 'Jejum' : 'Planejar jejum', '', !j && ctx.iso ? 'voltarAdd' : '')}
      <label class="field">Começa<input type="datetime-local" id="jIni" value="${localInput(ini)}" data-act="jPrev"></label>
      <div class="slider"><div class="slider-h"><label for="jH">Duração</label><b id="v-jH">${rotHoras(horas)}</b></div>${range('jH', 12, 144, 4, horas, 'jHoras')}</div>
      <p class="fim-prev" id="jFim"></p>
      ${j ? '' : `<label class="toggle"><input type="checkbox" id="jPre" checked><span></span>Refeição pré-jejum gordurosa antes de começar</label>
      <label class="toggle"><input type="checkbox" id="jQuebra" checked><span></span>Quebra do jejum forte e nutritiva no fim</label>`}
      ${horas > 72 || !j ? `<p class="muted small" id="jAviso">Água com sal integral entra em cada dia de jejum. Acima de 72 h, reponha sódio, potássio e magnésio e tenha acompanhamento médico.</p>` : ''}
      <div class="row between">${j ? `<button class="btn ghost danger" data-act="delJejum">Apagar</button>` : '<span></span>'}<span class="row">${j && !j.fim && j.inicio <= Date.now() ? `<button class="btn ghost" data-act="encerrarJejum" data-id="${j.id}">Encerrar agora</button>` : ''}<button class="btn" data-act="salvarJejum">${j ? 'Salvar' : 'Planejar'}</button></span></div>`, { tipo: 'jejum', id, iso: ctx.iso });
    jPrev();
  }
  const rotHoras = h => `${h} h${h >= 24 ? ` · ${fmt(h / 24, 1)} ${h >= 48 ? 'dias' : 'dia'}` : ''}`;
  function jPrev() {
    const ini = new Date($('#jIni').value).getTime(), h = +$('#jH').value;
    $('#jFim').innerHTML = isNaN(ini) ? '' : `Termina <b>${quando(ini + h * H)}</b>`;
  }

  // Detalhe do alimento
  function sheetAlimento(a, g) {
    const f = FOOD(a); if (!f) return;
    g = g ?? (f.passo ? 5 : f.receita ? f.un : f.un >= 100 ? f.un : 100);
    const t = soma([{ a, g }]);
    sheet(`<div class="sheet-h"><div class="head-t"><h2>${esc(f.nome)}</h2><p class="muted small">${esc(CATS[f.categoria] || '')}</p></div>
        <button class="icon-btn star ${ehFav(a) ? 'on' : ''}" data-act="fav" data-a="${esc(a)}" aria-pressed="${ehFav(a)}" aria-label="${ehFav(a) ? 'Tirar dos favoritos' : 'Adicionar aos favoritos'}">${ICO.estrela}</button>
        <button class="icon-btn" data-act="fechar" aria-label="Fechar">${ICO.fechar}</button></div>
      <div class="hero-food">${foto(f, 'lg')}${f.beneficio ? `<p>${esc(f.beneficio)}</p>` : ''}</div>
      ${f.obs ? `<p class="note">${esc(f.obs)}</p>` : ''}
      ${f.receita ? `<button class="btn ghost" data-act="editarReceita" data-a="${esc(a)}">Editar combinação</button>` : ''}
      <div class="slider"><div class="slider-h"><span>Quantidade</span><b id="vqLbl">${g} g${unid(f, g)}</b></div>${range('qG', f.passo ? 1 : 10, f.passo ? 30 : f.receita ? Math.max(500, f.un * 3) : f.un >= 100 ? f.un * 8 : f.kcal > 500 ? 200 : 500, passo(f), g, 'qtd', `data-a="${esc(a)}"`)}</div>
      <div class="quad" id="quad">${quad(t)}</div>
      <details class="more"><summary>Vitaminas e minerais</summary><div id="micA">${listaMicros(t, 1, true)}</div></details>
      <div class="row wrap"><input type="date" id="addData" value="${hoje()}" aria-label="Dia"><button class="btn grow" data-act="addAoDia" data-a="${esc(a)}">Adicionar ao dia</button></div>
      <p class="muted small">${esc(f.fonte || '')}</p>`, { tipo: 'alimento', a });
  }
  const quad = t => MACROS.map(m => `<div class="m-${m.k}"><small>${m.n}</small><b>${fmt(t[m.k])}<i> ${m.u}</i></b></div>`).join('');

  function sheetNutrientes(iso) {
    const t = totalDia(iso);
    sheet(`${topo('Nutrientes do dia', tituloData(iso))}${barrasMacros(t)}<p class="muted small">${t.kcal ? Math.round(t.gordura_g * 9 / t.kcal * 100) : 0}% das calorias vêm da gordura.</p>
      <h3 class="label">Vitaminas e minerais</h3>${listaMicros(t)}${sugestoes(t)}<p class="muted small">Soma dos nutrientes listados na base. O que falta conta como zero.</p>`);
  }
  function sheetDieta(id) {
    const dt = RECS.find(d => d.id === id) || S.dietas.find(d => d.id === id), minha = !RECS.includes(dt);
    const seg = inicioSemana(new Date()), op = [0, 7, 14].map(n => somaDias(seg, n));
    sheet(`${topo(esc(dt.nome), esc(dt.desc || ''))}
      <div class="rows">${dt.dias.map((_, k0) => { const off = dt.jejum?.length ? dt.jejum[0].dia : 0, k = (off + k0) % 7, d = dt.dias[k], t = soma(d.refeicoes.flatMap(r => r.itens)), j = (dt.jejum || []).find(x => x.dia === k);
        return `<div class="row-item"><span class="row-main"><span class="dname" data-k0="${k0}">${DIAS_C[(inicioPadrao(dt) + k0) % 7]}</span><span class="row-t"><b>${d.refeicoes.length ? d.refeicoes.map(r => esc(r.nome)).join(', ') : 'Sem refeições'}</b><small>${d.refeicoes.length ? resumoMacros(t) : 'jejum · água com sal'}${j ? ` · jejum começa ${j.hora}, ${j.horas} h` : ''}${d.rotina.length ? ' · ' + d.rotina.map(r => `${TIPOS_ROT[r.tipo].toLowerCase()} ${r.min}`).join(', ') + ' min' : ''}</small></span></span></div>`; }).join('')}</div>
      <label class="field">Aplicar na semana de<select id="semAplicar">${op.map((d, k) => `<option value="${isoDe(d)}">${['Esta semana', 'Próxima semana', 'Daqui a 2 semanas'][k]} · ${d.getDate()}/${d.getMonth() + 1}</option>`).join('')}</select></label>
      ${dt.jejum?.length ? `<div class="row wrap"><label class="field grow">Começar o jejum<select id="diaAplicar" data-act="diaAplicar">${DIAS.map((n, k) => `<option value="${k}" ${k === inicioPadrao(dt) ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label class="field">Hora<input type="time" id="horaAplicar" value="${esc(dt.jejum[0].hora)}"></label></div>
      <p class="muted small">A semana começa no dia do pré-jejum, que fica no mesmo dia em que o jejum começa.</p>` : ''}
      <label class="toggle"><input type="checkbox" id="substituir" checked><span></span>Substituir o que já está nesses dias</label>
      <div class="row between">${minha ? `<button class="btn ghost danger" data-act="delDieta" data-id="${dt.id}">Apagar</button>` : '<span></span>'}<button class="btn" data-act="aplicar" data-id="${dt.id}">Aplicar no calendário</button></div>`);
  }
  function sheetModelo(k) {
    const r = ref(k), t = soma(r.itens);
    const minha = !MODELOS[k];
    sheet(`${topo(esc(tituloModelo(k)), resumoMacros(t) + ` · ${fmt(t.gordura_g, 0)} g gord`)}
      <div class="rows">${r.itens.map(it => { const f = FOOD(it.a); return `<div class="item">${foto(f)}<span class="row-t"><b>${esc(f?.nome || it.a)}</b><small>${fmt(soma([it]).kcal, 0)} kcal</small></span><span class="muted">${it.g} g</span></div>`; }).join('')}</div>
      <div class="row wrap"><input type="date" id="addData" value="${hoje()}" aria-label="Dia"><button class="btn grow" data-act="modeloAoDia" data-k="${esc(k)}">Adicionar ao dia</button></div>
      ${minha ? `<button class="btn ghost danger" data-act="delSalva" data-k="${esc(k)}">Apagar esta refeição pronta</button>` : ''}`);
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
        <label class="field">Categoria<select name="categoria">${Object.entries(CATS).filter(([k]) => k !== 'receitas').map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
        <div class="grid2">${MACROS.map(m => `<label class="field">${m.n} (${m.u})<input name="${m.k}" type="number" step="0.1" min="0" value="0"></label>`).join('')}</div>
        <details class="more"><summary>Vitaminas e minerais</summary><div class="grid2">${MICROS.map(m => `<label class="field">${m.n} (${m.u})<input name="${m.k}" type="number" step="0.01" min="0"></label>`).join('')}</div></details>
        <button class="btn" type="submit">Salvar alimento</button></form>`);
  }

  // ---------- Peso ----------
  const pesoAntes = iso => [...S.pesos].reverse().find(p => p.d < iso);
  function variacaoPeso(iso) {
    const p = S.pesos.find(x => x.d === iso), a = pesoAntes(iso);
    if (!p || !a) return 'Primeiro registro';
    const dif = p.kg - a.kg, d = dataDe(a.d);
    return `${dif > 0 ? '+' : dif < 0 ? '−' : ''}${fmt(Math.abs(dif), 1)} kg desde ${d.getDate()}/${d.getMonth() + 1}`;
  }
  function painelPeso() {
    const P = S.pesos, u = P[P.length - 1];
    if (!u) return `<button class="card-btn" data-act="addPeso">${icone('balanca')}<span class="row-t"><b>Peso</b><small>Registre para ver a evolução junto com a dieta e os jejuns</small></span>${ICO.mais}</button>`;
    const ref30 = [...P].reverse().find(p => dataDe(u.d) - dataDe(p.d) >= 28 * DIA_MS) || P[0], dif = u.kg - ref30.kg, dias = Math.round((dataDe(u.d) - dataDe(ref30.d)) / DIA_MS);
    return `<section class="panel">
      <div class="row between"><h2 class="label">Peso</h2><button class="pill" data-act="addPeso">Registrar</button></div>
      <div class="wnums"><b>${fmt(u.kg, 1)}<i> kg</i></b><small>${dias ? `${dif > 0 ? '+' : dif < 0 ? '−' : ''}${fmt(Math.abs(dif), 1)} kg em ${dias} ${dias === 1 ? 'dia' : 'dias'}` : 'Primeiro registro'}${S.perfil?.alturaCm ? ` · IMC ${fmt(u.kg / (S.perfil.alturaCm / 100) ** 2, 1)}` : ''}</small></div>
      ${graficoPeso()}
    </section>`;
  }
  // Linha do peso nos últimos 60 dias, com os jejuns em faixas vermelhas atrás
  function graficoPeso() {
    const fim = dataDe(hoje()).getTime() + DIA_MS, ini = fim - 60 * DIA_MS, P = S.pesos.filter(p => dataDe(p.d).getTime() >= ini);
    if (P.length < 2) return '<p class="muted small">Registre mais um dia para ver o gráfico.</p>';
    const t0 = Math.max(ini, dataDe(P[0].d).getTime() - DIA_MS), W = 300, Hh = 110, pad = 8;
    const min = Math.min(...P.map(p => p.kg)) - 0.5, max = Math.max(...P.map(p => p.kg)) + 0.5;
    const x = t => ((t - t0) / (fim - t0)) * W, y = kg => pad + (1 - (kg - min) / (max - min)) * (Hh - 2 * pad);
    const pts = P.map(p => [x(dataDe(p.d).getTime() + DIA_MS / 2), y(p.kg)]);
    const faixas = S.jejuns.filter(j => fimJ(j) > t0 && j.inicio < fim && j.inicio <= Date.now()).map(j => { const a = x(Math.max(t0, j.inicio)), b = x(Math.min(fim, j.fim || Math.min(Date.now(), fimJ(j)))); return `<rect x="${a.toFixed(1)}" y="0" width="${Math.max(1, b - a).toFixed(1)}" height="${Hh}" class="wfast"/>`; }).join('');
    const d0 = new Date(t0), d1 = dataDe(hoje());
    return `<div class="wchart"><svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" aria-label="Gráfico do peso">${faixas}
      <polyline points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" class="wline"/>${pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5" class="wdot"/>`).join('')}</svg>
      <div class="wleg"><span>${d0.getDate()}/${d0.getMonth() + 1}</span><span><i class="d-fast"></i>jejum</span><span>${d1.getDate()}/${d1.getMonth() + 1}</span></div></div>`;
  }
  function sheetPeso(iso) {
    iso = iso || hoje();
    const p = S.pesos.find(x => x.d === iso), base = p || [...S.pesos].reverse().find(x => x.d <= iso) || S.pesos[S.pesos.length - 1];
    sheet(`${topo('Peso', 'De manhã, em jejum, é o jeito mais constante de comparar', ctx.iso && !p ? 'voltarAdd' : '')}
      <div class="row wrap"><label class="field grow">Dia<input type="date" id="pData" value="${iso}" max="${hoje()}"></label>
      <label class="field grow">Peso (kg)<input type="text" id="pKg" inputmode="decimal" autocomplete="off" value="${base ? fmt(base.kg, 1) : ''}" placeholder="80,0"></label></div>
      <div class="row between">${p ? '<button class="btn ghost danger" data-act="delPeso">Apagar</button>' : '<span></span>'}<button class="btn" data-act="salvarPeso">Salvar</button></div>`, { tipo: 'peso', iso, ref: p ? iso : null });
    setTimeout(() => { const i = $('#pKg'); i?.focus({ preventScroll: true }); i?.select?.(); }, 60);
  }

  // ---------- Metas pelas medidas ----------
  const checkKcal = () => { const m = S.metas, k = m.proteina_g * 4 + m.carboidrato_g * 4 + m.gordura_g * 9, d = k - m.kcal;
    return Math.abs(d) <= m.kcal * 0.08 ? `Proteína, gordura e carboidrato somam ${fmt(k, 0)} kcal, de acordo com a meta.` : `Proteína, gordura e carboidrato somam ${fmt(k, 0)} kcal, ${fmt(Math.abs(d), 0)} kcal ${d > 0 ? 'acima' : 'abaixo'} da meta de calorias.`; };
  function sheetCalcMetas() {
    const pf = S.perfil || {}, kg = S.pesos[S.pesos.length - 1]?.kg || pf.kg || '';
    const seg = (id, ops, v) => `<div class="seg" id="${id}">${ops.map(([k, n]) => `<button class="${v === k ? 'on' : ''}" data-act="autoOp" data-v="${k}">${n}</button>`).join('')}</div>`;
    sheet(`${topo('Calcular metas', 'Gasto pela fórmula de Mifflin-St Jeor e proteína pelo peso')}
      <div class="grid2"><label class="field">Peso (kg)<input type="text" id="cKg" inputmode="decimal" autocomplete="off" value="${kg ? fmt(kg, 1) : ''}"></label>
      <label class="field">Altura (cm)<input type="number" id="cAlt" inputmode="numeric" value="${pf.alturaCm || ''}"></label>
      <label class="field">Idade<input type="number" id="cIdade" inputmode="numeric" value="${pf.idade || ''}"></label>
      <div class="field">Sexo${seg('cSexo', [['m', 'Homem'], ['f', 'Mulher']], pf.sexo || 'm')}</div></div>
      <div class="field">Atividade${seg('cAtiv', [['1.375', 'Leve'], ['1.55', 'Moderada'], ['1.725', 'Alta']], String(pf.ativ || '1.55'))}</div>
      <div class="field">Objetivo${seg('cObj', [['perder', 'Perder gordura'], ['manter', 'Manter'], ['ganhar', 'Ganhar músculo']], pf.obj || 'manter')}</div>
      <p class="muted small">Proteína de 2 g por kg (2,2 g para perder gordura), carboidrato baixo vindo de tubérculos e frutas, e o resto em gordura natural.</p>
      <button class="btn" data-act="aplicarCalc">Usar estas metas</button>`);
  }

  // ---------- Sugestões para completar o dia ----------
  function sugestoes(t) {
    if (t.kcal < 300) return '';
    const baixos = MICROS.filter(m => m.k !== 'sodio_mg' && t[m.k] / m.ref < 0.5).sort((a, b) => t[a.k] / a.ref - t[b.k] / b.ref).slice(0, 3);
    if (!baixos.length) return '';
    const fontes = m => DB.alimentos.filter(f => !['bebidas', 'extras'].includes(f.categoria) && f.id !== 'agua-sal' && valor(f, m.k) > 0)
      .map(f => ({ f, v: valor(f, m.k) / m.ref * (f.un >= 100 ? f.un : 100) / 100 + (ehFav(f.id) ? 0.15 : 0) })).sort((a, b) => b.v - a.v).slice(0, 3).map(x => x.f);
    return `<h3 class="label">Para completar</h3><div class="rows">${baixos.map(m => `<div class="sug"><span class="row-t"><b>${esc(m.n)}</b><small>${pct(t[m.k], m.ref)}% da referência</small></span><span class="sug-f">${fontes(m).map(f => `<button class="chip" data-act="verAlimento" data-a="${esc(f.id)}">${esc(f.nome)}</button>`).join('')}</span></div>`).join('')}</div>`;
  }

  // ---------- Lista de compras ----------
  const UNID_COMPRA = { ovo: 'ovos', gema: 'gemas', 'ovo-codorna': 'ovos de codorna', 'ovo-pata': 'ovos de pata', laranja: 'laranjas', kiwi: 'kiwis', banana: 'bananas', maca: 'maçãs', limao: 'limões', tomate: 'tomates', cebola: 'cebolas' };
  function itensCompra(dias) {
    const tot = {};
    const add = (a, g, prof = 0) => { const f = FOOD(a); if (!f || g <= 0 || prof > 3) return;
      if (f.receita) { const peso = f.receita.reduce((x, it) => x + it.g, 0) || 1; f.receita.forEach(it => add(it.a, it.g * g / peso, prof + 1)); return; }
      if (f.id === 'agua') return; tot[a] = (tot[a] || 0) + g; };
    dias.forEach(iso => { const d = diaDe(iso);
      d.refeicoes.filter(r => !r.feito).forEach(r => r.itens.forEach(it => add(it.a, it.g)));
      (d.liquidos || []).filter(l => !l.feito).forEach(l => add(l.a, l.g)); });
    return tot;
  }
  const qtdCompra = (f, g) => {
    if (f.un && f.un <= 150 && !f.passo && UNID_COMPRA[f.id]) { const n = Math.ceil(g / f.un - 0.05); return `${n} ${n === 1 ? f.nome.toLowerCase() : UNID_COMPRA[f.id]}`; }
    if (g >= 1000) return `${fmt(Math.ceil(g / 100) / 10, 1)} ${f.categoria === 'bebidas' ? 'L' : 'kg'}`;
    return `${fmt(g < 50 ? Math.ceil(g) : Math.ceil(g / 10) * 10, 0)} ${f.categoria === 'bebidas' ? 'ml' : 'g'}`;
  };
  function sheetCompras(op = {}) {
    const seg0 = inicioSemana(new Date());
    const ops = [['hoje7', 'Próximos 7 dias'], ['esta', 'Esta semana'], ['prox', 'Próxima semana']];
    const per = op.per || ctx.per || 'hoje7', sem = op.sem || ctx.sem;
    const ini = sem ? dataDe(sem) : per === 'hoje7' ? dataDe(hoje()) : per === 'esta' ? seg0 : somaDias(seg0, 7);
    const dias = Array.from({ length: 7 }, (_, k) => isoDe(somaDias(ini, k))), chave = dias[0], marcados = new Set(S.compras[chave] || []);
    const tot = itensCompra(dias), cats = [...DB.categorias.map(c => c.id), 'receitas'];
    const grupos = cats.map(c => [c, Object.keys(tot).filter(a => FOOD(a).categoria === c).sort((a, b) => FOOD(a).nome.localeCompare(FOOD(b).nome))]).filter(([, L]) => L.length);
    const fimD = dataDe(dias[6]);
    sheet(`${topo('Lista de compras', `${ini.getDate()}/${ini.getMonth() + 1} – ${fimD.getDate()}/${fimD.getMonth() + 1} · só o que ainda não foi comido`)}
      ${sem ? '' : `<div class="seg">${ops.map(([k, n]) => `<button class="${per === k ? 'on' : ''}" data-act="comprasPer" data-v="${k}">${n}</button>`).join('')}</div>`}
      ${grupos.length ? grupos.map(([c, L]) => `<section class="group"><h3 class="label">${esc((CATS[c] || c).split(',')[0])}</h3><div class="rows shop">${L.map(a => { const f = FOOD(a), on = marcados.has(a);
        return `<button class="row-main solo ${on ? 'done' : ''}" data-act="comprado" data-a="${esc(a)}" aria-pressed="${on}">${foto(f)}<span class="row-t"><b>${esc(f.nome)}</b><small>${qtdCompra(f, tot[a])}</small></span><span class="tick" aria-hidden="true">${ICO.check}</span></button>`; }).join('')}</div></section>`).join('')
        : '<p class="empty">Nada planejado nesses dias. Aplique uma dieta ou adicione refeições no calendário.</p>'}
      ${grupos.length ? `<div class="row between"><span class="muted small">${marcados.size} de ${Object.keys(tot).length} no carrinho</span><button class="btn ghost" data-act="copiarCompras">${ICO.copiar} Copiar lista</button></div>` : ''}`, { tipo: 'compras', per, sem, chave, dias });
  }

  // ---------- Histórico e fases do jejum ----------
  function sheetHistorico() {
    const F = S.jejuns.filter(j => j.fim).sort((a, b) => b.inicio - a.inicio), hs = F.map(j => (j.fim - j.inicio) / H);
    const tot = hs.reduce((a, b) => a + b, 0), metas = F.filter(j => j.fim >= j.fimPrev - 30 * 60e3).length;
    sheet(`${topo('Histórico de jejuns')}
      ${F.length ? `<div class="big-nums"><div><small>Jejuns</small><b>${F.length}</b><small>${metas} na meta</small></div><div><small>Mais longo</small><b>${duracao(Math.max(...hs))}</b><small>média ${duracao(tot / F.length)}</small></div></div>
      <div class="rows">${F.map((j, k) => { const h = hs[k], p = Math.min(100, Math.round(h / ((j.fimPrev - j.inicio) / H) * 100));
        return `<button class="row-main solo" data-act="editarJejum" data-id="${j.id}">${icone('jejum', 't-fast')}<span class="row-t"><b>${duracao(h)} <span class="muted">de ${fmt((j.fimPrev - j.inicio) / H, 0)} h</span></b><small>${quando(j.inicio)} até ${quando(j.fim)} · ${faseDe(h).f[1].toLowerCase()}</small><span class="bar"><i style="width:${p}%"></i></span></span></button>`; }).join('')}</div>`
      : '<p class="empty">Quando você encerrar um jejum, ele aparece aqui com a duração e a fase alcançada.</p>'}`);
  }
  function sheetFases(h) {
    const k = faseDe(h).k;
    sheet(`${topo('Fases do jejum', 'Valores aproximados, mudam de pessoa para pessoa')}
      <div class="rows">${FASES.map(([ini, n, d], i) => `<div class="row-item ${i < k ? 'done' : ''} ${i === k ? 'cur' : ''}"><span class="row-main"><span class="phase-k">${ini} h</span><span class="row-t"><b>${n}${i === k ? ' <span class="badge">agora</span>' : ''}</b><small>${d}</small></span></span></div>`).join('')}</div>`);
  }

  // ---------- Copiar dia e refeição ----------
  function sheetCopiar(tipo) {
    const amanha = isoDe(somaDias(dataDe(ctx.iso), 1));
    sheet(`${topo(tipo === 'dia' ? 'Copiar o dia' : 'Copiar refeição', tituloData(ctx.iso))}
      <label class="field">Para o dia<input type="date" id="cpData" value="${amanha}"></label>
      ${tipo === 'dia' ? `<label class="toggle"><input type="checkbox" id="cpSubst"><span></span>Substituir o que já está no dia</label><p class="muted small">Copia refeições, líquidos e rotina, tudo desmarcado. Jejuns não são copiados.</p>` : ''}
      <button class="btn" data-act="${tipo === 'dia' ? 'okCopiarDia' : 'okCopiarRef'}">Copiar</button>`, { ...ctx, tipo: 'copiar' });
  }

  // Comer durante o jejum: pergunta se encerra
  function perguntarComer(iso, id, depois) {
    const j = jejumAtivo();
    sheet(`${topo('Você está em jejum', `Há ${duracao((Date.now() - j.inicio) / H)}. Marcar esta refeição como comida encerra o jejum agora?`)}
      <div class="row end"><button class="btn ghost" data-act="soMarcar">Só marcar</button><button class="btn" data-act="comerEncerrar">Encerrar jejum e marcar</button></div>`, { iso, id, jid: j.id, depois });
  }
  // Encerra o jejum: a quebra planejada vem para agora (ou sai, se outra refeição quebrou o jejum)
  function encerrar(j, quebrouCom) {
    j.fim = Date.now();
    if (quebrouCom) refsDoJejum(j).forEach(({ iso, r }) => { if (!r.feito && r.nome === 'Quebra do jejum' && r !== quebrouCom) S.dias[iso].refeicoes = S.dias[iso].refeicoes.filter(x => x !== r); });
    sincronizarJejum(j);
    return `Jejum de ${duracao((j.fim - j.inicio) / H)} registrado`;
  }

  // ---------- Dieta automática com os favoritos ----------
  // Cada favorito entra só na refeição em que faz sentido. Líquidos, sal, mel e combinações ficam fora das refeições.
  const TEMPEROS = ['salsa', 'alho', 'cebola', 'limao'], COZINHA = ['azeite', 'manteiga', 'banha', 'sebo', 'tutano', 'oleo-coco', 'ghee', 'nata'];
  const GRUPO = f => {
    if (!f || f.receita || ['bebidas', 'extras'].includes(f.categoria)) return null;
    if (TEMPEROS.includes(f.id)) return 'tempero';
    if (['carnes', 'miudos', 'ovos'].includes(f.categoria)) return 'prot';
    if (f.categoria === 'laticinios') return COZINHA.includes(f.id) || (f.gordura_g >= 30 && f.proteina_g < 10) ? 'gord' : f.proteina_g >= 10 ? 'queijo' : 'lat';
    if (f.categoria === 'gorduras') return COZINHA.includes(f.id) ? 'gord' : 'snack';
    if (f.categoria === 'tuberculos') return 'tub';
    if (f.categoria === 'frutas') return f.id === 'abacate' ? 'abacate' : 'fruta';
    if (['verduras', 'legumes'].includes(f.categoria)) return 'veg';
    return f.proteina_g >= 15 ? 'prot' : f.gordura_g >= 40 ? 'gord' : f.carboidrato_g >= 10 ? 'tub' : 'veg';
  };
  const arred = (g, st = 10) => Math.max(st, Math.round(g / st) * st);
  function sheetAuto() {
    const favs = S.favs.map(FOOD).filter(Boolean);
    const falta = !favs.some(f => GRUPO(f) === 'prot') ? 'Adicione pelo menos uma carne ou ovo aos favoritos. Abra o alimento em Alimentos e toque na estrela.' : '';
    sheet(`${topo('Dieta com meus favoritos', `Metas de ${fmt(S.metas.kcal, 0)} kcal e ${fmt(S.metas.proteina_g, 0)} g de proteína por dia`)}
      ${favs.length ? `<div class="fav-strip">${favs.map(f => foto(f)).join('')}</div>` : ''}
      ${falta ? `<p class="note">${falta}</p>` : ''}
      <div class="field">Objetivo<div class="seg" id="autoObj">${[['equilibrio', 'Equilibrada'], ['proteina', 'Mais proteína'], ['fibra', 'Mais fibra']].map(([v, n], k) => `<button class="${k === 0 ? 'on' : ''}" data-act="autoOp" data-v="${v}">${n}</button>`).join('')}</div></div>
      <div class="field">Refeições por dia<div class="seg" id="autoRef">${[1, 2, 3].map(v => `<button class="${v === 3 ? 'on' : ''}" data-act="autoOp" data-v="${v}">${v}</button>`).join('')}</div></div>
      <label class="field">Jejum na semana<select id="autoJejum" data-act="autoJejum"><option value="0">Sem jejum longo</option>${[1, 2, 3, 4, 5].map(n => `<option value="${n}">${n} ${n > 1 ? 'dias' : 'dia'} sem comer, com pré-jejum gorduroso</option>`).join('')}</select></label>
      <div class="row wrap" id="autoIni" hidden><label class="field grow">Começar o jejum<select id="autoDia">${DIAS.map((n, k) => `<option value="${k}" ${k === 1 ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label class="field">Hora<input type="time" id="autoHora" value="20:00"></label></div>
      <p class="muted small">O app distribui seus favoritos pelas refeições e ajusta as gramas para chegar perto das suas metas. Nos dias de jejum entra água com sal integral. Depois você aplica no calendário e muda o que quiser.</p>
      <button class="btn" data-act="confirmarAuto" ${falta ? 'disabled' : ''}>Criar dieta</button>`);
  }
  function dietaAutomatica({ obj, ref: nRef, jejum: nJ, dia: diaIni = 1, hora: horaIni = '20:00' }) {
    const favs = S.favs.map(FOOD).filter(Boolean), G = { prot: [], gord: [], tub: [], fruta: [], veg: [], queijo: [], lat: [], snack: [], tempero: [], abacate: [] };
    favs.forEach(f => { const g = GRUPO(f); if (g) G[g].push(f); });
    if (!G.prot.length) return { erro: 'Adicione pelo menos uma carne ou ovo aos favoritos.' };
    const ovosTodos = G.prot.filter(f => f.categoria === 'ovos'), ovos = ovosTodos.filter(f => f.id !== 'gema' && f.id !== 'clara').length ? ovosTodos.filter(f => f.id !== 'gema' && f.id !== 'clara') : ovosTodos, carnes = G.prot.filter(f => f.categoria !== 'ovos');
    const miudos = carnes.filter(f => f.categoria === 'miudos'), normais = carnes.filter(f => f.categoria !== 'miudos');
    const metaP = S.metas.proteina_g * (obj === 'proteina' ? 1.15 : 1), metaK = S.metas.kcal, metaC = S.metas.carboidrato_g;
    const pega = (arr, i) => arr.length ? arr[((i % arr.length) + arr.length) % arr.length] : null;
    const nomes = nRef === 3 ? [['Café da manhã', '08:00'], ['Almoço', '12:30'], ['Jantar', '19:30']] : nRef === 2 ? [['Almoço', '12:30'], ['Jantar', '19:30']] : [['Refeição', '14:00']];
    const omad = nRef === 1;
    const addEm = itens => (f, g) => { if (f && g > 0 && !itens.some(it => it.a === f.id)) itens.push({ a: f.id, g: f.un ? Math.max(f.un, Math.round(g / f.un) * f.un) : arred(g, f.kcal > 500 ? 5 : 10) }); };
    const gTempero = f => ({ salsa: 10, alho: 5, cebola: 60, limao: 30 }[f.id] || 20);
    const porP = (f, alvo, min, max) => Math.min(max, Math.max(min, alvo / (f.proteina_g || 10) * 100));
    const fecharKcal = (itens, add, alvoK, d, cap) => { const gd = pega(G.gord, d); if (gd) add(gd, Math.min(cap, Math.max(0, (alvoK - soma(itens).kcal) / (gd.kcal || 700) * 100))); };

    // Café da manhã: ovos, queijo ou iogurte, fruta, castanhas
    function cafe(d) {
      const itens = [], add = addEm(itens), alvoP = metaP / nRef, alvoK = metaK / nRef;
      const lat = pega(G.lat, d), fruta = pega(G.fruta, d) || (d % 2 ? pega(G.abacate, d) : null);
      if (fruta) add(fruta, fruta.gordura_g > 10 ? 100 : 150);
      if (lat && (d % 2 === 0 || !ovos.length)) add(lat, 170);
      const q = pega(G.queijo, d); if (q) add(q, 40);
      if (obj === 'fibra' || d % 3 === 0) { const sn = pega(G.snack, d); if (sn) add(sn, sn.kcal > 500 && sn.id !== 'chia' && sn.id !== 'linhaca' ? 20 : 15); }
      const mel = favs.find(f => f.id === 'mel'); if (mel && lat && itens.some(it => it.a === lat.id)) add(mel, 21);
      const prot = pega(ovos, d) || pega(normais, d) || pega(carnes, d);
      if (prot) add(prot, porP(prot, alvoP - soma(itens).proteina_g, 100, prot.categoria === 'ovos' ? 250 : 250));
      const mt = G.gord.find(f => f.id === 'manteiga' || f.id === 'ghee'); if (mt && prot?.categoria === 'ovos') add(mt, 10);
      fecharKcal(itens, add, alvoK, d, 15);
      return itens;
    }
    // Almoço, jantar ou refeição única: carne, tubérculo, verduras, tempero e gordura de cozinha
    function principal(d, m) {
      const itens = [], add = addEm(itens), alvoP = metaP / nRef, alvoK = metaK / nRef, alvoC = metaC / nRef;
      const pool = miudos.length && d === diaMiudo && m === Math.max(0, nomes.length - 2) ? miudos : (normais.length ? normais : carnes.length ? carnes : ovos);
      const prot = pega(pool, d * nRef + m);
      const nVeg = obj === 'fibra' || omad ? 2 : 1;
      for (let k = 0; k < nVeg; k++) add(pega(G.veg, d * 3 + m * 2 + k), obj === 'fibra' ? 150 : 120);
      const tp = pega(G.tempero, d + m); if (tp) add(tp, gTempero(tp));
      if ((omad || d % 2 === m % 2) && G.abacate.length) add(G.abacate[0], 100);
      const tb = pega(G.tub, d + m);
      if (tb) add(tb, Math.min(omad ? 350 : 300, Math.max(100, (alvoC - soma(itens).carboidrato_g) / (tb.carboidrato_g || 20) * 100)));
      add(prot, porP(prot, alvoP - soma(itens).proteina_g, prot.categoria === 'ovos' ? 100 : 150, prot.categoria === 'miudos' ? 150 : prot.categoria === 'ovos' ? 250 : omad ? 500 : 400));
      if (omad) { const falta = metaP - soma(itens).proteina_g;
        const p2 = ['miudos', 'ovos'].includes(prot.categoria) ? pega(normais.filter(f => f !== prot), d + 1) || pega(ovos, d) : pega(ovos, d) || pega(normais.filter(f => f !== prot), d + 1);
        if (p2 && p2 !== prot && falta > 15) add(p2, Math.min(p2.categoria === 'ovos' ? 250 : 300, falta / (p2.proteina_g || 12) * 100));
        const q = pega(G.queijo, d); if (q) add(q, 40); }
      fecharKcal(itens, add, alvoK, d + m, omad ? 50 : 30);
      return itens;
    }
    const refeicao = (d, m) => { const [nome, hora] = nomes[m]; return { id: uid(), nome, hora, feito: false, itens: nome === 'Café da manhã' ? cafe(d) : principal(d, m) }; };
    const menosHora = (h, n) => { const [a, b] = h.split(':').map(Number), t = Math.max(6 * 60, a * 60 + b - n * 60); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
    function preJejum(d) {
      const itens = [], add = addEm(itens), gordas = [...G.prot].sort((a, b) => ((a.categoria === 'carnes' ? 0 : 1) - (b.categoria === 'carnes' ? 0 : 1)) || b.gordura_g - a.gordura_g);
      add(gordas[0], nJ >= 3 ? 400 : 350);
      const gema = favs.find(f => f.id === 'gema') || ovosTodos[0]; if (gema && gema !== gordas[0]) add(gema, gema.un ? gema.un * 3 : 100);
      G.gord.slice(0, 2).forEach((f, k) => add(f, f.kcal > 500 ? (k === 0 ? 40 : 30) : 100));
      if (G.abacate.length) add(G.abacate[0], 150);
      const q = pega(G.queijo, d); if (q) add(q, 50);
      add(pega(G.veg, d), 100);
      return { id: uid(), nome: 'Pré-jejum', hora: menosHora(horaIni, 1), feito: false, itens };
    }
    // Quebra forte e nutritiva: carne, ovos, fígado, tubérculo, verduras e gordura
    function quebra(d) {
      const itens = [], add = addEm(itens), carne = pega(normais.length ? normais : carnes, d) || pega(G.prot, d);
      add(carne, Math.min(300, Math.max(200, metaP * 0.45 / (carne.proteina_g || 20) * 100)));
      const ov = pega(ovos, d); if (ov && ov !== carne) add(ov, 150);
      const mi = miudos[0]; if (mi && mi !== carne) add(mi, 80);
      const tb = pega(G.tub, d); if (tb) add(tb, 150);
      if (G.abacate.length) add(G.abacate[0], 100);
      [pega(G.veg, d), pega(G.veg, d + 1)].forEach(v => add(v, 100));
      const gd = pega(G.gord, d); if (gd) add(gd, gd.kcal > 500 ? 15 : 100);
      return { id: uid(), nome: 'Quebra do jejum', hora: '12:00', feito: false, itens };
    }
    // A semana da dieta começa no dia do pré-jejum (índice 0 = dia escolhido). Jejum nos dias seguintes, quebra no dia depois.
    const ini = nJ ? 0 : -1;
    const diasJejum = new Set(Array.from({ length: nJ }, (_, k) => ini + 1 + k)), quebraDia = nJ ? ini + nJ + 1 : -1;
    const diaMiudo = [2, 3, 0, 4, 5, 6, 1].find(d => !diasJejum.has(d) && d !== ini && d !== quebraDia);
    const dias = [];
    for (let d = 0; d < 7; d++) {
      let refs = [];
      if (!diasJejum.has(d)) {
        refs = nomes.map((_, m) => refeicao(d, m));
        if (d === ini) refs = [...refs.slice(0, -1), preJejum(d)];
        if (d === quebraDia) { refs = refs.filter(r => r.nome !== 'Café da manhã'); refs[0] = quebra(d); }
      }
      const rot = [sol(diasJejum.has(d) ? 30 : 20)];
      rot.push(!diasJejum.has(d) && d % 2 === 0 ? treino(45, 'Musculação') : treino(30, 'Caminhada', '07:00'));
      dias.push({ refeicoes: refs, rotina: rot, liquidos: [] });
    }
    const nomeObj = { equilibrio: 'equilibrada', proteina: 'mais proteína', fibra: 'mais fibra' }[obj];
    const [hh, mm] = horaIni.split(':').map(Number), horas = Math.round((nJ + 1) * 24 + 12 - hh - mm / 60);
    return { id: 'minha-' + uid(), nome: `Favoritos · ${nomeObj}`, diaInicio: nJ ? diaIni : 0,
      desc: `${nRef} ${nRef === 1 ? 'refeição' : 'refeições'} por dia${nJ ? `, jejum de ${nJ} ${nJ > 1 ? 'dias' : 'dia'} começando ${DIAS[diaIni].toLowerCase()} às ${horaIni}` : ''}. Feita com ${favs.length} favoritos.`,
      dias, jejum: nJ ? [{ dia: 0, hora: horaIni, horas }] : [] };
  }

  // ---------- Receitas (alimentos que juntam outros) ----------
  function sheetReceita() {
    const rc = ctx.receita, t = soma(rc.itens), peso = rc.itens.reduce((x, it) => x + it.g, 0);
    sheet(`${topo(rc.id ? 'Editar combinação' : 'Combinar alimentos', 'Junte alimentos e salve como um só')}
      <label class="field">Nome<input type="text" id="rcNome" value="${esc(rc.nome)}" placeholder="Café com óleo de coco, Água com sal…" data-act="rcNome"></label>
      ${rc.itens.length ? iconesReceita(rc) : ''}
      ${rc.itens.length ? `<div class="rows">${rc.itens.map((it, k) => { const f = FOOD(it.a);
        return `<div class="item">${foto(f)}<span class="row-t"><b>${esc(f?.nome || it.a)}</b><small>${fmt(soma([it]).kcal, 0)} kcal${unid(f, it.g)}</small></span>
          <span class="step"><button data-act="menos" data-k="${k}" aria-label="Menos">−</button><input type="number" inputmode="decimal" min="0" value="${it.g}" data-act="itemG" data-k="${k}" aria-label="Gramas"><span class="u">g</span><button data-act="maisG" data-k="${k}" aria-label="Mais">+</button></span>
          <button class="icon-btn sm" data-act="delItem" data-k="${k}" aria-label="Remover">${ICO.fechar}</button></div>`; }).join('')}</div>` : '<p class="empty">Adicione os alimentos que fazem parte.</p>'}
      <button class="btn ghost" data-act="addItem">${ICO.mais} Adicionar alimento</button>
      ${rc.itens.length ? `<p class="muted small center">1 porção = ${fmt(peso, 0)} g · ${resumoMacros(t)} · ${fmt(t.gordura_g, 0)} g gord${t.sodio_mg ? ` · ${fmt(t.sodio_mg, 0)} mg sódio` : ''}</p>` : ''}
      <div class="row between">${rc.id ? '<button class="btn ghost danger" data-act="delReceita">Apagar</button>' : '<span></span>'}<button class="btn" data-act="salvarReceita" ${rc.itens.length ? '' : 'disabled'}>Salvar</button></div>`, { ...ctx, tipo: 'receita' });
  }
  const todosIcones = () => [...new Set(DB.alimentos.map(f => f.img).filter(Boolean))];
  function iconesReceita(rc) {
    const sel = rc.imgs || [], modo = rc.modo || (sel.length > 1 ? 'juntos' : 'um'), dos = [...new Set(rc.itens.map(it => FOOD(it.a)?.img).filter(Boolean))];
    const ops = rc.todos ? [...new Set([...dos, ...todosIcones()])] : dos;
    const prev = receitaComoAlimento(rc);
    return `<div class="field">Ícone
      <div class="ic-pick">${foto(prev, 'ic-prev')}<div class="seg sm" id="rcModo">${[['um', 'Um ícone'], ['juntos', 'Juntar até 3']].map(([v, n]) => `<button class="${modo === v ? 'on' : ''}" data-act="rcModo" data-v="${v}">${n}</button>`).join('')}</div></div>
      <p class="muted small">${modo === 'juntos' ? 'Toque nos ícones que quer juntar, na ordem.' : sel.length ? 'Toque em outro para trocar.' : 'Automático: usa o alimento com mais calorias. Toque em um para trocar.'}</p>
      <div class="ic-grid">${ops.map(i => `<button class="ic-op ${sel.includes(i) ? 'on' : ''}" data-act="rcIcone" data-i="${esc(i)}" aria-pressed="${sel.includes(i)}"><img src="${i}" alt="" loading="lazy">${sel.includes(i) && sel.length > 1 ? `<em>${sel.indexOf(i) + 1}</em>` : ''}</button>`).join('')}
        ${rc.todos ? '' : `<button class="ic-op more" data-act="rcTodos">Mais</button>`}</div>
      ${sel.length ? '<button class="link" data-act="rcAuto">Voltar ao automático</button>' : ''}</div>`;
  }
  function receitaComoAlimento(rc) {
    const t = soma(rc.itens), peso = rc.itens.reduce((x, it) => x + it.g, 0) || 1, k = 100 / peso;
    const maior = [...rc.itens].sort((a, b) => valor(FOOD(b.a), 'kcal') * b.g - valor(FOOD(a.a), 'kcal') * a.g || b.g - a.g)[0];
    const f = { id: rc.id || 'rc-' + uid(), nome: rc.nome.trim() || 'Minha combinação', categoria: 'receitas', receita: clone(rc.itens), un: peso, unNome: 'porção',
      img: rc.imgs?.[0] || FOOD(maior?.a)?.img, imgs: rc.imgs?.length > 1 ? [...rc.imgs] : undefined, icones: rc.imgs?.length ? [...rc.imgs] : undefined, fonte: 'Combinação criada por você', beneficio: rc.itens.map(it => `${FOOD(it.a)?.nome} ${it.g} g`).join(' + '), micro: {} };
    MACROS.forEach(m => f[m.k] = +(t[m.k] * k).toFixed(2));
    MICROS.forEach(m => { if (t[m.k]) f.micro[m.k] = +(t[m.k] * k).toFixed(3); });
    return f;
  }
  const itensCtx = () => ctx.receita ? ctx.receita.itens : refCtx().itens;

  // ---------- Ações ----------
  const reRef = () => { if (ctx.receita) return sheetReceita(); if (ctx.rasc) return sheetRef(ctx.iso, null, ctx.rasc); salvar(); sheetRef(ctx.iso, ctx.id); render(); };
  const CLICK = {
    areas: () => sheetAreas(),
    fechar, okConfirmar: () => { const a = ctx.acao; fechar(); a && a(); },
    fab: () => sheetAdicionar(rota === 'dia' ? diaRota : hoje()),
    voltarAdd: () => sheetAdicionar(ctx.iso),
    nutrientes: el => sheetNutrientes(el.dataset.iso),
    feitoRef: el => marcarRef(el.dataset.iso, el.dataset.id, () => render()),
    feitoRot: el => { const r = diaEdit(el.dataset.iso).rotina.find(x => x.id === el.dataset.id); r.feito = !r.feito; salvar(); render(); },
    abrirRef: el => sheetRef(el.dataset.iso, el.dataset.id),
    abrirRot: el => sheetRot(el.dataset.iso, el.dataset.id),
    novaRef: el => sheetNovaRef(el.dataset.iso),
    novoLiq: el => { filtro.qP = ''; sheet('', { liq: true, iso: el.dataset.iso }); sheetPicker(); },
    feitoLiq: el => { const l = liqsDe(el.dataset.iso).find(x => x.id === el.dataset.id); l.feito = !l.feito; salvar(); render(); },
    abrirLiq: el => sheetLiq(el.dataset.iso, el.dataset.id),
    salvarLiq: () => { const l = liqsDe(ctx.iso).find(x => x.id === ctx.id); l.g = +$('#lG').value; l.hora = $('#lHora').value; salvar(); fechar(); render(); },
    delLiq: () => { const { iso, id } = ctx; fechar(); comDesfazer('Líquido apagado', () => { const d = diaEdit(iso); d.liquidos = d.liquidos.filter(x => x.id !== id); }); },
    refBranco: el => sheetRef(el.dataset.iso, null, { id: uid(), nome: 'Refeição', hora: '', feito: false, itens: [] }),
    refModelo: el => sheetRef(el.dataset.iso, null, ref(el.dataset.k)),
    addRasc: () => { const r = ctx.rasc, iso = ctx.iso; if (!r.itens.length) return; diaEdit(iso).refeicoes.push(r); S.exemplo = false; salvar(); fechar(); render(); toast(`${r.nome} adicionada em ${tituloData(iso)}`); },
    addItem: () => { filtro.qP = ''; filtro.catP = S.favs.length ? 'fav' : recentes().length ? 'rec' : ''; sheetPicker(); },
    voltarRef: () => ctx.receita ? sheetReceita() : sheetRef(ctx.iso, ctx.id, ctx.rasc),
    voltarPicker: () => sheetPicker(),
    escolher: el => sheetGramas(el.dataset.a),
    confirmarItem: el => { const g = +$('#gIn').value;
      if (ctx.liq) { if (g > 0) { diaEdit(ctx.iso).liquidos.push({ id: uid(), a: el.dataset.a, g, hora: '', feito: false }); salvar(); render(); toast(`${FOOD(el.dataset.a).nome} adicionado`); } return fechar(); }
      if (g > 0) { itensCtx().push({ a: el.dataset.a, g }); toast(`${FOOD(el.dataset.a).nome} adicionado`); } reRef(); },
    menos: el => { const it = itensCtx()[+el.dataset.k]; it.g = Math.max(0, it.g - passo(FOOD(it.a))); reRef(); },
    maisG: el => { const it = itensCtx()[+el.dataset.k]; it.g += passo(FOOD(it.a)); reRef(); },
    delItem: el => { itensCtx().splice(+el.dataset.k, 1); reRef(); },
    delRef: () => { const { iso, id } = ctx; fechar(); comDesfazer('Refeição apagada', () => { const d = diaEdit(iso); d.refeicoes = d.refeicoes.filter(r => r.id !== id); }); },
    salvarPronta: () => { const r = acharRef(ctx.iso, ctx.id); if (!r) return; const ja = S.refsSalvas.find(x => x.nome === r.nome && JSON.stringify(x.itens) === JSON.stringify(r.itens));
      if (ja) return toast('Essa refeição já está salva'); S.refsSalvas.push({ id: 'salva-' + uid(), nome: r.nome, hora: r.hora || '', itens: clone(r.itens) }); salvar(); toast(`“${r.nome}” salva em Minhas refeições`); },
    copiarRef: () => sheetCopiar('ref'),
    copiarDia: el => { ctx.iso = el.dataset.iso; sheetCopiar('dia'); },
    okCopiarRef: () => { const r = acharRef(ctx.iso, ctx.id), para = $('#cpData').value; if (!r || !para) return;
      diaEdit(para).refeicoes.push({ ...clone(r), id: uid(), feito: false, jejum: undefined }); salvar(); fechar(); render(); toast(`Copiada para ${tituloData(para)}`); },
    okCopiarDia: () => { const de = ctx.iso, para = $('#cpData').value, subst = $('#cpSubst').checked; if (!para || para === de) return toast('Escolha outro dia');
      fechar(); comDesfazer(`Dia copiado para ${tituloData(para)}`, () => { const o = diaDe(de), d = subst ? (S.dias[para] = { refeicoes: [], rotina: [], liquidos: [] }) : diaEdit(para);
        d.refeicoes.push(...o.refeicoes.map(r => { const c = { ...clone(r), id: uid(), feito: false }; delete c.jejum; return c; }));
        d.liquidos.push(...(o.liquidos || []).filter(l => !l.auto).map(l => ({ ...l, id: uid(), feito: false })));
        d.rotina.push(...o.rotina.map(r => ({ ...r, id: uid(), feito: false }))); garantirTodos(); }); },
    feitoRefSheet: () => { const { iso, id } = ctx; marcarRef(iso, id, () => { render(); sheetRef(iso, id); }); },
    soMarcar: () => { const { iso, id, depois } = ctx; const r = acharRef(iso, id); fechar(); if (r) { r.feito = true; salvar(); } depois(); },
    comerEncerrar: () => { const { iso, id, jid } = ctx; fechar(); comDesfazer('', () => { const r = acharRef(iso, id), j = S.jejuns.find(x => x.id === jid); if (r) r.feito = true; return j ? encerrar(j, r) : ''; }); },
    desfazer: () => { if (!snapDesfazer) return; const o = normalizar(JSON.parse(snapDesfazer)); snapDesfazer = null; if (!o) return; S = o; salvar(); fechar(); render(); toast('Desfeito'); },
    addSol: el => sheetRot(el.dataset.iso, null, 'sol'),
    addTreino: el => sheetRot(el.dataset.iso, null, 'treino'),
    rotTipo: el => { ctx.rot.tipo = el.dataset.t; $$('[data-act=rotTipo]').forEach(b => b.classList.toggle('on', b === el)); },
    salvarRot: () => {
      const r = Object.assign(ctx.rot, { min: +$('#rMin').value, hora: $('#rHora').value, nota: $('#rNota').value.trim() });
      const d = diaEdit(ctx.iso); if (ctx.novo) d.rotina.push(r); else d.rotina[d.rotina.findIndex(x => x.id === r.id)] = r;
      salvar(); fechar(); render();
    },
    delRot: () => { const { iso, id } = ctx; fechar(); comDesfazer('Apagado da rotina', () => { const d = diaEdit(iso); d.rotina = d.rotina.filter(x => x.id !== id); }); },
    addPeso: el => sheetPeso(el.dataset.iso || (rota === 'dia' ? diaRota : hoje())),
    salvarPeso: () => { const d = $('#pData').value, kg = parseFloat(String($('#pKg').value).replace(',', '.'));
      if (!d || !(kg >= 20 && kg <= 400)) return toast('Digite um peso entre 20 e 400 kg'); if (d > hoje()) return toast('Escolha hoje ou um dia passado');
      if (ctx.ref && ctx.ref !== d) S.pesos = S.pesos.filter(p => p.d !== ctx.ref);
      S.pesos = S.pesos.filter(p => p.d !== d); S.pesos.push({ d, kg: Math.round(kg * 10) / 10 }); S.pesos.sort((a, b) => a.d.localeCompare(b.d));
      salvar(); fechar(); render(); toast(`${fmt(kg, 1)} kg em ${tituloData(d).toLowerCase()}`); },
    delPeso: () => { const d = ctx.ref; fechar(); comDesfazer('Peso apagado', () => { S.pesos = S.pesos.filter(p => p.d !== d); }); },
    calcMetas: () => sheetCalcMetas(),
    aplicarCalc: () => { const n = id => parseFloat(String($(id).value).replace(',', '.')), kg = n('#cKg'), alt = n('#cAlt'), idade = n('#cIdade');
      if (!(kg > 30 && alt > 120 && idade > 12)) return toast('Preencha peso, altura e idade');
      const sexo = $('#cSexo .on').dataset.v, ativ = +$('#cAtiv .on').dataset.v, obj = $('#cObj .on').dataset.v;
      const tmb = 10 * kg + 6.25 * alt - 5 * idade + (sexo === 'm' ? 5 : -161), kcal = Math.round(tmb * ativ * { perder: 0.8, manter: 1, ganhar: 1.1 }[obj] / 50) * 50;
      const prot = Math.round(kg * (obj === 'perder' ? 2.2 : 2) / 5) * 5, carb = { perder: 75, manter: 110, ganhar: 160 }[obj], gord = Math.max(30, Math.round((kcal - prot * 4 - carb * 4) / 9 / 5) * 5);
      S.perfil = { kg, alturaCm: alt, idade, sexo, ativ, obj }; if (!S.pesos.length) S.pesos.push({ d: hoje(), kg });
      comDesfazer(`Metas: ${fmt(kcal, 0)} kcal e ${prot} g de proteína`, () => { Object.assign(S.metas, { kcal, proteina_g: prot, carboidrato_g: carb, gordura_g: gord, fibra_g: Math.max(S.metas.fibra_g, 30) }); fechar(); }); },
    fases: el => sheetFases(+el.dataset.h),
    historicoJejum: () => sheetHistorico(),
    compras: el => sheetCompras({ sem: el.dataset.sem }),
    comprasPer: el => sheetCompras({ per: el.dataset.v }),
    comprado: el => { const k = ctx.chave, a = el.dataset.a, L = new Set(S.compras[k] || []); L.has(a) ? L.delete(a) : L.add(a); S.compras[k] = [...L];
      // guarda só as listas das últimas semanas
      Object.keys(S.compras).filter(x => x < isoDe(somaDias(new Date(), -21))).forEach(x => delete S.compras[x]); salvar(); sheetCompras({ per: ctx.per, sem: ctx.sem }); },
    copiarCompras: () => { const tot = itensCompra(ctx.dias), marc = new Set(S.compras[ctx.chave] || []);
      const txt = Object.keys(tot).filter(a => !marc.has(a)).sort((a, b) => FOOD(a).categoria.localeCompare(FOOD(b).categoria) || FOOD(a).nome.localeCompare(FOOD(b).nome)).map(a => `- ${FOOD(a).nome}: ${qtdCompra(FOOD(a), tot[a])}`).join('\n');
      navigator.clipboard?.writeText(`Lista de compras\n${txt}`).then(() => toast('Lista copiada. Cole nas Notas ou no WhatsApp.'), () => toast('Não foi possível copiar')); },
    comecarJejum: () => {
      const h = S.ultimaDuracao || 48, prox = proxJejum();
      if (prox && prox.inicio < Date.now() + h * H) return CLICK.comecarAgora({ dataset: { id: prox.id } });
      comDesfazer('', () => { const j = { id: uid(), inicio: Date.now(), fimPrev: Date.now() + h * H, fim: null }; S.jejuns.push(j); garantirAguaSal(j);
        const c = refsNoJejum(j); tirarRefs(c);
        return `Jejum começou, meta de ${h} h${c.length ? `. ${c.length} ${c.length === 1 ? 'refeição dentro do jejum saiu' : 'refeições dentro do jejum saíram'}` : ''}`; }); },
    comecarAgora: el => { const id = el.dataset.id; comDesfazer('', () => { const j = S.jejuns.find(x => x.id === id); if (!j) return false; const d = j.fimPrev - j.inicio;
      j.inicio = Date.now(); j.fimPrev = j.inicio + d; sincronizarJejum(j); const c = refsNoJejum(j); tirarRefs(c);
      return `Jejum começou agora, meta de ${fmt(d / H, 0)} h${c.length ? `. ${c.length} ${c.length === 1 ? 'refeição saiu' : 'refeições saíram'} do caminho` : ''}`; }); },
    planejarJejum: el => { ctx.iso = el.dataset.iso || ctx.iso; sheetJejum(null, el.dataset.iso); },
    editarJejum: el => sheetJejum(el.dataset.id),
    salvarJejum: () => {
      const ini = new Date($('#jIni').value).getTime(), h = +$('#jH').value, id = ctx.id; if (isNaN(ini)) return toast('Escolha o dia e a hora do começo.');
      const jOld = id && S.jejuns.find(x => x.id === id);
      if (jOld?.fim && jOld.fim <= ini) return toast('O começo precisa ser antes do fim do jejum.');
      const fimNovo = jOld?.fim || ini + h * H, outro = sobrepoe(ini, fimNovo, id);
      if (outro) return toast(`Já tem um jejum de ${quando(outro.inicio)} até ${quando(fimJ(outro))}.`);
      const pre = $('#jPre')?.checked, qb = $('#jQuebra')?.checked;
      S.ultimaDuracao = h; fechar();
      comDesfazer('', () => {
        let j;
        if (jOld) { j = jOld; j.inicio = ini; j.fimPrev = ini + h * H; }
        else {
          j = { id: uid(), inicio: ini, fimPrev: ini + h * H, fim: null }; S.jejuns.push(j);
          if (pre) diaEdit(isoDe(new Date(ini - H))).refeicoes.push({ ...ref(h >= 72 ? 'pre_jejum_forte' : 'pre_jejum', hhmm(ini - H)), jejum: j.id });
          if (qb) diaEdit(isoDe(new Date(j.fimPrev))).refeicoes.push({ ...ref('quebra', hhmm(j.fimPrev)), jejum: j.id });
        }
        sincronizarJejum(j);
        const c = refsNoJejum(j); tirarRefs(c);
        return `${jOld ? 'Jejum atualizado' : `Jejum de ${h} h planejado`}${c.length ? `. ${c.length} ${c.length === 1 ? 'refeição que caía no jejum saiu' : 'refeições que caíam no jejum saíram'}` : ''}`;
      });
    },
    encerrarJejum: el => { const id = el.dataset.id, j = S.jejuns.find(x => x.id === id); if (!j) return;
      const h = (Date.now() - j.inicio) / H, falta = (j.fimPrev - Date.now()) / H;
      confirmar(falta > 0 ? `Encerrar agora, com ${duracao(h)}? Faltam ${duracao(falta)} para a meta.` : `Encerrar o jejum com ${duracao(h)}?`, () => comDesfazer('', () => encerrar(S.jejuns.find(x => x.id === id))), 'Encerrar'); },
    delJejum: () => { const id = ctx.id; confirmar('Apagar este jejum? O pré-jejum e a quebra ainda não comidos saem junto.', () => comDesfazer('Jejum apagado', () => {
      const j = S.jejuns.find(x => x.id === id); if (!j) return false;
      refsDoJejum(j).forEach(({ iso, r }) => { if (!r.feito) S.dias[iso].refeicoes = S.dias[iso].refeicoes.filter(x => x !== r); else delete r.jejum; });
      S.jejuns = S.jejuns.filter(x => x.id !== id); limparAguaSal(); }), 'Apagar'); },
    calSel: () => { calSel = calSel ? null : new Set(); render(); },
    selDia: el => { const iso = el.dataset.iso; calSel.has(iso) ? calSel.delete(iso) : calSel.add(iso); render(); },
    apagarDias: () => { const sel = new Set(calSel), n = sel.size;
      confirmar(`Apagar tudo o que está em ${n} ${n === 1 ? 'dia' : 'dias'}?`, () => { calSel = null; comDesfazer(`${n} ${n === 1 ? 'dia limpo' : 'dias limpos'}`, () => {
        sel.forEach(iso => delete S.dias[iso]); S.jejuns = S.jejuns.filter(j => !sel.has(isoDe(new Date(j.inicio)))); limparAguaSal(); S.exemplo = false; }); }, 'Apagar'); },
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
    catP: el => { filtro.catP = el.dataset.c; $$('[data-act=catP]').forEach(b => b.classList.toggle('on', b === el)); $('#listaP').innerHTML = listaAlimentos(true); },
    addAoDia: el => { const iso = $('#addData').value || hoje(), g = +$('#qG').value; const d = diaEdit(iso);
      if (ehLiquido(FOOD(el.dataset.a))) { d.liquidos.push({ id: uid(), a: el.dataset.a, g, hora: '', feito: false }); salvar(); fechar(); render(); return toast(`Adicionado aos líquidos de ${tituloData(iso)}`); }
      let r = d.refeicoes.find(x => x.nome === 'Avulsos'); if (!r) { r = { id: uid(), nome: 'Avulsos', hora: '', feito: false, itens: [] }; d.refeicoes.push(r); } r.itens.push({ a: el.dataset.a, g }); salvar(); fechar(); render(); toast(`Adicionado em ${tituloData(iso)}`); },
    modeloAoDia: el => { const iso = $('#addData').value || hoje(); diaEdit(iso).refeicoes.push(ref(el.dataset.k)); salvar(); fechar(); render(); toast(`Adicionado em ${tituloData(iso)}`); },
    novoAlimento: () => sheetNovoAlimento(),
    novaReceita: () => { ctx = {}; sheet('', { receita: { id: null, nome: '', itens: [] } }); sheetReceita(); },
    editarReceita: el => { const f = FOOD(el.dataset.a); sheet('', { receita: { id: f.id, nome: f.nome, itens: clone(f.receita), imgs: [...(f.icones || [])] } }); sheetReceita(); },
    rcIcone: el => { const rc = ctx.receita, i = el.dataset.i; rc.nome = $('#rcNome').value; rc.imgs = rc.imgs || [];
      const juntos = (rc.modo || (rc.imgs.length > 1 ? 'juntos' : 'um')) === 'juntos';
      if (!juntos) rc.imgs = rc.imgs[0] === i ? [] : [i];
      else if (rc.imgs.includes(i)) rc.imgs = rc.imgs.filter(x => x !== i); else if (rc.imgs.length >= 3) return toast('Junte no máximo 3 ícones'); else rc.imgs.push(i);
      sheetReceita(); },
    rcModo: el => { const rc = ctx.receita; rc.nome = $('#rcNome').value; rc.modo = el.dataset.v; if (rc.modo === 'um') rc.imgs = (rc.imgs || []).slice(0, 1); sheetReceita(); },
    rcTodos: () => { ctx.receita.nome = $('#rcNome').value; ctx.receita.todos = true; sheetReceita(); },
    rcAuto: () => { ctx.receita.nome = $('#rcNome').value; ctx.receita.imgs = []; sheetReceita(); },
    salvarReceita: () => {
      ctx.receita.nome = $('#rcNome').value; if (!ctx.receita.itens.length) return;
      const f = receitaComoAlimento(ctx.receita), i = S.custom.findIndex(x => x.id === f.id);
      if (i >= 0) S.custom[i] = f; else S.custom.push(f);
      if (!ehFav(f.id)) S.favs.push(f.id);
      salvar(); fechar(); filtro.cat = 'receitas'; render(); toast(`“${f.nome}” salvo em Minhas combinações`);
    },
    delReceita: () => { const id = ctx.receita.id; fechar(); comDesfazer('Combinação apagada', () => apagarAlimento(id)); },
    fav: el => { const a = el.dataset.a; S.favs = ehFav(a) ? S.favs.filter(x => x !== a) : [...S.favs, a]; salvar(); const on = ehFav(a);
      $$(`[data-act=fav][data-a="${a}"]`).forEach(b => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      if (filtro.cat === 'fav' && !on && $('#lista')) $('#lista').innerHTML = listaAlimentos();
      if ($('#sheet').hidden) { /* lista */ } else if (rota === 'alimentos' && $('#lista')) $('#lista').innerHTML = listaAlimentos();
      toast(on ? 'Adicionado aos favoritos' : 'Removido dos favoritos'); },
    gerarAuto: () => sheetAuto(),
    confirmarAuto: () => {
      const op = { obj: $('#autoObj .on')?.dataset.v || 'equilibrio', ref: +($('#autoRef .on')?.dataset.v || 3), jejum: +$('#autoJejum').value, dia: +$('#autoDia').value, hora: $('#autoHora').value || '20:00' };
      const r = dietaAutomatica(op); if (r.erro) return toast(r.erro);
      S.dietas.push(r); salvar(); render(); sheetDieta(r.id); toast('Dieta criada com seus favoritos');
    },
    autoOp: el => { $$(`#${el.parentElement.id} button`).forEach(b => b.classList.toggle('on', b === el)); },
    verDieta: el => sheetDieta(el.dataset.id),
    verModelo: el => sheetModelo(el.dataset.k),
    aplicar: el => { const dt = RECS.find(d => d.id === el.dataset.id) || S.dietas.find(d => d.id === el.dataset.id); const seg = dataDe($('#semAplicar').value); const di = $('#diaAplicar') ? +$('#diaAplicar').value : undefined; aplicarDieta(dt, seg, $('#substituir').checked, S, di, $('#horaAplicar')?.value || undefined); if (di != null) seg.setDate(seg.getDate() + di); S.exemplo = false; salvar(); fechar(); mesCal = new Date(seg.getFullYear(), seg.getMonth(), 1); location.hash = 'calendario'; render(); toast(`“${dt.nome}” aplicada`); },
    delDieta: el => { S.dietas = S.dietas.filter(d => d.id !== el.dataset.id); salvar(); fechar(); render(); },
    salvarSemana: () => sheetSalvarSemana(),
    confirmarSalvarSemana: () => {
      const seg = dataDe($('#semSalvar').value), a = seg.getTime(), b = a + 7 * DIA_MS;
      const dias = Array.from({ length: 7 }, (_, k) => clone(diaDe(isoDe(somaDias(seg, k)))));
      const jejum = S.jejuns.filter(j => j.inicio >= a && j.inicio < b).map(j => { const d = new Date(j.inicio); return { dia: dow(d), hora: d.toTimeString().slice(0, 5), horas: Math.round((j.fimPrev - j.inicio) / H) }; });
      S.dietas.push({ id: 'minha-' + uid(), nome: $('#nomeDieta').value.trim() || 'Minha semana', desc: `Salva da semana de ${seg.getDate()}/${seg.getMonth() + 1}.`, dias, jejum });
      salvar(); fechar(); render(); toast('Semana salva em Minhas dietas');
    },
    delSalva: el => { const k = el.dataset.k; fechar(); comDesfazer('Refeição pronta apagada', () => { S.refsSalvas = S.refsSalvas.filter(r => r.id !== k); }); },
    exportar: async () => {
      const nome = `minha-dieta-${hoje()}.json`, blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
      const ok = () => { S.ultimoBackup = Date.now(); salvar(); render(); toast('Backup exportado'); };
      // No iPhone o compartilhamento deixa salvar em Arquivos ou mandar por mensagem
      try { const file = new File([blob], nome, { type: 'application/json' });
        if (navigator.canShare?.({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) { await navigator.share({ files: [file], title: 'Backup Minha Dieta' }); return ok(); } }
      catch (e) { if (e?.name === 'AbortError') return; }
      const a = document.createElement('a'), url = URL.createObjectURL(blob); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); ok(); },
    textoBackup: () => sheet(`${topo('Backup em texto', 'Copie e guarde, ou cole um backup e importe')}<textarea id="bkTxt" rows="6" aria-label="Backup">${esc(JSON.stringify(S))}</textarea><div class="row end"><button class="btn ghost" data-act="copiarBk">Copiar</button><button class="btn" data-act="colarBk">Importar este texto</button></div>`),
    copiarBk: () => { const t = $('#bkTxt'); navigator.clipboard?.writeText(t.value).then(() => { S.ultimoBackup = Date.now(); salvar(); toast('Copiado'); }, () => { t.select(); toast('Selecione e copie'); }); },
    colarBk: () => importar($('#bkTxt').value),
    delCustom: el => { const id = el.dataset.id; comDesfazer(`${FOOD(id)?.nome || 'Alimento'} apagado`, () => apagarAlimento(id)); },
    resetar: () => confirmar('Apagar todos os dados deste aparelho?', () => comDesfazer('Dados apagados', () => {
      const custom = S.custom.filter(f => f.receita); S = normalizar({ v: 2, metas: S.metas, dias: {}, jejuns: [], dietas: [], custom, favs: S.favs.filter(id => DBMAP.has(id) || custom.some(f => f.id === id)), perfil: S.perfil, exemplo: false, migLiq: true, migJejum: true }); }), 'Apagar tudo'),
  };
  // Importar troca todos os dados pelo backup (pode desfazer logo depois)
  function importar(txt) {
    let o; try { o = normalizar(JSON.parse(txt)); } catch (e) { o = null; }
    if (!o) return toast('Arquivo inválido. Use um backup exportado por este app.');
    const n = Object.keys(o.dias).length;
    confirmar(`Trocar os dados deste aparelho pelo backup (${n} ${n === 1 ? 'dia' : 'dias'} no calendário)?`, () => comDesfazer('Backup importado', () => { S = o; S.ultimoBackup = Date.now(); }), 'Importar');
  }
  // Apaga um alimento seu. Se ele está em alguma refeição, fica oculto para não mudar as contas.
  function apagarAlimento(id) {
    const usado = Object.values(S.dias).some(d => d.refeicoes.some(r => r.itens.some(it => it.a === id)) || d.liquidos.some(l => l.a === id))
      || S.dietas.some(dt => dt.dias.some(d => d.refeicoes.some(r => r.itens.some(it => it.a === id)))) || S.refsSalvas.some(r => r.itens.some(it => it.a === id))
      || S.custom.some(f => f.id !== id && f.receita?.some(it => it.a === id));
    if (usado) { const f = S.custom.find(x => x.id === id); if (f) f.oculto = true; } else S.custom = S.custom.filter(f => f.id !== id);
    S.favs = S.favs.filter(x => x !== id);
  }
  const garantirTodos = () => { S.jejuns.filter(j => !j.fim).forEach(j => garantirAguaSal(j)); limparAguaSal(); };
  // Marcar refeição como comida. Se estiver em jejum hoje, encerra o jejum (a quebra encerra direto, outra refeição pergunta).
  function marcarRef(iso, id, depois) {
    const r = acharRef(iso, id); if (!r) return;
    const j = jejumAtivo();
    if (!r.feito && j && iso === hoje() && r.nome !== 'Pré-jejum' && (!r.hora || tsRef(iso, r.hora) >= j.inicio)) {
      if (r.jejum === j.id || r.nome === 'Quebra do jejum') { fechar(); return comDesfazer('', () => { r.feito = true; return encerrar(j, r); }); }
      return perguntarComer(iso, id, depois);
    }
    r.feito = !r.feito; S.exemplo = false; salvar(); depois();
  }
  const setRange = el => el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100).toFixed(1) + '%');
  const INPUT = {
    busca: el => { filtro.q = el.value; $('#lista').innerHTML = listaAlimentos(); },
    buscaP: el => { filtro.qP = el.value; $('#listaP').innerHTML = listaAlimentos(true); },
    gramas: el => { const f = FOOD(el.dataset.a), g = +el.value; $('#gLbl').textContent = ehLiquido(f) ? fmtL(g) : `${g} g${unid(f, g)}`; $('#gPrev').textContent = resumoMacros(soma([{ a: el.dataset.a, g }])); },
    qtd: el => { const g = +el.value, t = soma([{ a: el.dataset.a, g }]); $('#vqLbl').textContent = `${g} g${unid(FOOD(el.dataset.a), g)}`; $('#quad').innerHTML = quad(t); $('#micA').innerHTML = listaMicros(t, 1, true); },
    liqG: el => { $('#lLbl').textContent = fmtL(+el.value); },
    rotMin: el => { $('#v-rMin').textContent = el.value + ' min'; },
    jHoras: el => { $('#v-jH').textContent = rotHoras(+el.value); jPrev(); },
    jPrev: () => jPrev(),
    meta: el => { $('#v-meta-' + el.dataset.k).textContent = `${fmt(+el.value, 0)} ${el.dataset.u}`; S.metas[el.dataset.k] = +el.value; salvar(); $('#kcalCheck') && ($('#kcalCheck').textContent = checkKcal()); },
  };
  const CHANGE = {
    diaAplicar: el => { $$('.dname[data-k0]').forEach(s => { s.textContent = DIAS_C[(+el.value + +s.dataset.k0) % 7]; }); },
    autoJejum: el => { $('#autoIni').hidden = el.value === '0'; },
    refNome: el => { refCtx().nome = el.value.trim() || 'Refeição'; if (!ctx.rasc) { salvar(); render(); } },
    refHora: el => { refCtx().hora = el.value; if (!ctx.rasc) { salvar(); render(); } },
    itemG: el => { itensCtx()[+el.dataset.k].g = Math.max(0, +el.value || 0); reRef(); },
    rcNome: el => { ctx.receita.nome = el.value; },
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
  window.addEventListener('hashchange', () => { fechar(); calSel = null; render(); window.scrollTo(0, 0); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  if (novoEstado) salvar();
  render();
})();
