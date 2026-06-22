//
//  EpleyFormula.swift
//  GymLog
//
//  Estimativa de 1RM (uma repetição máxima) pela fórmula de Epley.
//

import Foundation

enum EpleyFormula {

    /// 1RM estimado = peso × (1 + reps / 30).
    /// Para reps == 1 retorna o próprio peso.
    static func estimate(weightKg: Double, reps: Int) -> Double {
        guard reps > 0 else { return 0 }
        return weightKg * (1 + Double(reps) / 30)
    }
}
