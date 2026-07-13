//
// mets.js — Atividades de cardio com valores MET por intensidade.
// Fonte: Compendium of Physical Activities (valores aproximados).
// kcal = MET × 3.5 × peso(kg) / 200 × minutos.
//
export const CARDIO_ACTIVITIES = [
  { id: "corrida", name: "Corrida", hasDistance: true, mets: { leve: 8.3, moderado: 9.8, intenso: 11.5 } },
  { id: "caminhada", name: "Caminhada", hasDistance: true, mets: { leve: 2.8, moderado: 3.5, intenso: 4.5 } },
  { id: "bicicleta", name: "Bicicleta", hasDistance: true, mets: { leve: 5.8, moderado: 7.5, intenso: 10.0 } },
  { id: "natacao", name: "Natação", hasDistance: true, mets: { leve: 5.8, moderado: 8.3, intenso: 9.8 } },
  { id: "futebol", name: "Futebol", hasDistance: false, mets: { leve: 5.0, moderado: 7.0, intenso: 10.0 } },
  { id: "basquete", name: "Basquete", hasDistance: false, mets: { leve: 4.5, moderado: 6.5, intenso: 8.0 } },
  { id: "volei", name: "Vôlei", hasDistance: false, mets: { leve: 3.0, moderado: 4.0, intenso: 6.0 } },
  { id: "eliptico", name: "Elíptico", hasDistance: false, mets: { leve: 4.6, moderado: 5.0, intenso: 6.0 } },
  { id: "remo", name: "Remo", hasDistance: true, mets: { leve: 4.8, moderado: 7.0, intenso: 8.5 } },
  { id: "corda", name: "Pular corda", hasDistance: false, mets: { leve: 8.8, moderado: 11.8, intenso: 12.3 } },
  { id: "danca", name: "Dança", hasDistance: false, mets: { leve: 3.5, moderado: 5.5, intenso: 7.8 } },
  { id: "lutas", name: "Lutas", hasDistance: false, mets: { leve: 5.3, moderado: 7.8, intenso: 10.3 } },
  { id: "outro", name: "Outro", hasDistance: false, mets: { leve: 3.5, moderado: 5.0, intenso: 7.0 } },
];

export const INTENSITIES = [["leve", "Leve"], ["moderado", "Moderado"], ["intenso", "Intenso"]];
