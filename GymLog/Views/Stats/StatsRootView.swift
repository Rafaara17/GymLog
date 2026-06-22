//
//  StatsRootView.swift
//  GymLog
//
//  Aba de estatísticas: volume semanal + métricas por exercício.
//

import SwiftUI
import SwiftData

struct StatsRootView: View {
    @Query(filter: #Predicate<Session> { $0.endedAt != nil },
           sort: \Session.date)
    private var sessions: [Session]

    @State private var selectedExercise: String?

    private var exerciseNames: [String] {
        StatsViewModel.exerciseNames(in: sessions)
    }

    var body: some View {
        NavigationStack {
            Group {
                if sessions.isEmpty {
                    ContentUnavailableView(
                        "Sem dados ainda",
                        systemImage: "chart.xyaxis.line",
                        description: Text("Conclua alguns treinos para ver suas estatísticas.")
                    )
                } else {
                    content
                }
            }
            .navigationTitle("Estatísticas")
            .onAppear {
                if selectedExercise == nil { selectedExercise = exerciseNames.first }
            }
        }
    }

    private var content: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                VolumeChart(data: StatsViewModel.weeklyVolume(in: sessions))

                if !exerciseNames.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Picker("Exercício", selection: $selectedExercise) {
                            ForEach(exerciseNames, id: \.self) { name in
                                Text(name).tag(String?.some(name))
                            }
                        }
                        .pickerStyle(.menu)

                        if let exercise = selectedExercise {
                            OneRMChart(
                                data: StatsViewModel.oneRMProgress(for: exercise, in: sessions),
                                exerciseName: exercise
                            )
                            LoadProgressChart(
                                data: StatsViewModel.loadProgress(for: exercise, in: sessions),
                                exerciseName: exercise
                            )
                        }
                    }
                }
            }
            .padding()
        }
    }
}
