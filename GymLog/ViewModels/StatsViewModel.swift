//
//  StatsViewModel.swift
//  GymLog
//
//  Cálculos de métricas para as telas de estatísticas (Swift Charts).
//

import Foundation

struct StatsViewModel {

    struct DataPoint: Identifiable {
        let id = UUID()
        let date: Date
        let value: Double
    }

    struct WeeklyVolume: Identifiable {
        let id = UUID()
        let weekStart: Date
        let type: TrainingType
        let volume: Double
    }

    /// Lista de nomes de exercícios distintos presentes nas sessões.
    static func exerciseNames(in sessions: [Session]) -> [String] {
        let names = sessions.flatMap { $0.exercises.map(\.name) }
        return Array(Set(names)).sorted()
    }

    /// Melhor 1RM estimado por dia para um exercício.
    static func oneRMProgress(for exerciseName: String, in sessions: [Session]) -> [DataPoint] {
        var byDay: [Date: Double] = [:]
        let calendar = Calendar.current

        for session in sessions {
            let day = calendar.startOfDay(for: session.date)
            for exercise in session.exercises where exercise.name == exerciseName {
                let best = exercise.best1RM
                byDay[day] = max(byDay[day] ?? 0, best)
            }
        }

        return byDay
            .map { DataPoint(date: $0.key, value: $0.value) }
            .sorted { $0.date < $1.date }
    }

    /// Maior carga (peso) por dia para um exercício.
    static func loadProgress(for exerciseName: String, in sessions: [Session]) -> [DataPoint] {
        var byDay: [Date: Double] = [:]
        let calendar = Calendar.current

        for session in sessions {
            let day = calendar.startOfDay(for: session.date)
            for exercise in session.exercises where exercise.name == exerciseName {
                let maxWeight = exercise.sets.map(\.weightKg).max() ?? 0
                byDay[day] = max(byDay[day] ?? 0, maxWeight)
            }
        }

        return byDay
            .map { DataPoint(date: $0.key, value: $0.value) }
            .sorted { $0.date < $1.date }
    }

    /// Volume semanal agrupado por tipo de treino.
    static func weeklyVolume(in sessions: [Session]) -> [WeeklyVolume] {
        let calendar = Calendar.current
        var bucket: [String: WeeklyVolume] = [:]

        for session in sessions {
            guard let week = calendar.dateInterval(of: .weekOfYear, for: session.date)?.start
            else { continue }
            let key = "\(week.timeIntervalSince1970)|\(session.type.rawValue)"
            let previous = bucket[key]?.volume ?? 0
            bucket[key] = WeeklyVolume(
                weekStart: week,
                type: session.type,
                volume: previous + session.totalVolume
            )
        }

        return bucket.values.sorted { $0.weekStart < $1.weekStart }
    }
}
