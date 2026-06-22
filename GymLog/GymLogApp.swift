//
//  GymLogApp.swift
//  GymLog
//
//  Entry point. Configura o ModelContainer com sincronização CloudKit
//  e faz o seed inicial do catálogo de exercícios.
//

import SwiftUI
import SwiftData

@main
struct GymLogApp: App {
    let container: ModelContainer

    init() {
        let schema = Schema([
            Session.self,
            Exercise.self,
            WorkoutSet.self,
            ExerciseCatalog.self
        ])

        // .automatic usa o container iCloud padrão do app.
        let config = ModelConfiguration(
            schema: schema,
            cloudKitDatabase: .automatic
        )

        do {
            container = try ModelContainer(for: schema, configurations: config)
        } catch {
            fatalError("Falha ao criar ModelContainer: \(error)")
        }

        seedCatalogIfNeeded(container.mainContext)
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(container)
    }

    /// Popula o catálogo de exercícios na primeira execução.
    private func seedCatalogIfNeeded(_ context: ModelContext) {
        let descriptor = FetchDescriptor<ExerciseCatalog>()
        let count = (try? context.fetchCount(descriptor)) ?? 0
        guard count == 0 else { return }

        for entry in ExerciseCatalog.seed {
            context.insert(ExerciseCatalog(name: entry.name, category: entry.category))
        }
        try? context.save()
    }
}
