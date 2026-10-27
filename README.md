# Minha Dieta

App PWA para montar e acompanhar uma dieta natural (carne vermelha, ovos, tubérculos, vegetais, frutas, gorduras animais e laticínios naturais), com jejuns longos, sol e treino na rotina. Funciona no iPhone (instalado pelo Safari) e no computador. Os dados ficam salvos no próprio aparelho.

## O que tem

- **Hoje**: refeições e rotina do dia para marcar como feitas, cronômetro de jejum com meta e fase, totais comidos.
- **Plano**: semana de segunda a domingo. Refeições com alimentos e gramas, tipo de dia (normal, janela de jejum, jejum de 24 h), sol e treino em minutos. Botão "Planejar jejum" coloca o pré-jejum, os dias sem comer (1 a 5) e a quebra leve.
- **Alimentos**: 86 alimentos por 100 g, busca, categorias e ordenação por qualquer nutriente (por 100 g ou por 100 kcal). Dá para cadastrar alimentos próprios.
- **Dietas**: dietas próprias e 5 recomendadas (base equilibrada, alta proteína, fibras, semana com jejum de 2 dias, semana com jejum de 4 dias), além de modelos de refeição.
- **Métricas**: totais da semana e médias por dia, gráfico por nutriente, tabela, micronutrientes em % da referência. Mostra a semana planejada ou os últimos 7 dias marcados.
- **Metas e dados**: metas diárias e backup (exportar/importar).

## Como rodar

É um site estático, sem build. Para testar localmente:

```sh
python3 -m http.server 8000
```

e abra http://localhost:8000.

## Instalar no iPhone

Abra o endereço publicado no Safari, toque em Compartilhar e depois em "Adicionar à Tela de Início".

## Dados dos alimentos

`dados/alimentos.json` é a base pesquisada (USDA FoodData Central e TACO). `js/data.js` é gerado a partir dela:

```sh
python3 tools/gerar_dados.py dados/alimentos.json js/data.js
```

Ao publicar uma versão nova, mude `VERSAO` em `sw.js` para os aparelhos baixarem os arquivos novos.
