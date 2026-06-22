//
//  VolumeChart.swift
//  GymLog
//
//  Volume semanal empilhado por tipo de treino.
//

import SwiftUI
import Charts

struct VolumeChart: View {
    let data: [StatsViewModel.WeeklyVolume]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Volume semanal por tipo")
                .font(.headline)

            if data.isEmpty {
                Text("Sem dados.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            } else {
                Chart(data) { item in
                    BarMark(
                        x: .value("Semana", item.weekStart, unit: .weekOfYear),
                        y: .value("Volume (kg)", item.volume)
                    )
                    .foregroundStyle(by: .value("Tipo", item.type.rawValue))
                }
                .chartYAxisLabel("kg total")
                .chartLegend(position: .bottom)
                .frame(height: 240)
            }
        }
    }
}
