const DIGRAPHS: Array<[string, string]> = [
  ["ье", "ye"],
  ["ьё", "yo"],
  ["ью", "yu"],
  ["ья", "ya"],
  ["ий", "ii"],
  ["ай", "ai"],
  ["ой", "oi"],
  ["уй", "ui"],
  ["эй", "ei"],
  ["өө", "oo"],
  ["үү", "uu"]
];

const CYRILLIC_MAP: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "j",
  з: "z",
  и: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  ө: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ү: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya"
};

export function transliterateMongolianCyrillic(input: string) {
  let text = input.toLowerCase();
  for (const [cyrillic, latin] of DIGRAPHS) {
    text = text.replaceAll(cyrillic, latin);
  }

  return Array.from(text)
    .map((character) => CYRILLIC_MAP[character] ?? character)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export function getMongolianPronunciationHint(input: string) {
  const romanized = transliterateMongolianCyrillic(input);
  if (!romanized) return "";

  return romanized
    .split(" ")
    .map((word) => word.replace(/([aeiouy]{1,2}[bcdfghjklmnpqrstvwxyz])(?=[bcdfghjklmnpqrstvwxyz]*[aeiouy])/gi, "$1-"))
    .join(" ");
}
