# GymLog

Registro e análise estatística de treinos, na forma de uma **PWA (web)** em
`docs/` que roda **de graça no iPhone** (e em qualquer navegador): sem Mac, sem
App Store, sem assinatura. Os dados ficam no próprio aparelho e o backup é via
CSV.

---

## 📱 Rodar no iPhone de graça (PWA)

### 1. Publicar (GitHub Pages — grátis)
1. No GitHub, vá em **Settings → Pages**.
2. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
3. Selecione a **branch** e a pasta **`/docs`** → **Save**.
4. Em ~1 minuto aparece a URL, algo como
   `https://rafaara17.github.io/gymlog/`.

### 2. Instalar no iPhone
1. Abra a URL no **Safari** (precisa ser o Safari).
2. Toque em **Compartilhar** → **Adicionar à Tela de Início**.
3. Pronto: vira um ícone na tela inicial, abre em **tela cheia** e
   **funciona offline** (service worker faz cache do app).

### 3. Dados e backup
- Os dados ficam **só no seu aparelho** (armazenamento local do Safari);
  não vão para nenhum servidor.
- **Sem sync na nuvem.** Para backup ou trocar de celular, use **Exportar
  CSV** e **Importar CSV** (botões no topo da aba Histórico).
- ⚠️ Apagar "Dados de sites" no Safari apaga o histórico — exporte de vez
  em quando.

### Stack da PWA
HTML + CSS + JavaScript (ES modules). **Zero dependências, sem build**:
gráficos desenhados em SVG próprio, ícones PNG gerados localmente e service
worker para uso offline.

```
docs/
├── index.html               # shell + meta tags de PWA (iOS standalone)
├── manifest.webmanifest      # nome, ícones, display standalone
├── service-worker.js         # cache offline do app shell
├── styles.css                # visual estilo-iOS, claro/escuro, safe areas
├── icons/                    # ícones PNG (180/192/512/32)
└── js/
    ├── format.js             # Epley + formatadores (datas, peso, duração)
    ├── store.js              # dados: modelos + métricas + Export/Import (localStorage)
    ├── charts.js             # gráficos SVG (volume, 1RM, carga, atividade)
    └── app.js                # UI: TabView, navegação e telas
```

---

## Funções

- **Treino**: inicia sessão por tipo (Push/Pull/Upper/Lower), adiciona
  exercícios com autocomplete, confirma séries (peso, reps, RPE), apaga série
  (toque longo) e encerra o treino.
- **Último treino**: card de referência mostrando as séries da última vez
  agrupadas por peso, com sugestão de carga inicial.
- **Histórico**: sessões agrupadas por mês, com detalhe (volume, duração,
  densidade) e exportação CSV.
- **Stats**: mapa de atividade estilo GitHub (quadradinhos por dia), volume
  semanal por tipo, evolução de 1RM estimado e carga máxima por exercício.

## CSV exportado

Uma linha por série. `rest_seconds` fica vazio na 1ª série de cada exercício.
O formato é **idêntico** ao usado em `analysis/analise.py`.

```
date,training_type,exercise,set,weight_kg,reps,estimated_1rm,rpe,done_at,rest_seconds
2026-06-20T14:00:00Z,Push,"Supino Reto",1,80.00,10,106.7,8,2026-06-20T14:03:21Z,
2026-06-20T14:00:00Z,Push,"Supino Reto",2,80.00,8,101.3,,2026-06-20T14:07:44Z,263
```

## Análise em Python

```bash
cd analysis
pip install -r requirements.txt
python analise.py caminho/para/gymlog_2026-06-22.csv
```

Funções: `plot_1rm`, `plot_weekly_volume`, `plot_rep_dropoff`, `plot_rest`.

## Métricas

| Métrica | Cálculo |
|---|---|
| Evolução de carga | max(weight_kg) por dia |
| 1RM estimado | Epley: peso × (1 + reps/30) |
| Volume por sessão | Σ(peso × reps) |
| Volume semanal | agrupado por semana + tipo |
| Atividade (heatmap) | dias com treino; intensidade = volume do dia (4 níveis) |
| Drop-off de reps | 1ª série vs últimas (Python) |
| Descanso entre séries | diff de `done_at` (coluna `rest_seconds`) |
| Densidade | volume ÷ duração |
