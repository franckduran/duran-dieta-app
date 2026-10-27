/* Minha Dieta — app em JavaScript puro, dados salvos no aparelho (localStorage). */
(function () {
  'use strict';

  // ---------- Base ----------
  const DB = window.DB;
  const REFS = DB.refs;
  const CATS = Object.fromEntries(DB.categorias.map(c => [c.id, c.nome]));
  const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const DIAS_C = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const MACROS = [
    { k: 'kcal', n: 'Calorias', u: 'kcal' },
    { k: 'proteina_g', n: 'Proteína', u: 'g' },
    { k: 'gordura_g', n: 'Gordura', u: 'g' },
    { k: 'carboidrato_g', n: 'Carboidrato', u: 'g' },
    { k: 'fibra_g', n: 'Fibra', u: 'g' },
  ];
  const MICROS = Object.entries(REFS).map(([k, r]) => ({ k, n: r.nome, u: r.unidade, ref: r.ref }));
  const NUTS = [...MACROS, ...MICROS];
  const NUT = Object.fromEntries(NUTS.map(n => [n.k, n]));
  const TIPOS_REF = { normal: 'Refeição', 'pre-jejum': 'Pré-jejum', 'quebra-jejum': 'Quebra do jejum' };
  const TIPOS_ROT = { sol: 'Sol', treino: 'Treino', outro: 'Outro' };

  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const clone = o => JSON.parse(JSON.stringify(o));
  const fmt = (v, d) => {
    if (v == null || isNaN(v)) return '–';
    const dec = d ?? (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 0 : 1);
    return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: dec, minimumFractionDigits: 0 });
  };
  const hojeISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const diaSemana = (d = new Date()) => (d.getDay() + 6) % 7; // 0 = segunda

  // ---------- Modelos de refeição e dietas recomendadas ----------
  const MODELOS = {
    cafe_ovos: ['Café da manhã', '08:00', 'normal', [['ovo', 200], ['manteiga', 15], ['queijo-minas', 30], ['mamao', 150]]],
    cafe_queijo: ['Café da manhã', '08:00', 'normal', [['ovo', 150], ['queijo-minas', 60], ['abacate', 150]]],
    cafe_forte: ['Café da manhã', '07:30', 'normal', [['ovo', 200], ['clara', 100], ['queijo-minas', 40], ['kiwi', 75]]],
    almoco_contra: ['Almoço', '12:30', 'normal', [['contrafile', 300], ['batata-doce', 200], ['brocolis', 150], ['manteiga', 15]]],
    almoco_alcatra: ['Almoço', '12:30', 'normal', [['alcatra', 300], ['mandioquinha', 200], ['couve', 100], ['tomate', 100], ['azeite', 15]]],
    almoco_figado: ['Almoço', '12:30', 'normal', [['figado', 150], ['cebola', 80], ['batata', 200], ['espinafre', 100], ['abacate', 100], ['manteiga', 20]]],
    almoco_cordeiro: ['Almoço', '12:30', 'normal', [['cordeiro', 300], ['abobora', 250], ['rucula', 60], ['azeite', 15]]],
    almoco_alta: ['Almoço', '12:30', 'normal', [['alcatra', 300], ['batata-doce', 150], ['aspargo', 100]]],
    almoco_fibra: ['Almoço', '12:30', 'normal', [['fraldinha', 250], ['couve-bruxelas', 200], ['batata-doce', 200], ['salsa', 10], ['azeite', 15]]],
    lanche_iogurte: ['Lanche', '16:00', 'normal', [['iogurte', 170], ['morango', 100], ['chia', 15]]],
    lanche_castanhas: ['Lanche', '16:00', 'normal', [['castanha-para', 10], ['nozes', 20], ['laranja', 130]]],
    lanche_fibra: ['Lanche', '16:00', 'normal', [['goiaba', 150], ['iogurte', 170], ['linhaca', 15]]],
    jantar_patinho: ['Jantar', '19:30', 'normal', [['patinho', 250], ['abobrinha', 150], ['cenoura', 100], ['abacate', 100], ['manteiga', 20]]],
    jantar_ovos: ['Jantar', '19:30', 'normal', [['ovo', 250], ['espinafre', 100], ['tomate', 100], ['parmesao', 30], ['manteiga', 10]]],
    jantar_musculo: ['Jantar', '19:30', 'normal', [['musculo', 300], ['mandioca', 200], ['repolho', 120], ['manteiga', 15]]],
    jantar_alta: ['Jantar', '19:30', 'normal', [['patinho', 300], ['brocolis', 200], ['ricota', 80]]],
    jantar_fibra: ['Jantar', '19:30', 'normal', [['ovo', 200], ['quiabo', 150], ['berinjela', 150], ['queijo-minas', 40], ['azeite', 15]]],
    pre_jejum: ['Pré-jejum', '19:00', 'pre-jejum', [['picanha', 350], ['gema', 51], ['manteiga', 30], ['tutano', 40], ['abacate', 150], ['couve', 60]]],
    pre_jejum_forte: ['Pré-jejum forte', '19:00', 'pre-jejum', [['costela', 400], ['ovo', 100], ['gema', 51], ['manteiga', 40], ['cheddar', 50], ['abacate', 150], ['brocolis', 80]]],
    quebra: ['Quebra do jejum', '12:00', 'quebra-jejum', [['ovo', 100], ['abacate', 80], ['patinho', 120], ['abobrinha', 100]]],
  };
  const NOMES_MODELOS = {
    pre_jejum: 'Pré-jejum para 1 a 2 dias', pre_jejum_forte: 'Pré-jejum para 3 dias ou mais', quebra: 'Quebra do jejum (leve)',
    cafe_ovos: 'Café com ovos e mamão', cafe_queijo: 'Café com ovos, queijo e abacate', cafe_forte: 'Café alto em proteína',
    almoco_contra: 'Contrafilé com batata-doce', almoco_alcatra: 'Alcatra com mandioquinha', almoco_figado: 'Fígado acebolado com abacate',
    almoco_cordeiro: 'Cordeiro com abóbora', almoco_alta: 'Alcatra 300 g', almoco_fibra: 'Fraldinha com couve-de-bruxelas',
    lanche_iogurte: 'Iogurte com morango e chia', lanche_castanhas: 'Castanhas e laranja', lanche_fibra: 'Goiaba, iogurte e linhaça',
    jantar_patinho: 'Patinho com legumes', jantar_ovos: 'Omelete de espinafre', jantar_musculo: 'Músculo com mandioca',
    jantar_alta: 'Patinho 300 g com brócolis', jantar_fibra: 'Ovos com quiabo e berinjela',
  };
  const ref = key => { const [nome, hora, tipo, it] = MODELOS[key]; return { id: uid(), nome, hora, tipo, itens: it.map(([a, g]) => ({ a, g })) }; };
  const sol = (min = 20, hora = '09:00') => ({ id: uid(), tipo: 'sol', min, hora, nota: '' });
  const treino = (min, nota, hora = '17:30') => ({ id: uid(), tipo: 'treino', min, hora, nota });
  const dia = (refs, rot, jejum = { modo: 'nenhum', horas: 0 }) => ({ refeicoes: refs.map(ref), rotina: rot, jejum });
  const JANELA16 = () => ({ modo: 'janela', horas: 16 });
  const COMPLETO = () => ({ modo: 'completo', horas: 24 });

  function recomendadas() {
    const mus = () => treino(45, 'Musculação'), cam = () => treino(30, 'Caminhada', '07:00');
    return [
      { id: 'rec-equilibrio', nome: 'Base equilibrada', desc: 'Três refeições por dia com carne vermelha, ovos, tubérculos e vegetais. Fígado uma vez na semana.', dias: [
        dia(['cafe_ovos', 'almoco_contra', 'jantar_patinho'], [sol(), mus()]),
        dia(['cafe_queijo', 'almoco_alcatra', 'jantar_ovos'], [sol(), cam()]),
        dia(['cafe_ovos', 'almoco_figado', 'jantar_musculo'], [sol(), mus()]),
        dia(['cafe_queijo', 'almoco_cordeiro', 'jantar_patinho'], [sol(), cam()]),
        dia(['cafe_ovos', 'almoco_contra', 'jantar_ovos'], [sol(), mus()]),
        dia(['cafe_queijo', 'almoco_alcatra', 'lanche_castanhas', 'jantar_musculo'], [sol(30), cam()]),
        dia(['almoco_cordeiro', 'jantar_patinho'], [sol(30)]),
      ] },
      { id: 'rec-proteina', nome: 'Alta proteína', desc: 'Cerca de 200 g de proteína por dia, para ganhar ou manter massa muscular com treino forte.', dias: [
        dia(['cafe_forte', 'almoco_alta', 'jantar_alta'], [sol(), mus()]),
        dia(['cafe_forte', 'almoco_contra', 'lanche_iogurte', 'jantar_alta'], [sol(), mus()]),
        dia(['cafe_forte', 'almoco_alta', 'jantar_musculo'], [sol(), cam()]),
        dia(['cafe_forte', 'almoco_alta', 'jantar_alta'], [sol(), mus()]),
        dia(['cafe_forte', 'almoco_figado', 'lanche_iogurte', 'jantar_alta'], [sol(), mus()]),
        dia(['cafe_forte', 'almoco_cordeiro', 'jantar_alta'], [sol(30), cam()]),
        dia(['cafe_queijo', 'almoco_alta', 'jantar_patinho'], [sol(30)]),
      ] },
      { id: 'rec-fibras', nome: 'Fibras e micronutrientes', desc: 'Mais verduras, frutas e sementes ao lado da carne. Boa para quem quer subir fibra, vitamina C, K e folato.', dias: [
        dia(['cafe_ovos', 'almoco_fibra', 'lanche_fibra', 'jantar_fibra'], [sol(), mus()]),
        dia(['cafe_queijo', 'almoco_alcatra', 'lanche_iogurte', 'jantar_ovos'], [sol(), cam()]),
        dia(['cafe_ovos', 'almoco_figado', 'lanche_fibra', 'jantar_fibra'], [sol(), mus()]),
        dia(['cafe_queijo', 'almoco_fibra', 'lanche_castanhas', 'jantar_patinho'], [sol(), cam()]),
        dia(['cafe_ovos', 'almoco_cordeiro', 'lanche_fibra', 'jantar_fibra'], [sol(), mus()]),
        dia(['cafe_queijo', 'almoco_fibra', 'lanche_iogurte', 'jantar_musculo'], [sol(30), cam()]),
        dia(['almoco_alcatra', 'lanche_fibra', 'jantar_ovos'], [sol(30)]),
      ] },
      { id: 'rec-jejum2', nome: 'Semana com jejum de 2 dias', desc: 'Janela de 16 h nos dias normais. Pré-jejum gordo na terça à noite, quarta e quinta sem comer, quebra leve na sexta.', dias: [
        dia(['almoco_contra', 'jantar_patinho'], [sol(), mus()], JANELA16()),
        dia(['almoco_alcatra', 'pre_jejum'], [sol(), cam()], JANELA16()),
        dia([], [sol(), cam()], COMPLETO()),
        dia([], [sol(), cam()], COMPLETO()),
        dia(['quebra', 'jantar_musculo'], [sol()], JANELA16()),
        dia(['almoco_cordeiro', 'jantar_patinho'], [sol(30), mus()], JANELA16()),
        dia(['cafe_queijo', 'almoco_contra', 'jantar_ovos'], [sol(30)]),
      ] },
      { id: 'rec-jejum4', nome: 'Semana com jejum de 4 dias', desc: 'Pré-jejum forte no domingo à noite, jejum de segunda a quinta, quebra leve na sexta e recarga no fim de semana.', dias: [
        dia([], [sol(), cam()], COMPLETO()),
        dia([], [sol(), cam()], COMPLETO()),
        dia([], [sol(), cam()], COMPLETO()),
        dia([], [sol()], COMPLETO()),
        dia(['quebra', 'jantar_patinho'], [sol()]),
        dia(['cafe_ovos', 'almoco_contra', 'lanche_castanhas', 'jantar_musculo'], [sol(30), mus()]),
        dia(['cafe_queijo', 'almoco_alcatra', 'pre_jejum_forte'], [sol(30)]),
      ] },
    ];
  }
  const RECS = recomendadas();

  // ---------- Estado ----------
  const KEY = 'minha-dieta.v1';
  function estadoInicial() {
    const base = clone(RECS[0]);
    return {
      v: 1,
      metas: { kcal: 2400, proteina_g: 170, gordura_g: 150, carboidrato_g: 120, fibra_g: 30 },
      dietas: [{ id: 'minha-' + uid(), nome: 'Minha semana', desc: 'Cópia da Base equilibrada para você ajustar.', dias: base.dias }],
      ativa: null,
      custom: [],
      log: {},
      jejum: { inicio: null, alvoH: 48, historico: [] },
      ui: { dia: diaSemana(), editando: null },
    };
  }
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  if (!S || S.v !== 1) S = estadoInicial();
  if (!S.ativa || !S.dietas.find(d => d.id === S.ativa)) S.ativa = S.dietas[0]?.id || null;
  S.ui = S.ui || { dia: diaSemana() };
  const salvar = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* armazenamento indisponível */ } };

  const alimentos = () => [...DB.alimentos, ...S.custom];
  const FOOD = id => alimentos().find(f => f.id === id);
  const dietaAtiva = () => S.dietas.find(d => d.id === S.ativa);
  const dietaEditando = () => S.dietas.find(d => d.id === (S.ui.editando || S.ativa)) || dietaAtiva();

  // ---------- Cálculo ----------
  function valor(f, k) { if (!f) return 0; return k in f ? (f[k] || 0) : (f.micro?.[k] || 0); }
  function somaItens(itens) {
    const t = Object.fromEntries(NUTS.map(n => [n.k, 0]));
    for (const it of itens) { const f = FOOD(it.a); if (!f) continue; for (const n of NUTS) t[n.k] += valor(f, n.k) * it.g / 100; }
    return t;
  }
  const itensDia = d => d.jejum?.modo === 'completo' ? [] : d.refeicoes.flatMap(r => r.itens);
  const totalDia = d => somaItens(itensDia(d));
  const minRot = (d, tipo) => d.rotina.filter(r => r.tipo === tipo).reduce((s, r) => s + (+r.min || 0), 0);
  const horasJejum = d => d.jejum?.modo === 'completo' ? 24 : d.jejum?.modo === 'janela' ? (+d.jejum.horas || 0) : 0;
  function totalSemana(dias) {
    const t = Object.fromEntries(NUTS.map(n => [n.k, 0]));
    dias.forEach(d => { const x = totalDia(d); NUTS.forEach(n => t[n.k] += x[n.k]); });
    return t;
  }
  const kc = v => v >= 1000 ? fmt(v / 1000, 1) + 'k' : fmt(v, 0);
  const pct = (v, ref) => ref ? Math.round(v / ref * 100) : 0;
  const metaDe = k => S.metas[k] ?? REFS[k]?.ref;
  // posição de um dia dentro de um bloco de jejum completo (considera a semana como ciclo)
  function blocoJejum(dias, i) {
    if (dias[i].jejum?.modo !== 'completo') return null;
    let ini = i, n = 0; while (n < 6 && dias[(ini + 6) % 7].jejum?.modo === 'completo') { ini = (ini + 6) % 7; n++; }
    let tam = 1; while (tam < 7 && dias[(ini + tam) % 7].jejum?.modo === 'completo') tam++;
    return { pos: ((i - ini + 7) % 7) + 1, tam };
  }

  // ---------- Componentes ----------
  const barra = (p, cls = '') => `<span class="bar ${cls}"><i style="width:${Math.min(100, Math.max(0, p))}%"></i></span>`;
  function macroLinha(t) {
    return `<span class="mline"><b>${fmt(t.kcal, 0)}</b> kcal · P ${fmt(t.proteina_g, 0)} · G ${fmt(t.gordura_g, 0)} · C ${fmt(t.carboidrato_g, 0)} · F ${fmt(t.fibra_g, 0)}</span>`;
  }
  function metasBloco(t, mult = 1, titulo = '') {
    return `<div class="metas">${titulo ? `<h3>${titulo}</h3>` : ''}${MACROS.map(m => {
      const meta = (S.metas[m.k] || 0) * mult; const p = pct(t[m.k], meta);
      return `<div class="meta-row m-${m.k}"><span class="lbl">${m.n}</span><span class="num">${fmt(t[m.k], 0)}<small> / ${fmt(meta, 0)} ${m.u}</small></span>${barra(p)}</div>`;
    }).join('')}</div>`;
  }
  function microsBloco(t, mult = 1, limite = 99) {
    const linhas = MICROS.map(m => ({ ...m, v: t[m.k], p: pct(t[m.k], m.ref * mult) })).sort((a, b) => b.p - a.p).slice(0, limite);
    return `<div class="micros">${linhas.map(m => `<div class="micro-row ${m.p >= 100 ? 'ok' : m.p < 50 ? 'low' : ''}"><span class="lbl">${m.n}</span><span class="num">${fmt(m.v)} ${m.u}</span><span class="pct">${m.p}%</span>${barra(m.p)}</div>`).join('')}</div>`;
  }
  function pctGordura(t) { return t.kcal ? Math.round(t.gordura_g * 9 / t.kcal * 100) : 0; }

  // ---------- Telas ----------
  const VIEWS = { hoje: vHoje, plano: vPlano, alimentos: vAlimentos, dietas: vDietas, metricas: vMetricas, ajustes: vAjustes };
  const TITULOS = { hoje: 'Hoje', plano: 'Plano da semana', alimentos: 'Alimentos', dietas: 'Dietas', metricas: 'Métricas', ajustes: 'Metas e dados' };
  let view = 'hoje';

  function render() {
    const h = (location.hash || '').replace('#', '');
    view = VIEWS[h] ? h : 'hoje';
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === view));
    $('#titulo').textContent = TITULOS[view];
    $('#main').innerHTML = VIEWS[view]();
    after[view]?.();
  }
  const after = {};

  // ----- Hoje -----
  function vHoje() {
    const dieta = dietaAtiva();
    const now = new Date(), iso = hojeISO(now), di = diaSemana(now);
    const log = S.log[iso] || { ref: {}, rot: {} };
    if (!dieta) return `<div class="empty"><p>Nenhuma dieta ativa.</p><a class="btn" href="#dietas">Escolher uma dieta</a></div>`;
    const d = dieta.dias[di];
    const plan = totalDia(d);
    const comido = somaItens(Object.values(log.ref).flat());
    const bloco = blocoJejum(dieta.dias, di);
    const data = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return `
    <section class="hero">
      <p class="eyebrow">${esc(data)} · ${esc(dieta.nome)}</p>
      ${bloco ? `<h2>Dia ${bloco.pos} de ${bloco.tam} de jejum</h2>` : d.jejum?.modo === 'janela' ? `<h2>Janela de ${d.jejum.horas} h de jejum</h2>` : `<h2>${d.refeicoes.length} refeições planejadas</h2>`}
    </section>
    ${cartaoJejum()}
    <div class="grid2">
      <section class="card">
        <div class="card-h"><h3>Refeições</h3><a class="link" href="#plano" data-act="irDia" data-i="${di}">Editar dia</a></div>
        ${d.jejum?.modo === 'completo' ? `<p class="muted">Dia sem refeições. Água, sal e eletrólitos.</p>` :
          d.refeicoes.length ? d.refeicoes.map(r => {
            const feito = !!log.ref[r.id]; const t = somaItens(r.itens);
            return `<label class="check ${feito ? 'done' : ''}"><input type="checkbox" data-act="comi" data-id="${r.id}" ${feito ? 'checked' : ''}>
              <span class="check-b"><span class="check-t"><b>${esc(r.nome)}</b> <small>${esc(r.hora || '')}</small> ${r.tipo !== 'normal' ? `<span class="tag t-${r.tipo}">${TIPOS_REF[r.tipo]}</span>` : ''}</span>
              <span class="muted small">${r.itens.map(it => `${esc(FOOD(it.a)?.nome || it.a)} ${it.g} g`).join(', ')}</span>${macroLinha(t)}</span></label>`;
          }).join('') : `<p class="muted">Nada planejado para hoje.</p>`}
      </section>
      <section class="card">
        <div class="card-h"><h3>Rotina</h3></div>
        ${d.rotina.length ? d.rotina.map(r => {
          const feito = !!log.rot[r.id];
          return `<label class="check ${feito ? 'done' : ''}"><input type="checkbox" data-act="fiz" data-id="${r.id}" ${feito ? 'checked' : ''}>
            <span class="check-b"><span class="check-t"><span class="tag t-${r.tipo}">${TIPOS_ROT[r.tipo]}</span> <b>${r.min} min</b> ${esc(r.nota || '')} <small>${esc(r.hora || '')}</small></span></span></label>`;
        }).join('') : `<p class="muted">Sem sol ou treino planejados.</p>`}
        <div class="stats3">
          <div><span class="k">Sol</span><span class="v">${minRot(d, 'sol')} min</span></div>
          <div><span class="k">Treino</span><span class="v">${minRot(d, 'treino')} min</span></div>
          <div><span class="k">Jejum</span><span class="v">${horasJejum(d)} h</span></div>
        </div>
      </section>
    </div>
    <div class="grid2">
      <section class="card">${metasBloco(comido, 1, 'Comido até agora')}<p class="muted small">Planejado para hoje: ${macroLinha(plan)}</p></section>
      <section class="card"><h3>Micronutrientes do plano de hoje</h3>${microsBloco(plan, 1, 8)}<a class="link" href="#metricas">Ver todos</a></section>
    </div>`;
  }

  function cartaoJejum() {
    const j = S.jejum;
    if (!j.inicio) {
      return `<section class="card fast">
        <div class="card-h"><h3>Jejum</h3>${S.jejum.historico.length ? `<span class="muted small">Último: ${fmt(S.jejum.historico[0].horas, 0)} h</span>` : ''}</div>
        <div class="row wrap">
          <label class="field inline"><span>Meta</span><select id="alvoJejum" data-act="alvo">${[16, 24, 36, 48, 72, 96, 120].map(h => `<option value="${h}" ${+j.alvoH === h ? 'selected' : ''}>${h} h${h >= 24 ? ` (${fmt(h / 24)} ${h >= 48 ? 'dias' : 'dia'})` : ''}</option>`).join('')}</select></label>
          <button class="btn" data-act="iniciarJejum">Iniciar jejum agora</button>
        </div></section>`;
    }
    return `<section class="card fast on"><div class="card-h"><h3>Em jejum</h3><span class="muted small" id="jejumFase"></span></div>
      <div class="fast-time"><span id="jejumTempo">--:--</span><small>de ${j.alvoH} h</small></div>
      <span class="bar big"><i id="jejumBar" style="width:0%"></i></span>
      <div class="row wrap between">
        <label class="field inline"><span>Começou</span><input type="datetime-local" id="jejumInicio" data-act="editInicio" value="${toLocalInput(j.inicio)}"></label>
        <button class="btn ghost" data-act="encerrarJejum">Encerrar jejum</button>
      </div>
      ${j.alvoH > 72 ? `<p class="muted small">Acima de 72 h, reponha sódio, potássio e magnésio e tenha acompanhamento médico.</p>` : ''}
    </section>`;
  }
  const toLocalInput = ts => { const d = new Date(ts); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
  const FASES = [[0, 'Digestão, usando glicogênio'], [12, 'Glicogênio baixando'], [18, 'Mais gordura como energia'], [24, 'Cetose'], [48, 'Cetose profunda'], [72, 'Jejum prolongado']];
  let timer = null;
  after.hoje = () => {
    clearInterval(timer);
    const tick = () => {
      const j = S.jejum; if (!j.inicio || !$('#jejumTempo')) return clearInterval(timer);
      const h = (Date.now() - j.inicio) / 36e5;
      $('#jejumTempo').textContent = `${Math.floor(h)}h ${String(Math.floor((h % 1) * 60)).padStart(2, '0')}m`;
      $('#jejumBar').style.width = Math.min(100, h / j.alvoH * 100) + '%';
      $('#jejumFase').textContent = FASES.filter(f => h >= f[0]).pop()[1];
    };
    tick(); timer = setInterval(tick, 30000);
  };

  // ----- Plano -----
  function vPlano() {
    const dieta = dietaEditando();
    if (!dieta) return `<div class="empty"><p>Crie ou escolha uma dieta primeiro.</p><a class="btn" href="#dietas">Ver dietas</a></div>`;
    const i = S.ui.dia ?? 0, d = dieta.dias[i], t = totalDia(d), bloco = blocoJejum(dieta.dias, i);
    return `
    <div class="toolbar">
      <label class="field inline grow"><span>Dieta</span><select data-act="editarDieta">${S.dietas.map(x => `<option value="${x.id}" ${x.id === dieta.id ? 'selected' : ''}>${esc(x.nome)}${x.id === S.ativa ? ' (ativa)' : ''}</option>`).join('')}</select></label>
      <button class="btn ghost" data-act="planejarJejum">Planejar jejum</button>
    </div>
    <p class="muted small">kcal e proteína (g) por dia</p><nav class="days">${dieta.dias.map((x, k) => {
      const tt = totalDia(x), jj = x.jejum?.modo;
      return `<button class="day ${k === i ? 'on' : ''} ${jj === 'completo' ? 'fasting' : ''}" data-act="dia" data-i="${k}"><b>${DIAS_C[k]}</b><small>${jj === 'completo' ? 'jejum' : kc(tt.kcal)}</small><small>${jj === 'completo' ? '24 h' : 'P ' + fmt(tt.proteina_g, 0)}</small></button>`;
    }).join('')}</nav>
    <div class="plan">
      <div class="plan-main">
        <section class="card">
          <div class="card-h"><h3>${DIAS[i]}${bloco ? ` <span class="tag t-pre-jejum">jejum ${bloco.pos}/${bloco.tam}</span>` : ''}</h3>
            <div class="seg" role="group" aria-label="Jejum do dia">
              ${[['nenhum', 'Normal'], ['janela', 'Janela'], ['completo', 'Jejum 24 h']].map(([m, n]) => `<button class="${(d.jejum?.modo || 'nenhum') === m ? 'on' : ''}" data-act="modoJejum" data-m="${m}">${n}</button>`).join('')}
            </div></div>
          ${d.jejum?.modo === 'janela' ? `<label class="field inline"><span>Horas de jejum no dia</span><input type="number" min="12" max="23" step="1" value="${d.jejum.horas}" data-act="horasJanela" class="num-in"> <small class="muted">comendo em ${24 - d.jejum.horas} h</small></label>` : ''}
          ${d.jejum?.modo === 'completo' ? `<p class="muted">Dia inteiro sem comer. As refeições deste dia não entram na conta.</p>` : ''}
        </section>
        ${d.jejum?.modo === 'completo' ? '' : d.refeicoes.map((r, ri) => cartaoRefeicao(r, ri)).join('')}
        ${d.jejum?.modo === 'completo' ? '' : `<div class="row wrap"><button class="btn ghost" data-act="novaRef">Adicionar refeição</button><button class="btn ghost" data-act="modeloRef">Usar modelo de refeição</button></div>`}
        <section class="card">
          <div class="card-h"><h3>Rotina</h3><div class="row"><button class="btn sm ghost" data-act="addRot" data-t="sol">+ Sol</button><button class="btn sm ghost" data-act="addRot" data-t="treino">+ Treino</button><button class="btn sm ghost" data-act="addRot" data-t="outro">+ Outro</button></div></div>
          ${d.rotina.length ? d.rotina.map(r => `
            <div class="rot-row">
              <span class="tag t-${r.tipo}">${TIPOS_ROT[r.tipo]}</span>
              <input type="number" min="0" step="5" value="${r.min}" data-act="rotMin" data-id="${r.id}" class="num-in" aria-label="Minutos"><small>min</small>
              <input type="time" value="${esc(r.hora || '')}" data-act="rotHora" data-id="${r.id}" aria-label="Horário">
              <input type="text" value="${esc(r.nota || '')}" placeholder="${r.tipo === 'treino' ? 'Musculação, corrida…' : r.tipo === 'sol' ? 'Manhã, sem protetor…' : 'Descrição'}" data-act="rotNota" data-id="${r.id}" class="grow">
              <button class="x" data-act="delRot" data-id="${r.id}" aria-label="Remover">×</button>
            </div>`).join('') : `<p class="muted">Adicione minutos de sol e de treino para este dia.</p>`}
          <div class="row wrap"><button class="btn sm ghost" data-act="copiarRotina">Copiar esta rotina para todos os dias</button></div>
        </section>
      </div>
      <aside class="plan-side">
        <section class="card sticky">
          ${metasBloco(t, 1, 'Total do dia')}
          <p class="muted small">${pctGordura(t)}% das calorias vêm da gordura.</p>
          <h3>Micronutrientes</h3>${microsBloco(t, 1, 20)}
          <p class="muted small">Soma só dos nutrientes listados na base. Valores que faltam contam como zero.</p>
        </section>
      </aside>
    </div>`;
  }
  function cartaoRefeicao(r, ri) {
    const t = somaItens(r.itens);
    return `<section class="card meal t-${r.tipo}">
      <div class="card-h meal-h">
        <input type="text" class="meal-name" value="${esc(r.nome)}" data-act="refNome" data-id="${r.id}" aria-label="Nome da refeição">
        <input type="time" value="${esc(r.hora || '')}" data-act="refHora" data-id="${r.id}" aria-label="Horário">
        <select data-act="refTipo" data-id="${r.id}" aria-label="Tipo">${Object.entries(TIPOS_REF).map(([k, n]) => `<option value="${k}" ${r.tipo === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <button class="x" data-act="delRef" data-id="${r.id}" aria-label="Remover refeição">×</button>
      </div>
      ${r.itens.length ? `<ul class="items">${r.itens.map((it, k) => { const f = FOOD(it.a); const n = somaItens([it]);
        return `<li><button class="link-f" data-act="verAlimento" data-a="${esc(it.a)}">${esc(f?.nome || it.a)}</button>
          <span class="g"><input type="number" min="0" step="5" value="${it.g}" data-act="itemG" data-id="${r.id}" data-k="${k}" class="num-in" aria-label="Gramas">g${f?.un ? `<small class="muted"> ≈ ${fmt(it.g / f.un, 1)} un</small>` : ''}</span>
          <span class="muted small">${fmt(n.kcal, 0)} kcal · P ${fmt(n.proteina_g, 0)} · G ${fmt(n.gordura_g, 0)}</span>
          <button class="x" data-act="delItem" data-id="${r.id}" data-k="${k}" aria-label="Remover">×</button></li>`; }).join('')}</ul>` : `<p class="muted">Sem alimentos ainda.</p>`}
      <div class="meal-f"><button class="btn sm" data-act="addItem" data-id="${r.id}">+ Alimento</button>${macroLinha(t)}${r.tipo === 'pre-jejum' ? `<span class="tag t-pre-jejum">${pctGordura(t)}% gordura</span>` : ''}</div>
    </section>`;
  }

  // ----- Alimentos -----
  const filtro = { q: '', qP: '', cat: '', ord: 'proteina_g', base: 'g' };
  function vAlimentos() {
    return `
    <div class="filters">
      <input type="search" id="busca" placeholder="Buscar alimento" value="${esc(filtro.q)}" data-act="busca" aria-label="Buscar">
      <label class="field inline"><span>Mais rico em</span><select id="ord" data-act="ord">${NUTS.map(n => `<option value="${n.k}" ${filtro.ord === n.k ? 'selected' : ''}>${n.n}</option>`).join('')}</select></label>
      <div class="seg" role="group" aria-label="Base de comparação"><button class="${filtro.base === 'g' ? 'on' : ''}" data-act="base" data-b="g">por 100 g</button><button class="${filtro.base === 'kcal' ? 'on' : ''}" data-act="base" data-b="kcal">por 100 kcal</button></div>
    </div>
    <div class="chips">${[['', 'Todos'], ...Object.entries(CATS)].map(([k, n]) => `<button class="chip ${filtro.cat === k ? 'on' : ''}" data-act="cat" data-c="${k}">${n}</button>`).join('')}</div>
    <div id="lista">${listaAlimentos()}</div>
    <div class="row"><button class="btn ghost" data-act="novoAlimento">Cadastrar alimento</button></div>
    <p class="muted small">${esc(DB.aviso)}</p>`;
  }
  function listaFiltrada(picker) {
    const q = (picker ? filtro.qP : filtro.q).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const k = filtro.ord;
    const score = f => { const v = valor(f, k); return filtro.base === 'kcal' ? (f.kcal ? v / f.kcal * 100 : 0) : v; };
    return alimentos().filter(f => (!filtro.cat || f.categoria === filtro.cat) && (!q || f.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)))
      .map(f => ({ f, s: score(f) })).sort((a, b) => b.s - a.s);
  }
  function listaAlimentos(picker) {
    const L = listaFiltrada(picker); const max = Math.max(...L.map(x => x.s), 0.0001); const n = NUT[filtro.ord];
    if (!L.length) return `<p class="muted">Nenhum alimento encontrado.</p>`;
    return `<ul class="foods">${L.map(({ f, s }) => `
      <li><button data-act="${picker ? 'escolher' : 'verAlimento'}" data-a="${esc(f.id)}">
        <span class="fn"><b>${esc(f.nome)}</b><small>${CATS[f.categoria] || ''}</small></span>
        <span class="fv"><span class="num">${fmt(s)} <small>${n.u}</small></span>${barra(s / max * 100)}</span>
        <span class="fm muted small">${fmt(f.kcal, 0)} kcal · P ${fmt(f.proteina_g)} · G ${fmt(f.gordura_g)} · C ${fmt(f.carboidrato_g)} · F ${fmt(f.fibra_g)}</span>
      </button></li>`).join('')}</ul>`;
  }

  // ----- Dietas -----
  function resumoDieta(d) {
    const t = totalSemana(d.dias); const jd = d.dias.filter(x => x.jejum?.modo === 'completo').length; const comendo = 7 - jd || 1;
    return `<div class="sum">
      <div><span class="k">Média por dia comendo</span><span class="v">${fmt(t.kcal / comendo, 0)} kcal</span></div>
      <div><span class="k">Proteína/dia</span><span class="v">${fmt(t.proteina_g / comendo, 0)} g</span></div>
      <div><span class="k">Gordura/dia</span><span class="v">${fmt(t.gordura_g / comendo, 0)} g</span></div>
      <div><span class="k">Fibra/dia</span><span class="v">${fmt(t.fibra_g / comendo, 0)} g</span></div>
      <div><span class="k">Dias de jejum</span><span class="v">${jd}</span></div>
    </div>`;
  }
  function vDietas() {
    return `
    <section><div class="sec-h"><h2>Minhas dietas</h2><button class="btn" data-act="novaDieta">Nova dieta em branco</button></div>
      ${S.dietas.map(d => `<article class="card diet ${d.id === S.ativa ? 'active' : ''}">
        <div class="card-h"><input type="text" class="diet-name" value="${esc(d.nome)}" data-act="nomeDieta" data-id="${d.id}" aria-label="Nome da dieta">${d.id === S.ativa ? '<span class="tag t-ativa">Ativa</span>' : ''}</div>
        ${d.desc ? `<p class="muted small">${esc(d.desc)}</p>` : ''}
        ${resumoDieta(d)}
        <div class="row wrap">
          ${d.id !== S.ativa ? `<button class="btn sm" data-act="ativar" data-id="${d.id}">Usar esta semana</button>` : ''}
          <button class="btn sm ghost" data-act="abrirDieta" data-id="${d.id}">Editar</button>
          <button class="btn sm ghost" data-act="duplicar" data-id="${d.id}">Duplicar</button>
          ${S.dietas.length > 1 ? `<button class="btn sm ghost danger" data-act="apagarDieta" data-id="${d.id}">Apagar</button>` : ''}
        </div></article>`).join('')}
    </section>
    <section><div class="sec-h"><h2>Recomendadas</h2></div>
      <p class="muted">Montadas com os alimentos da base. Use uma como ponto de partida: ela vira uma cópia sua, que você pode mudar à vontade.</p>
      ${RECS.map(d => `<article class="card diet">
        <div class="card-h"><h3>${esc(d.nome)}</h3></div>
        <p class="muted small">${esc(d.desc)}</p>
        ${resumoDieta(d)}
        <div class="row wrap"><button class="btn sm" data-act="usarRec" data-id="${d.id}">Usar como minha</button><button class="btn sm ghost" data-act="verRec" data-id="${d.id}">Ver a semana</button></div>
      </article>`).join('')}
    </section>
    <section><div class="sec-h"><h2>Modelos de refeição</h2></div>
      <div class="tpls">${Object.keys(MODELOS).map(k => { const r = ref(k); const t = somaItens(r.itens);
        return `<article class="card tpl t-${r.tipo}"><h3>${esc(NOMES_MODELOS[k])}</h3>${r.tipo !== 'normal' ? `<span class="tag t-${r.tipo}">${TIPOS_REF[r.tipo]}</span>` : ''}
        <p class="muted small">${r.itens.map(it => `${esc(FOOD(it.a)?.nome)} ${it.g} g`).join(', ')}</p>${macroLinha(t)}<p class="muted small">${pctGordura(t)}% das calorias da gordura</p></article>`; }).join('')}</div>
    </section>`;
  }

  // ----- Métricas -----
  let periodo = 'plano', nutSel = 'proteina_g';
  function diasRealizados() {
    const out = [];
    for (let k = 6; k >= 0; k--) {
      const d = new Date(); d.setDate(d.getDate() - k); const iso = hojeISO(d); const lg = S.log[iso] || { ref: {}, rot: {}, rotMin: {} };
      const itens = Object.values(lg.ref).flat(); const t = somaItens(itens);
      out.push({ nome: DIAS_C[diaSemana(d)] + ' ' + d.getDate(), t, sol: lg.solMin || 0, treino: lg.treinoMin || 0, jejum: lg.jejumH || 0 });
    }
    return out;
  }
  function vMetricas() {
    const dieta = dietaAtiva();
    let linhas;
    if (periodo === 'plano') linhas = dieta ? dieta.dias.map((d, k) => ({ nome: DIAS_C[k], t: totalDia(d), sol: minRot(d, 'sol'), treino: minRot(d, 'treino'), jejum: horasJejum(d) })) : [];
    else linhas = diasRealizados();
    const T = Object.fromEntries(NUTS.map(n => [n.k, linhas.reduce((s, l) => s + l.t[n.k], 0)]));
    const n = NUT[nutSel]; const meta = metaDe(nutSel) || 0;
    const max = Math.max(meta, ...linhas.map(l => l.t[nutSel]), 1);
    const tot = k => linhas.reduce((s, l) => s + l[k], 0);
    return `
    <div class="toolbar">
      <div class="seg" role="group" aria-label="Período"><button class="${periodo === 'plano' ? 'on' : ''}" data-act="periodo" data-p="plano">Semana planejada</button><button class="${periodo === 'real' ? 'on' : ''}" data-act="periodo" data-p="real">Últimos 7 dias (marcados)</button></div>
    </div>
    ${periodo === 'real' ? `<p class="muted small">Conta só as refeições e a rotina que você marcou como feitas na tela Hoje.</p>` : `<p class="muted small">${esc(dieta?.nome || '')}</p>`}
    <section class="sum big">
      ${MACROS.map(m => `<div><span class="k">${m.n} na semana</span><span class="v">${fmt(T[m.k], 0)} <small>${m.u}</small></span><span class="k">${fmt(T[m.k] / 7, 0)} ${m.u}/dia em média</span></div>`).join('')}
      <div><span class="k">Sol</span><span class="v">${tot('sol')} <small>min</small></span><span class="k">Treino ${tot('treino')} min</span></div>
      <div><span class="k">Jejum</span><span class="v">${fmt(tot('jejum'), 0)} <small>h</small></span><span class="k">na semana</span></div>
    </section>
    <section class="card">
      <div class="card-h"><h3>Por dia</h3><select data-act="nutSel" aria-label="Nutriente">${NUTS.map(x => `<option value="${x.k}" ${x.k === nutSel ? 'selected' : ''}>${x.n}</option>`).join('')}</select></div>
      <div class="chart" style="--meta-n:${meta / max}">
        ${meta ? `<span class="chart-meta" title="Meta">meta ${fmt(meta)} ${n.u}</span>` : ''}
        ${linhas.map(l => `<div class="col"><span class="cv">${fmt(l.t[nutSel], 0)}</span><span class="cb"><i style="height:${l.t[nutSel] / max * 100}%"></i></span><span class="cl">${esc(l.nome)}</span></div>`).join('')}
      </div>
    </section>
    <section class="card"><h3>Tabela da semana</h3><div class="tablewrap"><table>
      <thead><tr><th>Dia</th>${MACROS.map(m => `<th>${m.n.slice(0, 4)}.</th>`).join('')}<th>Sol</th><th>Treino</th><th>Jejum</th></tr></thead>
      <tbody>${linhas.map(l => `<tr><td>${esc(l.nome)}</td>${MACROS.map(m => `<td>${fmt(l.t[m.k], 0)}</td>`).join('')}<td>${l.sol}</td><td>${l.treino}</td><td>${l.jejum}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td>${MACROS.map(m => `<td>${fmt(T[m.k], 0)}</td>`).join('')}<td>${tot('sol')}</td><td>${tot('treino')}</td><td>${fmt(tot('jejum'), 0)}</td></tr></tfoot>
    </table></div></section>
    <section class="card"><h3>Micronutrientes na semana</h3><p class="muted small">Porcentagem da referência semanal (referência diária × 7).</p>${microsBloco(T, 7)}</section>`;
  }

  // ----- Ajustes -----
  function vAjustes() {
    return `
    <section class="card"><h3>Metas diárias</h3>
      <div class="form-grid">${MACROS.map(m => `<label class="field"><span>${m.n} (${m.u})</span><input type="number" min="0" step="1" value="${S.metas[m.k] ?? ''}" data-act="meta" data-k="${m.k}"></label>`).join('')}</div>
      <p class="muted small">As vitaminas e minerais usam a referência diária para homem adulto (DRI).</p>
    </section>
    <section class="card"><h3>Backup</h3>
      <p class="muted small">Seus dados ficam salvos neste aparelho. Para levar do iPhone para o computador, ou guardar uma cópia, exporte e importe o arquivo.</p>
      <div class="row wrap"><button class="btn" data-act="exportar">Exportar backup</button><label class="btn ghost">Importar backup<input type="file" accept="application/json,.json" data-act="importar" hidden></label></div>
      <details><summary>Copiar e colar como texto</summary>
        <textarea id="backupTxt" rows="5" aria-label="Backup em texto"></textarea>
        <div class="row wrap"><button class="btn sm ghost" data-act="mostrarTxt">Gerar texto</button><button class="btn sm ghost" data-act="copiarTxt">Copiar</button><button class="btn sm ghost" data-act="colarTxt">Importar texto colado</button></div>
      </details>
    </section>
    <section class="card"><h3>Alimentos cadastrados por você</h3>
      ${S.custom.length ? `<ul class="plain">${S.custom.map(f => `<li>${esc(f.nome)} <button class="x" data-act="delCustom" data-id="${f.id}" aria-label="Apagar">×</button></li>`).join('')}</ul>` : `<p class="muted small">Nenhum ainda. Cadastre em Alimentos.</p>`}
    </section>
    <section class="card"><h3>Recomeçar</h3><p class="muted small">Apaga dietas, histórico e metas deste aparelho.</p><button class="btn ghost danger" data-act="resetar">Apagar todos os dados</button></section>
    <p class="muted small">Fontes: USDA FoodData Central e TACO (UNICAMP). Valores aproximados, por 100 g cru.</p>`;
  }

  // ---------- Painel inferior (sheet) ----------
  let sheetCtx = null;
  function abrirSheet(html, ctx = {}) { sheetCtx = ctx; $('#sheet-c').innerHTML = html; $('#sheet').hidden = false; document.body.classList.add('locked'); setTimeout(() => $('#sheet-c [autofocus]')?.focus(), 50); }
  function fecharSheet() { $('#sheet').hidden = true; document.body.classList.remove('locked'); sheetCtx = null; }

  function sheetAlimento(id, g = 100) {
    const f = FOOD(id); if (!f) return;
    const t = somaItens([{ a: id, g }]);
    abrirSheet(`<div class="sheet-h"><div><h2>${esc(f.nome)}</h2><p class="muted small">${CATS[f.categoria] || ''} · ${esc(f.fonte || '')}</p></div><button class="x big" data-act="fechar" aria-label="Fechar">×</button></div>
      <label class="field inline"><span>Quantidade</span><input type="number" id="qtdG" min="1" step="5" value="${g}" data-act="qtdVer" data-a="${esc(id)}" class="num-in"> g ${f.un ? `<small class="muted">(1 un ≈ ${f.un} g)</small>` : ''}</label>
      ${f.beneficio ? `<p>${esc(f.beneficio)}</p>` : ''}${f.obs ? `<p class="note">${esc(f.obs)}</p>` : ''}
      <div class="macro4">${MACROS.map(m => `<div class="m-${m.k}"><span class="k">${m.n}</span><span class="v">${fmt(t[m.k])} <small>${m.u}</small></span></div>`).join('')}</div>
      <h3>Vitaminas e minerais <small class="muted">% da referência diária</small></h3>
      ${microsBloco(t, 1, MICROS.filter(m => valor(f, m.k)).length)}
      ${MICROS.some(m => valor(f, m.k)) ? '' : '<p class="muted small">Sem micronutrientes listados.</p>'}
      <h3>Adicionar ao plano</h3>
      <div class="row wrap">
        <select id="addDia" aria-label="Dia">${DIAS.map((n, k) => `<option value="${k}" ${k === (S.ui.dia ?? 0) ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <select id="addRef" aria-label="Refeição"></select>
        <button class="btn" data-act="addDoDetalhe" data-a="${esc(id)}">Adicionar ${g} g</button>
      </div>`, { tipo: 'ver', id });
    preencherRefs();
  }
  function preencherRefs() {
    const sel = $('#addRef'), di = +($('#addDia')?.value || 0), d = dietaEditando(); if (!sel || !d) return;
    const refs = d.dias[di].refeicoes;
    sel.innerHTML = refs.map(r => `<option value="${r.id}">${esc(r.nome)}</option>`).join('') + `<option value="__nova">Nova refeição</option>`;
  }

  function sheetPicker(refId) {
    abrirSheet(`<div class="sheet-h"><h2>Adicionar alimento</h2><button class="x big" data-act="fechar" aria-label="Fechar">×</button></div>
      <div class="filters"><input type="search" id="buscaP" placeholder="Buscar" value="${esc(filtro.qP)}" data-act="buscaP" autofocus aria-label="Buscar">
      <select data-act="ordP" aria-label="Ordenar por">${NUTS.map(n => `<option value="${n.k}" ${filtro.ord === n.k ? 'selected' : ''}>Mais ${n.n.toLowerCase()}</option>`).join('')}</select></div>
      <div class="chips">${[['', 'Todos'], ...Object.entries(CATS)].map(([k, n]) => `<button class="chip ${filtro.cat === k ? 'on' : ''}" data-act="catP" data-c="${k}">${n}</button>`).join('')}</div>
      <div id="listaP">${listaAlimentos(true)}</div>`, { tipo: 'picker', refId });
  }
  function sheetGramas(id) {
    const f = FOOD(id), ctx = sheetCtx;
    const sugest = f.un ? [1, 2, 3, 4, 6].map(n => [n * f.un, `${n} un`]) : (f.kcal > 500 ? [10, 20, 30, 50] : [50, 100, 150, 200, 250, 300]).map(g => [g, g + ' g']);
    abrirSheet(`<div class="sheet-h"><h2>${esc(f.nome)}</h2><button class="x big" data-act="fechar" aria-label="Fechar">×</button></div>
      <div class="chips">${sugest.map(([g, n]) => `<button class="chip" data-act="gSug" data-g="${g}">${n}</button>`).join('')}</div>
      <label class="field inline"><span>Gramas</span><input type="number" id="gIn" min="1" step="5" value="${sugest[1][0]}" autofocus class="num-in" data-act="gPrev" data-a="${esc(id)}"></label>
      <p id="gPrev" class="muted">${macroLinha(somaItens([{ a: id, g: sugest[1][0] }]))}</p>
      <div class="row"><button class="btn ghost" data-act="voltarPicker">Voltar</button><button class="btn" data-act="confirmarItem" data-a="${esc(id)}">Adicionar</button></div>`, { ...ctx, tipo: 'gramas' });
  }

  function sheetJejum() {
    const d = dietaEditando();
    abrirSheet(`<div class="sheet-h"><h2>Planejar jejum</h2><button class="x big" data-act="fechar" aria-label="Fechar">×</button></div>
      <p class="muted">Coloca a refeição pré-jejum no dia escolhido, marca os dias seguintes como jejum e adiciona uma quebra leve no dia depois.</p>
      <div class="form-grid">
        <label class="field"><span>Pré-jejum no jantar de</span><select id="pjDia">${DIAS.map((n, k) => `<option value="${k}" ${k === (S.ui.dia ?? 0) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="field"><span>Dias sem comer</span><select id="pjN">${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${n === 2 ? 'selected' : ''}>${n} ${n > 1 ? 'dias' : 'dia'} (≈ ${n * 24 + 12} h)</option>`).join('')}</select></label>
        <label class="field"><span>Refeição pré-jejum</span><select id="pjModelo"><option value="auto">Escolher pela duração</option><option value="pre_jejum">${NOMES_MODELOS.pre_jejum}</option><option value="pre_jejum_forte">${NOMES_MODELOS.pre_jejum_forte}</option></select></label>
      </div>
      <p class="muted small">Os dias de jejum perdem as refeições que tinham. A semana é tratada como ciclo: um jejum que começa no domingo continua na segunda.</p>
      <div class="row"><button class="btn" data-act="aplicarJejum">Aplicar em “${esc(d.nome)}”</button></div>`);
  }

  function sheetNovoAlimento() {
    abrirSheet(`<div class="sheet-h"><h2>Cadastrar alimento</h2><button class="x big" data-act="fechar" aria-label="Fechar">×</button></div>
      <form id="formAl" class="form-grid">
        <label class="field span2"><span>Nome</span><input name="nome" required autofocus></label>
        <label class="field"><span>Categoria</span><select name="categoria">${Object.entries(CATS).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
        ${MACROS.map(m => `<label class="field"><span>${m.n} (${m.u}) por 100 g</span><input name="${m.k}" type="number" step="0.1" min="0" value="0"></label>`).join('')}
        <details class="span2"><summary>Vitaminas e minerais (opcional)</summary><div class="form-grid">
          ${MICROS.map(m => `<label class="field"><span>${m.n} (${m.u})</span><input name="${m.k}" type="number" step="0.01" min="0"></label>`).join('')}</div></details>
        <div class="row span2"><button class="btn" type="submit">Salvar alimento</button></div>
      </form>`);
  }

  function sheetVerRec(id) {
    const d = RECS.find(x => x.id === id);
    abrirSheet(`<div class="sheet-h"><h2>${esc(d.nome)}</h2><button class="x big" data-act="fechar" aria-label="Fechar">×</button></div>
      ${d.dias.map((x, k) => `<div class="rec-day"><h3>${DIAS[k]} ${x.jejum.modo === 'completo' ? '<span class="tag t-pre-jejum">jejum</span>' : x.jejum.modo === 'janela' ? `<span class="tag">janela ${x.jejum.horas} h</span>` : ''}</h3>
        ${x.jejum.modo === 'completo' ? '<p class="muted small">Sem refeições.</p>' : x.refeicoes.map(r => `<p class="small"><b>${esc(r.nome)}</b>: ${r.itens.map(it => `${esc(FOOD(it.a)?.nome)} ${it.g} g`).join(', ')}</p>`).join('')}
        <p class="muted small">${x.rotina.map(r => `${TIPOS_ROT[r.tipo]} ${r.min} min${r.nota ? ' (' + esc(r.nota) + ')' : ''}`).join(' · ')}</p>${x.jejum.modo !== 'completo' ? macroLinha(totalDia(x)) : ''}</div>`).join('')}
      <div class="row"><button class="btn" data-act="usarRec" data-id="${id}">Usar como minha</button></div>`);
  }

  function confirmar(msg, acao, rotulo = 'Confirmar') {
    abrirSheet(`<div class="sheet-h"><h2>${esc(msg)}</h2></div><div class="row"><button class="btn ghost" data-act="fechar">Cancelar</button><button class="btn danger-fill" data-act="okConfirmar">${esc(rotulo)}</button></div>`, { tipo: 'confirmar', acao });
  }
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2200); }

  // ---------- Ações ----------
  const diaAtual = () => dietaEditando().dias[S.ui.dia ?? 0];
  const acharRef = id => { for (const dt of S.dietas) for (const d of dt.dias) { const r = d.refeicoes.find(x => x.id === id); if (r) return r; } return null; };
  const acharRot = id => diaAtual().rotina.find(x => x.id === id);
  const commit = (rerender = true) => { salvar(); if (rerender) render(); };
  const logHoje = () => { const iso = hojeISO(); S.log[iso] = S.log[iso] || { ref: {}, rot: {} }; return S.log[iso]; };
  function atualizarRotinaLog() {
    const lg = logHoje(), d = dietaAtiva()?.dias[diaSemana()]; if (!d) return;
    lg.solMin = d.rotina.filter(r => r.tipo === 'sol' && lg.rot[r.id]).reduce((s, r) => s + (+r.min || 0), 0);
    lg.treinoMin = d.rotina.filter(r => r.tipo === 'treino' && lg.rot[r.id]).reduce((s, r) => s + (+r.min || 0), 0);
  }

  const CLICK = {
    irDia: el => { S.ui.dia = +el.dataset.i; S.ui.editando = null; salvar(); },
    dia: el => { S.ui.dia = +el.dataset.i; commit(); },
    comi: el => { const lg = logHoje(); const r = dietaAtiva().dias[diaSemana()].refeicoes.find(x => x.id === el.dataset.id); if (el.checked) lg.ref[r.id] = clone(r.itens); else delete lg.ref[r.id]; commit(); },
    fiz: el => { const lg = logHoje(); if (el.checked) lg.rot[el.dataset.id] = true; else delete lg.rot[el.dataset.id]; atualizarRotinaLog(); commit(); },
    iniciarJejum: () => { S.jejum.inicio = Date.now(); S.jejum.alvoH = +($('#alvoJejum')?.value || S.jejum.alvoH); commit(); },
    encerrarJejum: () => confirmar('Encerrar o jejum agora?', () => {
      const h = (Date.now() - S.jejum.inicio) / 36e5; S.jejum.historico.unshift({ inicio: S.jejum.inicio, fim: Date.now(), horas: h });
      // registra as horas no dia em que terminou
      const lg = logHoje(); lg.jejumH = Math.round((lg.jejumH || 0) + h); S.jejum.inicio = null; commit(); toast(`Jejum de ${fmt(h, 0)} h registrado`);
    }, 'Encerrar'),
    modoJejum: el => { const d = diaAtual(); d.jejum = { modo: el.dataset.m, horas: el.dataset.m === 'janela' ? 16 : el.dataset.m === 'completo' ? 24 : 0 }; commit(); },
    planejarJejum: () => sheetJejum(),
    aplicarJejum: () => {
      const dt = dietaEditando(), ini = +$('#pjDia').value, n = +$('#pjN').value; let modelo = $('#pjModelo').value;
      if (modelo === 'auto') modelo = n >= 3 ? 'pre_jejum_forte' : 'pre_jejum';
      const d0 = dt.dias[ini]; d0.refeicoes = d0.refeicoes.filter(r => !/jantar/i.test(r.nome) && r.tipo !== 'pre-jejum'); d0.refeicoes.push(ref(modelo));
      if (d0.jejum.modo === 'completo') d0.jejum = { modo: 'nenhum', horas: 0 };
      for (let k = 1; k <= n; k++) { const d = dt.dias[(ini + k) % 7]; d.refeicoes = []; d.jejum = COMPLETO(); }
      const dq = dt.dias[(ini + n + 1) % 7];
      if (n < 6) { dq.jejum = { modo: 'nenhum', horas: 0 }; dq.refeicoes = dq.refeicoes.filter(r => r.tipo !== 'quebra-jejum' && !/caf[ée]/i.test(r.nome)); dq.refeicoes.unshift(ref('quebra')); }
      fecharSheet(); commit(); toast(`Jejum de ${n} ${n > 1 ? 'dias' : 'dia'} planejado`);
    },
    novaRef: () => { diaAtual().refeicoes.push({ id: uid(), nome: 'Refeição', hora: '', tipo: 'normal', itens: [] }); commit(); },
    modeloRef: () => abrirSheet(`<div class="sheet-h"><h2>Modelos de refeição</h2><button class="x big" data-act="fechar" aria-label="Fechar">×</button></div>
      <ul class="foods">${Object.keys(MODELOS).map(k => { const r = ref(k); return `<li><button data-act="addModelo" data-k="${k}"><span class="fn"><b>${esc(NOMES_MODELOS[k])}</b><small>${TIPOS_REF[r.tipo]}</small></span><span class="fm muted small">${macroLinha(somaItens(r.itens))}</span></button></li>`; }).join('')}</ul>`),
    addModelo: el => { diaAtual().refeicoes.push(ref(el.dataset.k)); diaAtual().refeicoes.sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99')); fecharSheet(); commit(); },
    delRef: el => { const d = diaAtual(); d.refeicoes = d.refeicoes.filter(r => r.id !== el.dataset.id); commit(); },
    addItem: el => { filtro.qP = ''; sheetPicker(el.dataset.id); },
    delItem: el => { acharRef(el.dataset.id).itens.splice(+el.dataset.k, 1); commit(); },
    addRot: el => { const t = el.dataset.t; diaAtual().rotina.push(t === 'sol' ? sol(15) : t === 'treino' ? treino(30, '') : { id: uid(), tipo: 'outro', min: 10, hora: '', nota: '' }); commit(); },
    delRot: el => { const d = diaAtual(); d.rotina = d.rotina.filter(r => r.id !== el.dataset.id); commit(); },
    copiarRotina: () => confirmar('Copiar a rotina deste dia para os outros 6 dias?', () => { const src = diaAtual().rotina; dietaEditando().dias.forEach(d => { if (d !== diaAtual()) d.rotina = src.map(r => ({ ...r, id: uid() })); }); fecharSheet(); commit(); toast('Rotina copiada'); }, 'Copiar'),
    verAlimento: el => sheetAlimento(el.dataset.a),
    addDoDetalhe: el => {
      const di = +$('#addDia').value, rid = $('#addRef').value, g = +$('#qtdG').value || 100, d = dietaEditando().dias[di];
      let r = d.refeicoes.find(x => x.id === rid);
      if (!r) { r = { id: uid(), nome: 'Refeição', hora: '', tipo: 'normal', itens: [] }; d.refeicoes.push(r); }
      if (d.jejum.modo === 'completo') d.jejum = { modo: 'nenhum', horas: 0 };
      r.itens.push({ a: el.dataset.a, g }); fecharSheet(); commit(); toast(`Adicionado em ${DIAS[di]}, ${r.nome}`);
    },
    cat: el => { filtro.cat = el.dataset.c; render(); },
    base: el => { filtro.base = el.dataset.b; render(); },
    catP: el => { filtro.cat = el.dataset.c; document.querySelectorAll('[data-act=catP]').forEach(b => b.classList.toggle('on', b === el)); $('#listaP').innerHTML = listaAlimentos(true); },
    escolher: el => sheetGramas(el.dataset.a),
    voltarPicker: () => sheetPicker(sheetCtx.refId),
    gSug: el => { $('#gIn').value = el.dataset.g; $('#gIn').dispatchEvent(new Event('input', { bubbles: true })); },
    confirmarItem: el => { const g = +$('#gIn').value; if (!g) return; acharRef(sheetCtx.refId).itens.push({ a: el.dataset.a, g }); const rid = sheetCtx.refId; commit(); sheetPicker(rid); toast('Alimento adicionado'); },
    fechar: () => fecharSheet(),
    okConfirmar: () => { const a = sheetCtx?.acao; fecharSheet(); a && a(); },
    novoAlimento: () => sheetNovoAlimento(),
    novaDieta: () => { const d = { id: 'minha-' + uid(), nome: 'Nova dieta', desc: '', dias: Array.from({ length: 7 }, () => ({ refeicoes: [], rotina: [], jejum: { modo: 'nenhum', horas: 0 } })) }; S.dietas.push(d); S.ui.editando = d.id; S.ui.dia = 0; salvar(); location.hash = 'plano'; },
    ativar: el => { S.ativa = el.dataset.id; commit(); toast('Dieta ativa nesta semana'); },
    abrirDieta: el => { S.ui.editando = el.dataset.id; salvar(); location.hash = 'plano'; },
    duplicar: el => { const o = S.dietas.find(d => d.id === el.dataset.id); const c = clone(o); c.id = 'minha-' + uid(); c.nome = o.nome + ' (cópia)'; regerarIds(c); S.dietas.push(c); commit(); },
    apagarDieta: el => { const o = S.dietas.find(d => d.id === el.dataset.id); confirmar(`Apagar “${o.nome}”?`, () => { S.dietas = S.dietas.filter(d => d !== o); if (S.ativa === o.id) S.ativa = S.dietas[0].id; if (S.ui.editando === o.id) S.ui.editando = null; commit(); }, 'Apagar'); },
    usarRec: el => { const r = RECS.find(x => x.id === el.dataset.id); const c = clone(r); c.id = 'minha-' + uid(); c.desc = 'Baseada em ' + r.nome + '.'; regerarIds(c); S.dietas.push(c); S.ativa = c.id; S.ui.editando = c.id; fecharSheet(); salvar(); location.hash = 'plano'; render(); toast(`“${r.nome}” copiada e ativa`); },
    verRec: el => sheetVerRec(el.dataset.id),
    periodo: el => { periodo = el.dataset.p; render(); },
    exportar: () => {
      const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `minha-dieta-${hojeISO()}.json`; document.body.appendChild(a); a.click(); a.remove();
      toast('Backup exportado');
    },
    mostrarTxt: () => { $('#backupTxt').value = JSON.stringify(S); },
    copiarTxt: () => { const t = $('#backupTxt'); if (!t.value) t.value = JSON.stringify(S); navigator.clipboard?.writeText(t.value).then(() => toast('Copiado'), () => { t.select(); toast('Selecione e copie o texto'); }) ?? t.select(); },
    colarTxt: () => importarTexto($('#backupTxt').value),
    delCustom: el => { S.custom = S.custom.filter(f => f.id !== el.dataset.id); commit(); },
    resetar: () => confirmar('Apagar todos os dados deste aparelho?', () => { S = estadoInicial(); S.ativa = S.dietas[0].id; commit(); toast('Dados apagados'); }, 'Apagar tudo'),
  };
  function regerarIds(dt) { dt.dias.forEach(d => { d.refeicoes.forEach(r => r.id = uid()); d.rotina.forEach(r => r.id = uid()); }); }
  function importarTexto(txt) {
    try { const o = JSON.parse(txt); if (o.v !== 1 || !Array.isArray(o.dietas)) throw 0; S = o; S.ui = S.ui || { dia: diaSemana() }; commit(); toast('Backup importado'); }
    catch (e) { toast('Arquivo inválido. Use um backup exportado por este app.'); }
  }

  const CHANGE = {
    alvo: el => { S.jejum.alvoH = +el.value; salvar(); },
    editInicio: el => { const t = new Date(el.value).getTime(); if (t && t <= Date.now()) { S.jejum.inicio = t; commit(); } },
    editarDieta: el => { S.ui.editando = el.value; commit(); },
    horasJanela: el => { diaAtual().jejum.horas = Math.min(23, Math.max(1, +el.value || 16)); commit(); },
    refNome: el => { acharRef(el.dataset.id).nome = el.value || 'Refeição'; commit(false); },
    refHora: el => { acharRef(el.dataset.id).hora = el.value; diaAtual().refeicoes.sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99')); commit(); },
    refTipo: el => { acharRef(el.dataset.id).tipo = el.value; commit(); },
    itemG: el => { acharRef(el.dataset.id).itens[+el.dataset.k].g = Math.max(0, +el.value || 0); commit(); },
    rotMin: el => { acharRot(el.dataset.id).min = Math.max(0, +el.value || 0); commit(); },
    rotHora: el => { acharRot(el.dataset.id).hora = el.value; commit(false); },
    rotNota: el => { acharRot(el.dataset.id).nota = el.value; commit(false); },
    ord: el => { filtro.ord = el.value; render(); },
    ordP: el => { filtro.ord = el.value; $('#listaP').innerHTML = listaAlimentos(true); },
    nutSel: el => { nutSel = el.value; render(); },
    nomeDieta: el => { S.dietas.find(d => d.id === el.dataset.id).nome = el.value || 'Sem nome'; commit(false); },
    meta: el => { S.metas[el.dataset.k] = +el.value || 0; commit(false); },
    importar: el => { const f = el.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => importarTexto(r.result); r.readAsText(f); },
    addDia: () => preencherRefs(),
  };
  const INPUT = {
    busca: el => { filtro.q = el.value; $('#lista').innerHTML = listaAlimentos(); },
    buscaP: el => { filtro.qP = el.value; $('#listaP').innerHTML = listaAlimentos(true); },
    qtdVer: el => { const g = +el.value; if (g > 0) { const pos = el.selectionStart; sheetAlimento(el.dataset.a, g); const n = $('#qtdG'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { } } },
    gPrev: el => { $('#gPrev').innerHTML = macroLinha(somaItens([{ a: el.dataset.a, g: +el.value || 0 }])); },
  };

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (e.target.id === 'sheet') return fecharSheet();
    if (!el || !CLICK[el.dataset.act]) return;
    if (el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type !== 'checkbox')) return;
    CLICK[el.dataset.act](el, e);
  });
  document.addEventListener('change', e => { const el = e.target.closest('[data-act]'); if (el && CHANGE[el.dataset.act]) CHANGE[el.dataset.act](el); });
  document.addEventListener('input', e => { const el = e.target.closest('[data-act]'); if (el && INPUT[el.dataset.act]) INPUT[el.dataset.act](el); });
  document.addEventListener('change', e => { if (e.target.id === 'addDia') preencherRefs(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#sheet').hidden) fecharSheet();
    if (e.key === 'Enter' && e.target.id === 'gIn') { e.preventDefault(); $('[data-act=confirmarItem]')?.click(); }
  });
  document.addEventListener('submit', e => {
    if (e.target.id !== 'formAl') return; e.preventDefault();
    const fd = new FormData(e.target); const f = { id: 'custom-' + uid(), nome: fd.get('nome').trim(), categoria: fd.get('categoria'), fonte: 'Cadastrado por você', micro: {} };
    MACROS.forEach(m => f[m.k] = +fd.get(m.k) || 0);
    MICROS.forEach(m => { const v = fd.get(m.k); if (v !== '' && v != null) f.micro[m.k] = +v; });
    S.custom.push(f); fecharSheet(); commit(); toast(`${f.nome} cadastrado`);
  });
  window.addEventListener('hashchange', () => { fecharSheet(); render(); window.scrollTo(0, 0); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && view === 'hoje') render(); });

  render();
})();
