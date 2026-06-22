//
//  OneRMChart.swift
//  GymLog
//
//  Evolução do 1RM estimado (Epley) ao longo do tempo.
//

import SwiftUI
import Charts

struct OneRMChart: View {
    let data: [StatsViewModel.DataPoint]
    let exerciseName: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("1RM estimado — \(exerciseName)")
                .font(.headline)

            if data.isEmpty {
                Text("Sem dados para este exercício.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            } else {
                Chart(data) { point in
                    LineMark(
                        x: .value("Data", point.date),
                        y: .value("1RM (kg)", point.value)
                    )
                    .interpolationMethod(.monotone)
                    PointMark(
                        x: .value("Data", point.date),
                        y: .value("1RM (kg)", point.value)
                    )
                }
                .chartYAxisLabel("kg")
                .frame(height: 220)
            }
        }
    }
}
