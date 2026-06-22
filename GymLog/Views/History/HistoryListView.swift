//
//  HistoryListView.swift
//  GymLog
//
//  Lista de treinos passados, agrupados por mês, com exportação de CSV.
//

import SwiftUI
import SwiftData

struct HistoryListView: View {
    @Environment(\.modelContext) private var context

    @Query(filter: #Predicate<Session> { $0.endedAt != nil },
           sort: \Session.date, order: .reverse)
    private var sessions: [Session]

    @State private var exportURL: URL?
    @State private var showingShareSheet = false

    var body: some View {
        NavigationStack {
            Group {
                if sessions.isEmpty {
                    ContentUnavailableView(
                        "Nenhum treino registrado",
                        systemImage: "calendar.badge.clock",
                        description: Text("Os treinos encerrados aparecem aqui.")
                    )
                } else {
                    listContent
                }
            }
            .navigationTitle("Histórico")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        exportURL = ExportService.exportToFile(sessions: sessions)
                        showingShareSheet = exportURL != nil
                    } label: {
                        Label("Exportar CSV", systemImage: "square.and.arrow.up")
                    }
                    .disabled(sessions.isEmpty)
                }
            }
            .sheet(isPresented: $showingShareSheet) {
                if let url = exportURL {
                    ShareSheet(items: [url])
                }
            }
        }
    }

    private var listContent: some View {
        List {
            ForEach(HistoryViewModel.groupByMonth(sessions), id: \.title) { group in
                Section(group.title) {
                    ForEach(group.sessions) { session in
                        NavigationLink {
                            SessionDetailView(session: session)
                        } label: {
                            sessionRow(session)
                        }
                    }
                    .onDelete { offsets in
                        for index in offsets {
                            HistoryViewModel.delete(group.sessions[index], context: context)
                        }
                    }
                }
            }
        }
    }

    private func sessionRow(_ session: Session) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Label(session.type.rawValue, systemImage: session.type.symbol)
                    .font(.headline)
                Spacer()
                Text(Formatters.shortDate.string(from: session.date))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            HStack(spacing: 12) {
                Text("\(session.exercises.count) exercícios")
                Text(Formatters.weight(session.totalVolume))
                if let duration = session.duration {
                    Text(Formatters.duration(duration))
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}
