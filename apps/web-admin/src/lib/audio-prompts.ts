export type AudioPrompt = {
  id: string;
  english: string;
  yorubaSrc: string | null;
};

export const AUDIO_PROMPTS: AudioPrompt[] = [
  {
    id: "feeling",
    english: "How are you feeling today?",
    yorubaSrc: null,
  },
  {
    id: "medication",
    english: "Have you taken your medication?",
    yorubaSrc: null,
  },
  {
    id: "dizziness",
    english: "Have you felt dizziness or unusual weakness?",
    yorubaSrc: null,
  },
  {
    id: "chest_pain",
    english: "Have you had chest pain or a severe headache?",
    yorubaSrc: null,
  },
  {
    id: "bp_systolic",
    english: "Please share the top blood pressure number.",
    yorubaSrc: "/audio/yoruba/bp_systolic.mp3",
  },
  {
    id: "bp_diastolic",
    english: "Please share the bottom blood pressure number.",
    yorubaSrc: "/audio/yoruba/bp_diastolic.mp3",
  },
  {
    id: "save_checkup",
    english: "Save this checkup.",
    yorubaSrc: "/audio/yoruba/save_checkup.mp3",
  },
];

export async function playPrompt(prompt: AudioPrompt) {
  if (typeof window === "undefined") return;
  if (prompt.yorubaSrc) {
    try {
      const audio = new Audio(prompt.yorubaSrc);
      await audio.play();
      return;
    } catch {
      // The pilot files are short placeholders. Speak the English line instead.
    }
  }
  const utterance = new SpeechSynthesisUtterance(prompt.english);
  utterance.lang = "en-NG";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
