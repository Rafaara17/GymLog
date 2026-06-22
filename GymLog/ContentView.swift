//
//  ContentView.swift
//  GymLog
//
//  TabView raiz: Treino, Histórico, Estatísticas.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            WorkoutRootView()
                .tabItem {
                    Label("Treino", systemImage: "dumbbell.fill")
                }

            HistoryListView()
                .tabItem {
                    Label("Histórico", systemImage: "calendar")
                }

            StatsRootView()
                .tabItem {
                    Label("Stats", systemImage: "chart.line.uptrend.xyaxis")
                }
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: [
            Session.self, Exercise.self, WorkoutSet.self, ExerciseCatalog.self
        ], inMemory: true)
}
