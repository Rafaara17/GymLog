//
//  ExerciseCatalog.swift
//  GymLog
//
//  @Model — catálogo de nomes de exercícios para autocomplete.
//

import Foundation
import SwiftData

@Model
final class ExerciseCatalog {
    var id: UUID = UUID()
    var name: String = ""
    var category: String?   // "Push" | "Pull" | "Legs" | "Core"

    init(name: String, category: String? = nil) {
        self.id = UUID()
        self.name = name
        self.category = category
    }
}

extension ExerciseCatalog {
    /// Exercícios pré-cadastrados, inseridos na primeira execução do app.
    static let seed: [(name: String, category: String)] = [
        ("Supino Reto", "Push"),
        ("Supino Inclinado", "Push"),
        ("Desenvolvimento Militar", "Push"),
        ("Tríceps Corda", "Push"),
        ("Elevação Lateral", "Push"),
        ("Puxada Frontal", "Pull"),
        ("Remada Curvada", "Pull"),
        ("Remada Baixa", "Pull"),
        ("Rosca Direta", "Pull"),
        ("Face Pull", "Pull"),
        ("Agachamento", "Legs"),
        ("Leg Press", "Legs"),
        ("Cadeira Extensora", "Legs"),
        ("Mesa Flexora", "Legs"),
        ("Levantamento Terra", "Legs"),
        ("Panturrilha em Pé", "Legs"),
        ("Prancha", "Core"),
        ("Abdominal Infra", "Core"),
    ]
}
