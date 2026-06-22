//
//  SetInputView.swift
//  GymLog
//
//  Entrada contínua de séries para um exercício durante o treino.
//

import SwiftUI
import SwiftData

struct SetInputView: View {
    @Bindable var exercise: Exercise
    @Environment(\.modelContext) private var context

    @State private var currentWeight: Double = 20.0
    @State private var currentReps: Int = 0
    @State private var currentRPE: Int = 0   // 0 = não informado
    @FocusState private var repsFieldFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            historyList
            Divider()
            inputArea
        }
        .navigationTitle(exercise.name)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            currentWeight = exercise.orderedSets.last?.weightKg ?? 20.0
            repsFieldFocused = true
        }
    }

    // MARK: - Histórico das séries já feitas

    private var historyList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(exercise.orderedSets) { set in
                    HStack {
                        Text("Série \(set.setNumber)")
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text(Formatters.weight(set.weightKg))
                            .fontWeight(.medium)
                        Text("× \(set.reps)")
                            .foregroundStyle(.secondary)
                        Text("≈ \(set.estimated1RM, specifier: "%.0f") 1RM")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 10)
                    .contextMenu {
                        Button("Apagar série", role: .destructive) {
                            WorkoutViewModel.deleteSet(set, from: exercise, context: context)
                        }
                    }
                    Divider()
                }

                if exercise.sets.isEmpty {
                    Text("Nenhuma série ainda. Confirme a primeira abaixo.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .padding(.top, 24)
                }
            }
        }
    }

    // MARK: - Entrada da próxima série

    private var inputArea: some View {
        VStack(spacing: 20) {
            Text("Série \(exercise.sets.count + 1)")
                .font(.headline)
                .foregroundStyle(.secondary)

            HStack(spacing: 32) {
                weightStepper
                repsField
            }

            rpePicker

            Button(action: confirmSet) {
                Label("Confirmar série", systemImage: "checkmark.circle.fill")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
            }
            .buttonStyle(.borderedProminent)
            .tint(.green)
            .disabled(currentReps == 0)
        }
        .padding()
    }

    private var weightStepper: some View {
        VStack(spacing: 8) {
            Text("Peso (kg)")
                .font(.caption)
                .foregroundStyle(.secondary)
            HStack {
                Button("-2.5") { currentWeight = max(0, currentWeight - 2.5) }
                    .buttonStyle(.bordered)
                Text("\(currentWeight, specifier: "%.1f")")
                    .font(.title2).fontWeight(.semibold)
                    .frame(minWidth: 70)
                    .multilineTextAlignment(.center)
                Button("+2.5") { currentWeight += 2.5 }
                    .buttonStyle(.bordered)
            }
        }
    }

    private var repsField: some View {
        VStack(spacing: 8) {
            Text("Reps")
                .font(.caption)
                .foregroundStyle(.secondary)
            TextField("0", value: $currentReps, format: .number)
                .font(.title2).fontWeight(.semibold)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)
                .focused($repsFieldFocused)
                .frame(width: 80)
                .padding(8)
                .background(.quaternary, in: RoundedRectangle(cornerRadius: 8))
        }
    }

    private var rpePicker: some View {
        VStack(spacing: 8) {
            Text("RPE (opcional)")
                .font(.caption)
                .foregroundStyle(.secondary)
            Picker("RPE", selection: $currentRPE) {
                Text("—").tag(0)
                ForEach(6...10, id: \.self) { value in
                    Text("\(value)").tag(value)
                }
            }
            .pickerStyle(.segmented)
        }
    }

    private func confirmSet() {
        WorkoutViewModel.confirmSet(
            weightKg: currentWeight,
            reps: currentReps,
            rpe: currentRPE == 0 ? nil : currentRPE,
            in: exercise,
            context: context
        )
        currentReps = 0
        repsFieldFocused = true
    }
}
