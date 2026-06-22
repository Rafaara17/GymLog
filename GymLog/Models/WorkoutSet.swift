//
//  WorkoutSet.swift
//  GymLog
//
//  @Model — cada série executada dentro de um exercício.
//

import Foundation
import SwiftData

@Model
final class WorkoutSet {
    var id: UUID = UUID()
    var setNumber: Int = 0
    var weightKg: Double = 0
    var reps: Int = 0
    var rpe: Int?               // 1–10, esforço percebido (opcional)
    var doneAt: Date = Date()

    // Relação inversa para o exercício dono desta série.
    var exercise: Exercise?

    /// 1RM estimado (Epley). Calculado localmente, não persiste.
    var estimated1RM: Double {
        EpleyFormula.estimate(weightKg: weightKg, reps: reps)
    }

    /// Volume da série = peso × reps.
    var volume: Double {
        weightKg * Double(reps)
    }

    init(setNumber: Int, weightKg: Double, reps: Int, rpe: Int? = nil) {
        self.id = UUID()
        self.setNumber = setNumber
        self.weightKg = weightKg
        self.reps = reps
        self.rpe = rpe
        self.doneAt = Date()
    }
}
