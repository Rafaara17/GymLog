//
//  ExerciseRowView.swift
//  GymLog
//
//  Linha resumindo um exercício e suas séries dentro de uma sessão.
//

import SwiftUI

struct ExerciseRowView: View {
    let exercise: Exercise

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(exercise.name)
                .font(.headline)

            HStack(spacing: 12) {
                Label("\(exercise.sets.count) séries", systemImage: "number")
                if exercise.totalVolume > 0 {
                    Label(Formatters.weight(exercise.totalVolume), systemImage: "scalemass")
                }
                if exercise.best1RM > 0 {
                    Label("\(Int(exercise.best1RM)) 1RM", systemImage: "chart.line.uptrend.xyaxis")
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}
