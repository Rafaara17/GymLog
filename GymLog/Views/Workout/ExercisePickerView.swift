//
//  ExercisePickerView.swift
//  GymLog
//
//  Seletor de exercício com autocomplete a partir do catálogo local.
//

import SwiftUI
import SwiftData

struct ExercisePickerView: View {
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \ExerciseCatalog.name) private var catalog: [ExerciseCatalog]

    @State private var searchText = ""

    /// Callback chamado com o nome escolhido (existente ou novo).
    let onSelect: (String) -> Void

    private var filtered: [ExerciseCatalog] {
        guard !searchText.isEmpty else { return catalog }
        return catalog.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    private var canCreateNew: Bool {
        let trimmed = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return false }
        return !catalog.contains { $0.name.localizedCaseInsensitiveCompare(trimmed) == .orderedSame }
    }

    var body: some View {
        NavigationStack {
            List {
                if canCreateNew {
                    Section {
                        Button {
                            select(searchText)
                        } label: {
                            Label("Criar “\(searchText)”", systemImage: "plus.circle")
                        }
                    }
                }

                Section {
                    ForEach(filtered) { item in
                        Button {
                            select(item.name)
                        } label: {
                            HStack {
                                Text(item.name)
                                    .foregroundStyle(.primary)
                                Spacer()
                                if let category = item.category {
                                    Text(category)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Buscar ou criar exercício")
            .navigationTitle("Exercício")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancelar") { dismiss() }
                }
            }
        }
    }

    private func select(_ name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        onSelect(trimmed)
        dismiss()
    }
}
