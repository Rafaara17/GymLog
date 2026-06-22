//
//  WorkoutRootView.swift
//  GymLog
//
//  Tela principal da aba de treino: inicia ou continua a sessão ativa.
//

import SwiftUI
import SwiftData

struct WorkoutRootView: View {
    @Environment(\.modelContext) private var context

    // Sessão ativa = sem endedAt. Pode haver no máximo uma em uso.
    @Query(filter: #Predicate<Session> { $0.endedAt == nil },
           sort: \Session.startedAt, order: .reverse)
    private var activeSessions: [Session]

    @State private var selectedType: TrainingType = .push

    var body: some View {
        NavigationStack {
            if let active = activeSessions.first {
                ActiveWorkoutView(session: active)
            } else {
                startView
            }
        }
    }

    private var startView: some View {
        VStack(spacing: 32) {
            Spacer()

            Image(systemName: "dumbbell.fill")
                .font(.system(size: 56))
                .foregroundStyle(.tint)

            Text("Começar treino")
                .font(.largeTitle.bold())

            VStack(spacing: 12) {
                Text("Tipo de treino")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Picker("Tipo", selection: $selectedType) {
                    ForEach(TrainingType.allCases) { type in
                        Text(type.rawValue).tag(type)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
            }

            Button {
                _ = WorkoutViewModel.startSession(type: selectedType, context: context)
            } label: {
                Label("Iniciar", systemImage: "play.fill")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
            }
            .buttonStyle(.borderedProminent)
            .padding(.horizontal)

            Spacer()
        }
        .navigationTitle("Treino")
    }
}

/// Sessão em andamento: lista de exercícios + ações.
private struct ActiveWorkoutView: View {
    @Environment(\.modelContext) private var context
    @Bindable var session: Session

    @State private var showingPicker = false
    @State private var confirmEnd = false

    var body: some View {
        List {
            Section {
                ForEach(session.orderedExercises) { exercise in
                    NavigationLink {
                        SetInputView(exercise: exercise)
                    } label: {
                        ExerciseRowView(exercise: exercise)
                    }
                }
                .onDelete(perform: deleteExercises)
            } header: {
                Text("Exercícios")
            } footer: {
                if session.exercises.isEmpty {
                    Text("Adicione o primeiro exercício para começar.")
                }
            }

            Section {
                Button {
                    showingPicker = true
                } label: {
                    Label("Adicionar exercício", systemImage: "plus.circle.fill")
                }
            }
        }
        .navigationTitle(session.type.rawValue)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Encerrar", role: .destructive) { confirmEnd = true }
            }
        }
        .safeAreaInset(edge: .bottom) {
            summaryBar
        }
        .sheet(isPresented: $showingPicker) {
            ExercisePickerView { name in
                WorkoutViewModel.addExercise(named: name, to: session, context: context)
            }
        }
        .confirmationDialog("Encerrar treino?", isPresented: $confirmEnd, titleVisibility: .visible) {
            Button("Encerrar", role: .destructive) {
                WorkoutViewModel.endSession(session, context: context)
            }
            Button("Continuar treinando", role: .cancel) {}
        }
    }

    private var summaryBar: some View {
        HStack {
            Label(Formatters.weight(session.totalVolume), systemImage: "scalemass")
            Spacer()
            Label("\(session.exercises.count) exercícios", systemImage: "list.bullet")
        }
        .font(.footnote)
        .foregroundStyle(.secondary)
        .padding()
        .background(.bar)
    }

    private func deleteExercises(at offsets: IndexSet) {
        let ordered = session.orderedExercises
        for index in offsets {
            let exercise = ordered[index]
            session.exercises.removeAll { $0.id == exercise.id }
            context.delete(exercise)
        }
        for (index, ex) in session.orderedExercises.enumerated() {
            ex.position = index
        }
        try? context.save()
    }
}
