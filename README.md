# Minha Dieta

App PWA para montar e acompanhar uma dieta natural (carne vermelha, ovos, tubérculos, vegetais, frutas, gorduras animais e laticínios naturais), com jejuns longos, sol e treino na rotina. Funciona no iPhone (instalado pelo Safari) e no computador. Os dados ficam salvos no próprio aparelho.

## O que tem

O app é dividido em áreas: **Corpo** (Dieta e Treino), **Mente** (Intelectual) e **Business** (Financeiro e Trabalho). Por enquanto só a Dieta tem conteúdo.


- **Hoje**: o jejum em destaque (começo, fim previsto, quanto falta), os números do dia e as refeições e a rotina para marcar.
- **Calendário**: toque em qualquer dia, passado ou futuro, para ver e adicionar refeições, sol, treino e jejum. Os jejuns aparecem como uma faixa vermelha entre os dias.
- **Alimentos**: 94 alimentos por 100 g com ícone (incluindo água, café, mel e sais para o jejum), busca, categorias, favoritos (estrela na lista), combinações próprias (ex.: café + óleo de coco + leite) e ordenação por qualquer nutriente (por 100 g ou por 100 kcal).
- **Dietas**: dieta automática montada com os seus favoritos e as suas metas, 5 semanas recomendadas e as suas, para aplicar no calendário, e refeições prontas (incluindo pré-jejum).
- **Resumo**: a semana com totais, gráfico por dia e vitaminas e minerais.
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

Ícones: [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) da Microsoft, licença MIT.


`dados/alimentos.json` é a base pesquisada (USDA FoodData Central e TACO). `js/data.js` é gerado a partir dela:

```sh
python3 tools/gerar_dados.py dados/alimentos.json js/data.js
```

Ao publicar uma versão nova, mude `VERSAO` em `sw.js` para os aparelhos baixarem os arquivos novos.
