//
//  Session.swift
//  GymLog
//
//  @Model — uma sessão de treino completa.
//

import Foundation
import SwiftData

enum TrainingType: String, CaseIterable, Codable, Identifiable {
    case push  = "Push"
    case pull  = "Pull"
    case upper = "Upper"
    case lower = "Lower"

    var id: String { rawValue }

    var symbol: String {
        switch self {
        case .push:  return "arrow.up.circle"
        case .pull:  return "arrow.down.circle"
        case .upper: return "figure.arms.open"
        case .lower: return "figure.walk"
        }
    }
}

@Model
final class Session {
    var id: UUID = UUID()
    var date: Date = Date()
    // Persistido como String para compatibilidade com CloudKit.
    var typeRaw: String = TrainingType.push.rawValue
    var notes: String?
    var startedAt: Date = Date()
    var endedAt: Date?

    @Relationship(deleteRule: .cascade, inverse: \Exercise.session)
    var exercises: [Exercise] = []

    var type: TrainingType {
        get { TrainingType(rawValue: typeRaw) ?? .push }
        set { typeRaw = newValue.rawValue }
    }

    /// Exercícios ordenados por posição.
    var orderedExercises: [Exercise] {
        exercises.sorted { $0.position < $1.position }
    }

    /// Duração da sessão, se já encerrada.
    var duration: TimeInterval? {
        guard let end = endedAt else { return nil }
        return end.timeIntervalSince(startedAt)
    }

    /// Volume total da sessão.
    var totalVolume: Double {
        exercises.reduce(0) { $0 + $1.totalVolume }
    }

    /// Densidade = volume ÷ duração (kg/min). Nil se sessão não encerrada.
    var density: Double? {
        guard let duration, duration > 0 else { return nil }
        return totalVolume / (duration / 60)
    }

    var isActive: Bool { endedAt == nil }

    init(type: TrainingType) {
        self.id = UUID()
        self.date = Date()
        self.typeRaw = type.rawValue
        self.startedAt = Date()
    }
}
