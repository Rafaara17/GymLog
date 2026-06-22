//
//  WorkoutViewModel.swift
//  GymLog
//
//  Estado e operações do treino ativo.
//

import Foundation
import SwiftData

@Observable
final class WorkoutViewModel {

    // MARK: - Último treino (referência de carga)

    /// Quantas séries foram feitas com um dado peso, e com quantas reps cada.
    struct WeightGroup: Identifiable {
        let weightKg: Double
        let reps: [Int]
        var setCount: Int { reps.count }
        var id: Double { weightKg }
    }

    /// Resumo do último treino em que o exercício apareceu.
    struct LastWorkout {
        let date: Date
        let groups: [WeightGroup]   // na ordem em que os pesos foram usados
        var totalSets: Int { groups.reduce(0) { $0 + $1.setCount } }
        /// Peso sugerido para começar: o mais usado da última vez.
        var suggestedWeight: Double? {
            groups.max { $0.setCount < $1.setCount }?.weightKg
        }
    }

    /// Procura a sessão encerrada mais recente que contém este exercício e
    /// resume as séries por peso. Retorna nil se for a primeira vez.
    @MainActor
    static func lastWorkout(for exerciseName: String, context: ModelContext) -> LastWorkout? {
        // Sessões encerradas, mais recentes primeiro. A sessão ativa atual
        // tem endedAt == nil, então já fica de fora.
        let descriptor = FetchDescriptor<Session>(
            predicate: #Predicate { $0.endedAt != nil },
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        let sessions = (try? context.fetch(descriptor)) ?? []

        for session in sessions {
            let sets = session.exercises
                .filter { $0.name == exerciseName }
                .flatMap { $0.orderedSets }
                .sorted { $0.setNumber < $1.setNumber }
            guard !sets.isEmpty else { continue }

            // Agrupa por peso preservando a ordem em que apareceram.
            var order: [Double] = []
            var repsByWeight: [Double: [Int]] = [:]
            for set in sets {
                if repsByWeight[set.weightKg] == nil { order.append(set.weightKg) }
                repsByWeight[set.weightKg, default: []].append(set.reps)
            }

            let groups = order.map { WeightGroup(weightKg: $0, reps: repsByWeight[$0] ?? []) }
            return LastWorkout(date: session.date, groups: groups)
        }
        return nil
    }

    /// Inicia uma nova sessão de treino e a persiste imediatamente.
    @MainActor
    static func startSession(type: TrainingType, context: ModelContext) -> Session {
        let session = Session(type: type)
        context.insert(session)
        try? context.save()
        return session
    }

    /// Adiciona um exercício à sessão na próxima posição disponível.
    @MainActor
    @discardableResult
    static func addExercise(named name: String, to session: Session, context: ModelContext) -> Exercise {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let exercise = Exercise(name: trimmed, position: session.exercises.count)
        exercise.session = session
        session.exercises.append(exercise)
        registerInCatalog(name: trimmed, context: context)
        try? context.save()
        return exercise
    }

    /// Confirma uma série no exercício e persiste localmente (CloudKit sincroniza em background).
    @MainActor
    static func confirmSet(weightKg: Double, reps: Int, rpe: Int? = nil,
                           in exercise: Exercise, context: ModelContext) {
        let set = WorkoutSet(
            setNumber: exercise.sets.count + 1,
            weightKg: weightKg,
            reps: reps,
            rpe: rpe
        )
        set.exercise = exercise
        exercise.sets.append(set)
        try? context.save()
    }

    /// Remove uma série e renumera as restantes.
    @MainActor
    static func deleteSet(_ set: WorkoutSet, from exercise: Exercise, context: ModelContext) {
        exercise.sets.removeAll { $0.id == set.id }
        context.delete(set)
        for (index, s) in exercise.orderedSets.enumerated() {
            s.setNumber = index + 1
        }
        try? context.save()
    }

    /// Encerra o treino registrando `endedAt`.
    @MainActor
    static func endSession(_ session: Session, context: ModelContext) {
        session.endedAt = Date()
        try? context.save()
    }

    /// Garante que o nome esteja no catálogo para autocomplete futuro.
    @MainActor
    private static func registerInCatalog(name: String, context: ModelContext) {
        guard !name.isEmpty else { return }
        let descriptor = FetchDescriptor<ExerciseCatalog>(
            predicate: #Predicate { $0.name == name }
        )
        let existing = (try? context.fetch(descriptor)) ?? []
        if existing.isEmpty {
            context.insert(ExerciseCatalog(name: name))
        }
    }
}
