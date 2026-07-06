export type VoiceDef = {
  id: string;
  name: string;
  desc: string;
  gender: "female" | "male";
  elevenVoiceId: string;
  openaiVoice: string; // for Lovable AI gpt-4o-mini-tts fallback
};

export const VOICES: VoiceDef[] = [
  { id: "aria",  name: "Aria",  desc: "Warm Female",   gender: "female", elevenVoiceId: "9BWtsMINqrJLrRacOk9x", openaiVoice: "shimmer" },
  { id: "sarah", name: "Sarah", desc: "Soft Female",   gender: "female", elevenVoiceId: "EXAVITQu4vr4xnSDxMaL", openaiVoice: "nova"    },
  { id: "laura", name: "Laura", desc: "Bright Female", gender: "female", elevenVoiceId: "FGY2WhTYpPnrIDTdsKH5", openaiVoice: "alloy"   },
  { id: "atlas", name: "Atlas", desc: "Deep Male",     gender: "male",   elevenVoiceId: "JBFqnCBsd6RMkjVDRZzb", openaiVoice: "onyx"    },
  { id: "charlie", name: "Charlie", desc: "Casual Male", gender: "male", elevenVoiceId: "IKne3meq5aSn9XLyUdCD", openaiVoice: "echo"    },
  { id: "brian", name: "Brian", desc: "Narrator Male", gender: "male",   elevenVoiceId: "nPczCjzI2devNBz1zQrb", openaiVoice: "onyx"    },
  { id: "callum", name: "Callum", desc: "Rich Male",   gender: "male",   elevenVoiceId: "N2lVS1w4EtoT3dr4eOWO", openaiVoice: "fable"   },
  { id: "matilda", name: "Matilda", desc: "Airy Female", gender: "female", elevenVoiceId: "XrExE9yKIg1WjnnlVkGX", openaiVoice: "nova"  },
];

export function getVoiceById(id: string): VoiceDef {
  return VOICES.find((v) => v.id === id) ?? VOICES[0];
}
