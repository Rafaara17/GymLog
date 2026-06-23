# GymLog

Registro e análise estatística de treinos. O repositório tem **duas
implementações com as mesmas funções**:

| Versão | Pasta | Roda no iPhone de graça? | Precisa de Mac? |
|---|---|---|---|
| **PWA (web)** | `docs/` | ✅ Sim, sem custo nenhum | ❌ Não |
| iOS nativo (Swift/SwiftUI) | `GymLog/` | ❌ iCloud/App Store exigem conta paga (US$ 99/ano) | ✅ Sim (Xcode) |

A **PWA** é a forma recomendada para rodar de graça no iPhone: mesmo fluxo,
mesmas telas, mesmo CSV — sem Mac, sem App Store, sem assinatura.

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
- **Sem sync iCloud automático** (isso exige a conta paga da Apple). Para
  backup ou trocar de celular, use **Exportar CSV** e **Importar CSV**
  (botões no topo da aba Histórico).
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
    ├── store.js              # dados: Models + ViewModels + Export/Import (localStorage)
    ├── charts.js             # gráficos SVG (volume, 1RM, carga)
    └── app.js                # UI: TabView, navegação e telas
```

---

## 🍎 Versão iOS nativa (Swift/SwiftUI)

App SwiftUI com dados em **SwiftData + iCloud (CloudKit)** e exportação CSV
via ShareSheet. Melhor experiência e sync entre dispositivos, mas o iCloud e
a publicação na App Store exigem o **Apple Developer Program (US$ 99/ano)** e
um **Mac com Xcode** para compilar.

| Camada | Tecnologia |
|---|---|
| Linguagem | Swift 5.9+ |
| UI | SwiftUI |
| Persistência local | SwiftData (iOS 17+) |
| Sync | CloudKit (`.automatic`) |
| Gráficos no app | Swift Charts |
| Exportação | CSV via ShareSheet |

### Configuração no Xcode
1. Abra `GymLog.xcodeproj` no Xcode 15+ (16 recomendado).
2. Em **Signing & Capabilities**, selecione seu time de desenvolvimento.
3. Ajuste o container `iCloud.com.gymlog.app` e o bundle id `com.gymlog.app`.
4. Rode no simulador ou dispositivo.

---

## Funções (idênticas nas duas versões)

- **Treino**: inicia sessão por tipo (Push/Pull/Upper/Lower), adiciona
  exercícios com autocomplete, confirma séries (peso, reps, RPE), apaga série
  (toque longo) e encerra o treino.
- **Último treino**: card de referência mostrando as séries da última vez
  agrupadas por peso, com sugestão de carga inicial.
- **Histórico**: sessões agrupadas por mês, com detalhe (volume, duração,
  densidade) e exportação CSV.
- **Stats**: volume semanal por tipo, evolução de 1RM estimado e carga máxima
  por exercício.

## CSV exportado

Uma linha por série. `rest_seconds` fica vazio na 1ª série de cada exercício.
O formato é **idêntico** nas duas versões e no `analysis/analise.py`.

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
| Drop-off de reps | 1ª série vs últimas (Python) |
| Descanso entre séries | diff de `done_at` (coluna `rest_seconds`) |
| Densidade | volume ÷ duração |
