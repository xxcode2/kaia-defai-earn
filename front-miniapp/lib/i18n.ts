export type Lang = "en" | "ja";
export function getLang(): Lang {
  const l = (typeof navigator !== "undefined" ? navigator.language : "en").toLowerCase();
  if (l.startsWith("ja")) return "ja";
  return "en";
}
export const t = (k: string, lang: Lang) => {
  const dict: Record<Lang, Record<string, string>> = {
    en: {
      shareLine: "Share to LINE",
      paymentNotice: "Demo purchase only (testMode). No real charge.",
    },
    ja: {
      shareLine: "LINEでシェア",
      paymentNotice: "デモ購入のみ（testMode）。実際の課金は発生しません。",
    },
  };
  return dict[lang]?.[k] ?? k;
};
