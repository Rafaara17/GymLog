"""
analise.py — Análise estatística dos treinos exportados pelo GymLog.

Uso:
    python analise.py gymlog_2026-06-22.csv

Sem argumento, procura o CSV mais recente no diretório atual.
"""

import sys
import glob
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns


def load(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, parse_dates=["done_at", "date"])
    df["week"] = pd.to_datetime(df["date"]).dt.to_period("W")
    df["volume"] = df["weight_kg"] * df["reps"]
    # 1RM já vem calculado no CSV, mas pode recalcular (Epley):
    # df["estimated_1rm"] = df["weight_kg"] * (1 + df["reps"] / 30)
    return df


# ── Análise 1: Evolução de 1RM estimado ──────────────────────────
def plot_1rm(df: pd.DataFrame, exercise_name: str):
    data = (df[df["exercise"] == exercise_name]
            .groupby("date")["estimated_1rm"]
            .max()
            .reset_index())

    plt.figure(figsize=(10, 4))
    plt.plot(data["date"], data["estimated_1rm"], marker="o")
    plt.title(f"1RM estimado — {exercise_name}")
    plt.ylabel("kg")
    plt.xlabel("Data")
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.show()


# ── Análise 2: Volume semanal por tipo de treino ─────────────────
def plot_weekly_volume(df: pd.DataFrame):
    weekly = df.groupby(["week", "training_type"])["volume"].sum().reset_index()
    pivot = weekly.pivot(index="week", columns="training_type",
                         values="volume").fillna(0)
    pivot.plot(kind="bar", stacked=True, figsize=(12, 5), colormap="Set2")
    plt.title("Volume semanal por tipo de treino")
    plt.ylabel("kg total (séries × reps × peso)")
    plt.tight_layout()
    plt.show()


# ── Análise 3: Drop-off de reps (fadiga intrassessão) ────────────
def plot_rep_dropoff(df: pd.DataFrame, exercise_name: str):
    data = df[df["exercise"] == exercise_name].copy()
    data["reps_pct"] = data.groupby("date")["reps"].transform(
        lambda x: x / x.iloc[0] * 100
    )
    sns.lineplot(data=data, x="set", y="reps_pct", estimator="mean", errorbar="sd")
    plt.axhline(100, color="gray", linestyle="--", alpha=0.5)
    plt.title(f"Queda de reps — {exercise_name}")
    plt.ylabel("% em relação à 1ª série")
    plt.xlabel("Série")
    plt.tight_layout()
    plt.show()


# ── Análise 4: Descanso real entre séries ────────────────────────
def plot_rest(df: pd.DataFrame, exercise_name: str):
    data = df[(df["exercise"] == exercise_name) & (df["rest_seconds"].notna())].copy()
    data["rest_seconds"] = pd.to_numeric(data["rest_seconds"], errors="coerce")
    data = data.dropna(subset=["rest_seconds"])
    sns.boxplot(data=data, x="set", y="rest_seconds")
    plt.title(f"Descanso entre séries — {exercise_name}")
    plt.ylabel("Segundos")
    plt.xlabel("Série")
    plt.tight_layout()
    plt.show()


def main():
    if len(sys.argv) > 1:
        path = sys.argv[1]
    else:
        candidates = sorted(glob.glob("gymlog_*.csv"))
        if not candidates:
            print("Nenhum CSV encontrado. Passe o caminho como argumento.")
            sys.exit(1)
        path = candidates[-1]
        print(f"Usando CSV mais recente: {path}")

    df = load(path)
    print(f"{len(df)} séries carregadas, "
          f"{df['exercise'].nunique()} exercícios distintos.")

    # Exemplos — descomente conforme necessário:
    plot_weekly_volume(df)
    # plot_1rm(df, "Supino Reto")
    # plot_rep_dropoff(df, "Supino Reto")
    # plot_rest(df, "Agachamento")


if __name__ == "__main__":
    main()
