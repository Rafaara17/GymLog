//
//  SessionDetailView.swift
//  GymLog
//
//  Detalhe de uma sessão: exercícios, séries e métricas resumidas.
//

import SwiftUI
import SwiftData

struct SessionDetailView: View {
    @Bindable var session: Session

    var body: some View {
        List {
            Section("Resumo") {
                metric("Data", Formatters.dateTime.string(from: session.date))
                metric("Tipo", session.type.rawValue)
                if let duration = session.duration {
                    metric("Duração", Formatters.duration(duration))
                }
                metric("Volume total", Formatters.weight(session.totalVolume))
                if let density = session.density {
                    metric("Densidade", String(format: "%.0f kg/min", density))
                }
            }

            ForEach(session.orderedExercises) { exercise in
                Section(exercise.name) {
                    ForEach(exercise.orderedSets) { set in
                        HStack {
                            Text("Série \(set.setNumber)")
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text(Formatters.weight(set.weightKg))
                                .fontWeight(.medium)
                            Text("× \(set.reps)")
                                .foregroundStyle(.secondary)
                            if let rpe = set.rpe {
                                Text("RPE \(rpe)")
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                            }
                            Text("≈ \(set.estimated1RM, specifier: "%.0f")")
                                .font(.caption)
                                .foregroundStyle(.tertiary)
                        }
                    }
                }
            }

            if let notes = session.notes, !notes.isEmpty {
                Section("Notas") {
                    Text(notes)
                }
            }
        }
        .navigationTitle(session.type.rawValue)
        .navigationBarTitleDisplayMode(.inline)
    }

    private func metric(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.medium)
        }
    }
}
