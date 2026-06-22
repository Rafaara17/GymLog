//
//  HistoryViewModel.swift
//  GymLog
//
//  Operações auxiliares sobre o histórico de sessões.
//

import Foundation
import SwiftData

@Observable
final class HistoryViewModel {

    /// Agrupa sessões por mês ("junho 2026") para exibição seccionada.
    static func groupByMonth(_ sessions: [Session]) -> [(title: String, sessions: [Session])] {
        let formatter = DateFormatter()
        formatter.dateFormat = "LLLL yyyy"

        let grouped = Dictionary(grouping: sessions) { session -> Date in
            let comps = Calendar.current.dateComponents([.year, .month], from: session.date)
            return Calendar.current.date(from: comps) ?? session.date
        }

        return grouped
            .sorted { $0.key > $1.key }
            .map { (formatter.string(from: $0.key).capitalized,
                    $0.value.sorted { $0.date > $1.date }) }
    }

    /// Remove uma sessão (cascata apaga exercícios e séries).
    @MainActor
    static func delete(_ session: Session, context: ModelContext) {
        context.delete(session)
        try? context.save()
    }
}
