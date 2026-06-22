//
//  ImportService.swift
//  GymLog
//
//  Lê um CSV gerado pelo ExportService e restaura as sessões (opcional).
//  Útil para recuperar dados ou migrar de outro dispositivo sem iCloud.
//

import Foundation
import SwiftData

struct ImportService {

    enum ImportError: Error {
        case emptyFile
        case invalidHeader
    }

    /// Lê o CSV em `url` e insere as sessões reconstruídas no `context`.
    /// Agrupa por (date, training_type, exercise) para reconstruir a hierarquia.
    @MainActor
    static func importCSV(from url: URL, into context: ModelContext) throws {
        let content = try String(contentsOf: url, encoding: .utf8)
        let rows = content.split(separator: "\n", omittingEmptySubsequences: true).map(String.init)

        guard let headerLine = rows.first else { throw ImportError.emptyFile }
        guard headerLine.hasPrefix("date,training_type,exercise") else {
            throw ImportError.invalidHeader
        }

        let iso = ISO8601DateFormatter()

        // Cache de sessões por (data ISO + tipo) para reaproveitar entre linhas.
        var sessionsByKey: [String: Session] = [:]
        var exercisesByKey: [String: Exercise] = [:]

        for line in rows.dropFirst() {
            let cols = parseCSVLine(line)
            guard cols.count >= 6 else { continue }

            let dateStr = cols[0]
            let typeStr = cols[1]
            let exerciseName = cols[2]
            let setNumber = Int(cols[3]) ?? 0
            let weight = Double(cols[4]) ?? 0
            let reps = Int(cols[5]) ?? 0
            let rpe = cols.count > 7 ? Int(cols[7]) : nil

            let sessionKey = "\(dateStr)|\(typeStr)"
            let session: Session
            if let existing = sessionsByKey[sessionKey] {
                session = existing
            } else {
                let type = TrainingType(rawValue: typeStr) ?? .push
                let newSession = Session(type: type)
                if let date = iso.date(from: dateStr) {
                    newSession.date = date
                    newSession.startedAt = date
                }
                context.insert(newSession)
                sessionsByKey[sessionKey] = newSession
                session = newSession
            }

            let exerciseKey = "\(sessionKey)|\(exerciseName)"
            let exercise: Exercise
            if let existing = exercisesByKey[exerciseKey] {
                exercise = existing
            } else {
                let newExercise = Exercise(name: exerciseName, position: session.exercises.count)
                newExercise.session = session
                session.exercises.append(newExercise)
                exercisesByKey[exerciseKey] = newExercise
                exercise = newExercise
            }

            let set = WorkoutSet(setNumber: setNumber, weightKg: weight, reps: reps, rpe: rpe)
            if cols.count > 8, let doneAt = iso.date(from: cols[8]) {
                set.doneAt = doneAt
            }
            set.exercise = exercise
            exercise.sets.append(set)
        }

        try context.save()
    }

    /// Parser CSV simples que respeita campos entre aspas.
    private static func parseCSVLine(_ line: String) -> [String] {
        var fields: [String] = []
        var current = ""
        var insideQuotes = false
        var iterator = line.makeIterator()
        var pending: Character? = iterator.next()

        while let char = pending {
            pending = iterator.next()
            if char == "\"" {
                if insideQuotes && pending == "\"" {
                    current.append("\"")           // aspas escapadas
                    pending = iterator.next()
                } else {
                    insideQuotes.toggle()
                }
            } else if char == "," && !insideQuotes {
                fields.append(current)
                current = ""
            } else {
                current.append(char)
            }
        }
        fields.append(current)
        return fields
    }
}
