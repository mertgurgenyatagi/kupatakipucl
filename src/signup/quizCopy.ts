// Exact wording from Mert's brief — numbers included in the box, we only
// ever store the number itself (SurveyResponse.footballKnowledge).
export const FOOTBALL_KNOWLEDGE_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "Hiç alakam yok." },
  { value: 2, label: "Öyle arada bakıyorum, çok takip etmiyorum ya." },
  { value: 3, label: "Deli gibi izlediğimi söyleyemem ama futbolculara, takımlara hakimim." },
  { value: 4, label: "Futbolla baya ilgileniyorum ve izlemeye değer maçları seyrediyorum." },
  { value: 5, label: "Milan derbisi olunca açıp doksan dakika izliyorum." },
  { value: 6, label: "YouTube'da analizler, futbol podcastleri, Rennes wonderkidleri." },
  {
    value: 7,
    label:
      "Taktik dehası. Ne zaman alan markajı yapılacağını, ne zaman orta blok savunması yapılacağını biliyorum.",
  },
];

// "Tutmuyorum" per this round's brief — supersedes SurveyForm.tsx's old
// "Yok" wording for the same option (that component is being retired).
export const SUPER_LIG_TEAMS = ["Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor", "Anadolu takımı", "Tutmuyorum"];
