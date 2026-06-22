//
//  ExportService.swift
//  GymLog
//
//  Gera CSV flat (uma linha por série) e aciona o ShareSheet nativo.
//

import SwiftUI

struct ExportService {

    static let header =
        "date,training_type,exercise,set,weight_kg,reps,estimated_1rm,rpe,done_at,rest_seconds"

    /// Gera CSV flat (uma linha por série) e retorna como String.
    static func generateCSV(sessions: [Session]) -> String {
        var lines: [String] = [header]
        let iso = ISO8601DateFormatter()

        for session in sessions.sorted(by: { $0.date < $1.date }) {
            let date = iso.string(from: session.date)
            let type = session.type.rawValue

            for exercise in session.orderedExercises {
                let sortedSets = exercise.orderedSets

                for (index, set) in sortedSets.enumerated() {
                    let restSeconds: String
                    if index > 0 {
                        let prev = sortedSets[index - 1].doneAt
                        restSeconds = String(Int(set.doneAt.timeIntervalSince(prev)))
                    } else {
                        // Primeira série do exercício: sem série anterior.
                        restSeconds = ""
                    }

                    let estimated1RM = String(format: "%.1f", set.estimated1RM)
                    let rpe = set.rpe.map(String.init) ?? ""
                    let doneAt = iso.string(from: set.doneAt)

                    lines.append([
                        date,
                        type,
                        escapeCSV(exercise.name),
                        String(set.setNumber),
                        String(format: "%.2f", set.weightKg),
                        String(set.reps),
                        estimated1RM,
                        rpe,
                        doneAt,
                        restSeconds
                    ].joined(separator: ","))
                }
            }
        }

        return lines.joined(separator: "\n")
    }

    /// Salva CSV em arquivo temporário e retorna a URL para o ShareSheet.
    static func exportToFile(sessions: [Session]) -> URL? {
        let csv = generateCSV(sessions: sessions)

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let filename = "gymlog_\(formatter.string(from: Date())).csv"

        let tempURL = FileManager.default
            .temporaryDirectory
            .appendingPathComponent(filename)

        do {
            try csv.write(to: tempURL, atomically: true, encoding: .utf8)
            return tempURL
        } catch {
            print("Erro ao salvar CSV: \(error)")
            return nil
        }
    }

    /// Envolve em aspas e escapa aspas internas, para nomes com vírgula.
    private static func escapeCSV(_ value: String) -> String {
        let escaped = value.replacingOccurrences(of: "\"", with: "\"\"")
        return "\"\(escaped)\""
    }
}

// MARK: - ShareSheet

/// Wrapper para o painel de compartilhamento nativo do iOS.
struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
