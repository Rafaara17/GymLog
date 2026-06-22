//
//  Exercise.swift
//  GymLog
//
//  @Model — exercício dentro de uma sessão de treino.
//

import Foundation
import SwiftData

@Model
final class Exercise {
    var id: UUID = UUID()
    var name: String = ""
    var position: Int = 0

    // Relação inversa para a sessão dona deste exercício.
    var session: Session?

    @Relationship(deleteRule: .cascade, inverse: \WorkoutSet.exercise)
    var sets: [WorkoutSet] = []

    /// Séries ordenadas por número.
    var orderedSets: [WorkoutSet] {
        sets.sorted { $0.setNumber < $1.setNumber }
    }

    /// Volume total = Σ(peso × reps).
    var totalVolume: Double {
        sets.reduce(0) { $0 + $1.volume }
    }

    /// Melhor 1RM estimado entre as séries do exercício.
    var best1RM: Double {
        sets.map(\.estimated1RM).max() ?? 0
    }

    init(name: String, position: Int) {
        self.id = UUID()
        self.name = name
        self.position = position
    }
}
