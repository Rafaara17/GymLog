//
//  Formatters.swift
//  GymLog
//
//  Formatadores reutilizáveis para datas, peso e duração.
//

import Foundation

enum Formatters {

    /// Data curta localizada, ex.: "22 jun. 2026".
    static let shortDate: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
        return f
    }()

    /// Data + hora, ex.: "22/06/2026 14:03".
    static let dateTime: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .short
        f.timeStyle = .short
        return f
    }()

    /// Formatador ISO 8601 usado na exportação de CSV.
    static let iso8601: ISO8601DateFormatter = {
        ISO8601DateFormatter()
    }()

    /// "1.2 kg", "82.5 kg" — uma casa decimal, sem zeros à direita desnecessários.
    static func weight(_ kg: Double) -> String {
        if kg.rounded() == kg {
            return String(format: "%.0f kg", kg)
        }
        return String(format: "%.1f kg", kg)
    }

    /// Duração legível a partir de segundos, ex.: "1h 12min", "48min", "45s".
    static func duration(_ seconds: TimeInterval) -> String {
        let total = Int(seconds)
        let hours = total / 3600
        let minutes = (total % 3600) / 60
        let secs = total % 60

        if hours > 0 {
            return "\(hours)h \(minutes)min"
        } else if minutes > 0 {
            return "\(minutes)min"
        } else {
            return "\(secs)s"
        }
    }
}
