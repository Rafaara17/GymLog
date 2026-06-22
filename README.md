# GymLog

App iOS em SwiftUI para registro e análise estatística de treinos.
Dados salvos localmente com **SwiftData + iCloud (CloudKit)**. Exportação por
**CSV** via ShareSheet nativo, por demanda.

## Stack

| Camada | Tecnologia |
|---|---|
| Linguagem | Swift 5.9+ |
| UI | SwiftUI |
| Persistência local | SwiftData (iOS 17+) |
| Sync | CloudKit (`.automatic`) |
| Gráficos no app | Swift Charts |
| Exportação | CSV via ShareSheet |
| Análise externa | Python + pandas/matplotlib/seaborn |
| Dependências externas | Nenhuma |

## Estrutura

```
GymLog.xcodeproj/            # Projeto Xcode 16 (grupos sincronizados com o sistema de arquivos)
GymLog/
├── GymLogApp.swift          # Entry point: ModelContainer + CloudKit + seed do catálogo
├── ContentView.swift        # TabView: Treino, Histórico, Stats
├── GymLog.entitlements      # iCloud/CloudKit + push
├── Assets.xcassets/
├── Models/                  # Session, Exercise, WorkoutSet, ExerciseCatalog
├── Services/                # ExportService (CSV), ImportService
├── ViewModels/              # Workout, History, Stats
├── Views/
│   ├── Workout/             # WorkoutRoot, ExerciseRow, SetInput, ExercisePicker
│   ├── History/             # HistoryList, SessionDetail
│   └── Stats/               # StatsRoot, OneRM, LoadProgress, Volume (Swift Charts)
└── Helpers/                 # Formatters, EpleyFormula
analysis/
├── analise.py               # Os 4 gráficos do plano
└── requirements.txt
```

## Configuração no Xcode

1. Abra `GymLog.xcodeproj` no Xcode 15+ (16 recomendado).
2. Em **Signing & Capabilities**, selecione seu time de desenvolvimento.
3. As capabilities **iCloud → CloudKit** e o entitlement de push já estão
   declarados em `GymLog/GymLog.entitlements`. Ajuste o container
   `iCloud.com.gymlog.app` e o bundle id `com.gymlog.app` para os seus.
4. Adicione **Background Modes** (Background fetch + Remote notifications) no
   target, se quiser sync mais agressivo em background.
5. Rode no simulador ou dispositivo. Salvar um treino, apagar o app e
   reinstalar deve restaurar os dados via iCloud.

## CSV exportado

Uma linha por série. `rest_seconds` fica vazio na 1ª série de cada exercício.

```
date,training_type,exercise,set,weight_kg,reps,estimated_1rm,rpe,done_at,rest_seconds
2026-06-20,Push,"Supino Reto",1,80.00,10,106.7,,2026-06-20T14:03:21Z,
2026-06-20,Push,"Supino Reto",2,80.00,8,101.3,,2026-06-20T14:07:44Z,263
```

## Análise em Python

```bash
cd analysis
pip install -r requirements.txt
python analise.py caminho/para/gymlog_2026-06-22.csv
```

Funções disponíveis: `plot_1rm`, `plot_weekly_volume`, `plot_rep_dropoff`,
`plot_rest`.

## Métricas

| Métrica | Cálculo | Onde |
|---|---|---|
| Evolução de carga | max(weight_kg) por dia | Swift Charts / Python |
| 1RM estimado | Epley: peso × (1 + reps/30) | `EpleyFormula`, CSV, Charts |
| Volume por sessão | Σ(peso × reps) | `Session.totalVolume` |
| Volume semanal | agrupado por semana + tipo | Charts / Python |
| Drop-off de reps | 1ª série vs últimas | Python |
| Descanso entre séries | diff de `doneAt` | coluna `rest_seconds` |
| Densidade | volume ÷ duração | `Session.density` |
