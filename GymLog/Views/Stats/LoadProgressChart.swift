//
//  LoadProgressChart.swift
//  GymLog
//
//  Evolução da carga máxima (peso) por sessão para um exercício.
//

import SwiftUI
import Charts

struct LoadProgressChart: View {
    let data: [StatsViewModel.DataPoint]
    let exerciseName: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Carga máxima — \(exerciseName)")
                .font(.headline)

            if data.isEmpty {
                Text("Sem dados para este exercício.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            } else {
                Chart(data) { point in
                    BarMark(
                        x: .value("Data", point.date, unit: .day),
                        y: .value("Peso (kg)", point.value)
                    )
                    .foregroundStyle(.tint)
                }
                .chartYAxisLabel("kg")
                .frame(height: 220)
            }
        }
    }
}
