# Gera js/data.js a partir da base de alimentos + laticínios e cortes gordos extras
import json, sys
src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src))
refs = d['meta']['referencias_vd']
cats = d['meta']['categorias'] + [{'id': 'laticinios', 'nome': 'Laticínios naturais'}]
U = 'USDA FoodData Central (SR Legacy), aprox.'
extras = [
 dict(id='costela', nome='Costela bovina', categoria='carnes', kcal=388, proteina_g=14.4, gordura_g=36.2, carboidrato_g=0, fibra_g=0,
      micronutrientes=dict(vit_b12_ug=2.6, zinco_mg=3.4, selenio_ug=13, ferro_mg=1.6, vit_b3_mg=2.6, potassio_mg=232),
      beneficio='Corte gordo e saboroso, muito bom para a refeição pré-jejum.', fonte=U),
 dict(id='carne-moida-gorda', nome='Carne moída 80/20', categoria='carnes', kcal=254, proteina_g=17.2, gordura_g=20.0, carboidrato_g=0, fibra_g=0,
      micronutrientes=dict(vit_b12_ug=2.1, zinco_mg=4.2, selenio_ug=15, ferro_mg=1.9, vit_b3_mg=4.2, vit_b6_mg=0.3, potassio_mg=270),
      beneficio='Moída com 20% de gordura: prática e com boa densidade de energia.', obs='Peça para moer na hora, sem aditivos.', fonte=U),
 dict(id='mussarela', nome='Mussarela', categoria='laticinios', kcal=300, proteina_g=22.2, gordura_g=22.4, carboidrato_g=2.2, fibra_g=0,
      micronutrientes=dict(calcio_mg=505, vit_a_ug=179, vit_b12_ug=2.3, vit_b2_mg=0.28, zinco_mg=2.9, selenio_ug=17, magnesio_mg=20, potassio_mg=76),
      beneficio='Boa fonte de cálcio, B12 e proteína.', fonte=U),
 dict(id='parmesao', nome='Parmesão', categoria='laticinios', kcal=392, proteina_g=35.8, gordura_g=25.8, carboidrato_g=3.2, fibra_g=0,
      micronutrientes=dict(calcio_mg=1184, vit_a_ug=207, vit_b12_ug=1.2, vit_b2_mg=0.33, zinco_mg=2.8, selenio_ug=22.5, magnesio_mg=44, potassio_mg=92),
      beneficio='Queijo curado muito rico em cálcio e proteína.', fonte=U),
 dict(id='cheddar', nome='Queijo cheddar', categoria='laticinios', kcal=403, proteina_g=24.9, gordura_g=33.1, carboidrato_g=1.3, fibra_g=0,
      micronutrientes=dict(calcio_mg=721, vit_a_ug=265, vit_b12_ug=0.8, vit_b2_mg=0.38, zinco_mg=3.1, selenio_ug=14, vit_k_ug=2.8),
      beneficio='Gordura e cálcio em pouco volume.', obs='Prefira o curado de verdade, sem corante.', fonte=U),
 dict(id='queijo-minas', nome='Queijo minas frescal', categoria='laticinios', kcal=264, proteina_g=17.4, gordura_g=20.2, carboidrato_g=3.2, fibra_g=0,
      micronutrientes=dict(calcio_mg=579), beneficio='Queijo fresco, leve e rico em cálcio.', fonte='TACO 4ª ed.'),
 dict(id='ricota', nome='Ricota', categoria='laticinios', kcal=174, proteina_g=11.3, gordura_g=13.0, carboidrato_g=3.0, fibra_g=0,
      micronutrientes=dict(calcio_mg=207, vit_a_ug=120, vit_b12_ug=0.34, vit_b2_mg=0.2, selenio_ug=14.5, zinco_mg=1.2),
      beneficio='Feita do soro do leite, suave e versátil.', fonte=U),
 dict(id='nata', nome='Nata (creme de leite fresco)', categoria='laticinios', kcal=340, proteina_g=2.8, gordura_g=36.1, carboidrato_g=2.8, fibra_g=0,
      micronutrientes=dict(vit_a_ug=411, calcio_mg=66, vit_e_mg=1.1, vit_k_ug=3.2, colina_mg=17),
      beneficio='Gordura láctea concentrada, rica em vitamina A.', obs='Só creme de leite fresco, sem espessantes.', fonte=U),
 dict(id='iogurte', nome='Iogurte natural integral', categoria='laticinios', kcal=61, proteina_g=3.5, gordura_g=3.3, carboidrato_g=4.7, fibra_g=0,
      micronutrientes=dict(calcio_mg=121, vit_b12_ug=0.37, vit_b2_mg=0.14, potassio_mg=155, zinco_mg=0.6),
      beneficio='Fermentado: cálcio e bactérias benéficas.', obs='Só leite e fermento na lista de ingredientes.', fonte=U),
 dict(id='leite', nome='Leite integral', categoria='laticinios', kcal=61, proteina_g=3.2, gordura_g=3.3, carboidrato_g=4.8, fibra_g=0,
      micronutrientes=dict(calcio_mg=113, vit_b12_ug=0.45, vit_b2_mg=0.17, potassio_mg=132, vit_a_ug=46),
      beneficio='Cálcio, B2 e B12.', fonte=U),
 dict(id='ghee', nome='Ghee (manteiga clarificada)', categoria='laticinios', kcal=876, proteina_g=0.3, gordura_g=99.5, carboidrato_g=0, fibra_g=0,
      micronutrientes=dict(vit_a_ug=840, vit_e_mg=2.8, vit_k_ug=8.6),
      beneficio='Gordura pura do leite, aguenta bem o calor.', fonte=U),
]
unid = {'ovo': 50, 'gema': 17, 'clara': 33, 'ovo-codorna': 10, 'ovo-pata': 70, 'castanha-para': 5, 'nozes': 5,
        'banana': 100, 'laranja': 130, 'maca': 150, 'kiwi': 75, 'limao': 60, 'alho': 5, 'tomate': 120, 'cebola': 110}
foods = []
for a in d['alimentos'] + extras:
    f = {k: a.get(k) for k in ('id','nome','categoria','kcal','proteina_g','gordura_g','carboidrato_g','fibra_g','beneficio','obs','fonte')}
    f['micro'] = {k: v for k, v in (a.get('micronutrientes') or {}).items() if v is not None}
    if a['id'] in unid: f['un'] = unid[a['id']]
    foods.append({k: v for k, v in f.items() if v not in (None, '')})
js = ('// Gerado a partir de dieta/alimentos.json. Valores por 100 g.\n'
      'window.DB = ' + json.dumps({'refs': refs, 'categorias': cats, 'alimentos': foods, 'aviso': d['meta']['aviso']}, ensure_ascii=False, separators=(',', ':')) + ';\n')
open(out, 'w').write(js)
print(len(foods), 'alimentos')
