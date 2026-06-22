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
