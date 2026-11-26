import type { Locale, WeightUnit } from "@/types/menu";

/**
 * Resolves a localized string cleanly with automatic fallback.
 * If the requested language is blank, immediately falls back to the other language
 * without rendering empty placeholders.
 */
export function resolveLocalized(
  locale: Locale,
  km?: string | null,
  en?: string | null,
  fallback = ""
): string {
  const cleanKm = km?.trim() ?? "";
  const cleanEn = en?.trim() ?? "";
  if (locale === "km") {
    return cleanKm || cleanEn || fallback;
  }
  return cleanEn || cleanKm || fallback;
}

export const WEIGHT_UNIT_LABELS: Record<
  WeightUnit,
  { en: string; km: string; shortEn: string; shortKm: string }
> = {
  PER_100G: {
    en: "per 100g",
    km: "ក្នុង ១០០ក្រាម",
    shortEn: "/ 100g",
    shortKm: "/ ១០០ក្រាម",
  },
  PER_500G: {
    en: "per 500g",
    km: "ក្នុង ៥០០ក្រាម",
    shortEn: "/ 500g",
    shortKm: "/ ៥០០ក្រាម",
  },
  PER_KG: {
    en: "per kg",
    km: "ក្នុង ១គីឡូ",
    shortEn: "/ kg",
    shortKm: "/ គីឡូ",
  },
  PER_PIECE: {
    en: "per piece",
    km: "ក្នុង ១ក្បាល/ដុំ",
    shortEn: "/ pc",
    shortKm: "/ ដុំ",
  },
  PER_PORTION: {
    en: "per portion",
    km: "ក្នុង ១ចាន",
    shortEn: "/ portion",
    shortKm: "/ ចាន",
  },
};

export function formatWeightUnit(
  unit: WeightUnit | null | undefined,
  locale: Locale
): string {
  if (!unit) return "";
  return locale === "km"
    ? WEIGHT_UNIT_LABELS[unit].shortKm
    : WEIGHT_UNIT_LABELS[unit].shortEn;
}

export const SEAFOOD_TAG_DICTIONARY: Record<
  string,
  { en: string; km: string; highlight?: boolean }
> = {
  "Live Tank": { en: "Live Tank", km: "រស់", highlight: true },
  "Fresh Catch": { en: "Fresh Catch", km: "ស្រស់" },
  Spicy: { en: "Spicy", km: "ហឹរ" },
  Signature: { en: "Signature", km: "ប្រចាំហាង", highlight: true },
  Vegetarian: { en: "Vegetarian", km: "បួស" },
  "Gluten-Free": { en: "Gluten-Free", km: "គ្មានគ្លុយតែន" },
  Seasonal: { en: "Seasonal", km: "តាមរដូវ" },
};

export const PRESET_SEAFOOD_TAGS = Object.keys(SEAFOOD_TAG_DICTIONARY);

export function localizeTag(tag: string, locale: Locale): string {
  const entry = SEAFOOD_TAG_DICTIONARY[tag];
  if (!entry) return tag;
  return locale === "km" ? entry.km : entry.en;
}

export function isHighlightedTag(tag: string): boolean {
  return Boolean(SEAFOOD_TAG_DICTIONARY[tag]?.highlight);
}

export const DEFAULT_MENU_CATEGORIES = [
  { key: "seafood", nameKm: "គ្រឿងសមុទ្រ", nameEn: "Seafood" },
  { key: "crab", nameKm: "ក្តាម", nameEn: "Crab" },
  { key: "shrimp", nameKm: "បង្គា និង បង្កង", nameEn: "Shrimp" },
  { key: "squid", nameKm: "មឹក", nameEn: "Squid" },
  { key: "meat", nameKm: "ម្ហូបសាច់ និង ញាំ", nameEn: "Meat & Salads" },
  { key: "rice", nameKm: "បាយ និង មី", nameEn: "Rice" },
  { key: "beer", nameKm: "ស្រាបៀរ", nameEn: "Beer" },
  { key: "drink", nameKm: "ភេសជ្ជៈ", nameEn: "Drink" },
] as const;

export const DEFAULT_COOKING_STYLE_PRESETS = [
  { nameKm: "អាំង", nameEn: "Charcoal Grilled", defaultSurcharge: 0 },
  { nameKm: "ចំហុយស៊ីអ៊ីវ", nameEn: "Steamed with Soy & Ginger", defaultSurcharge: 0 },
  { nameKm: "ឆាម្រេចកំពត", nameEn: "Kampot Pepper Stir-fry", defaultSurcharge: 2 },
  { nameKm: "ឆាអំពិលទុំ", nameEn: "Tamarind Sauce", defaultSurcharge: 1.5 },
  { nameKm: "ភ្លាកោះកុង", nameEn: "Koh Kong Spicy", defaultSurcharge: 1.5 },
] as const;

export const UI_COPY = {
  en: {
    soldOut: "Sold out",
    inStock: "In stock",
    marketPrice: "Market Price",
    estRangePrefix: "Est.",
    searchPlaceholder: "Search seafood, dishes, tags...",
    clear: "Clear",
    resetFilters: "Reset filters",
    noMatchesTitle: "No dishes match your filter",
    noMatchesBody: "Try clearing your search or status filters.",
    noItemsBody: "This menu currently has no published dishes.",
    hours: "Opening Hours",
    location: "Location",
    contact: "Contact & Social",
    guestWifi: "Guest Wi-Fi",
    network: "Network",
    password: "Password",
    copyPassword: "Copy password",
    copied: "Copied",
    openMaps: "Open in Google Maps",
    telegram: "Telegram",
    facebook: "Facebook",
    hoursAndInfo: "Info, Maps & Wi-Fi",
    optionsAndPricing: "Portions & Variants",
    cookingStyleTitle: "Preparation / Cooking Style",
    cookingStyleHint: "Select how you would like this prepared",
    noExtraCharge: "Included",
    quantity: "Quantity",
    addToShortlist: "Add to Shortlist",
    done: "Done",
    table: "Table",
    shortlistBarCta: "Show to Staff",
    shortlistIncludesMarket: "Excludes market price items",
    shortlistModalTitle: "Order Shortlist",
    shortlistModalSubtitle: "Show this screen to our staff at your table",
    shortlistTableLabel: "Table Number",
    shortlistTablePlaceholder: "Optional (e.g. 05)",
    shortlistClearAll: "Clear all",
    shortlistEmpty: "Your shortlist is empty.",
    shortlistEstimatedSubtotal: "Estimated subtotal",
    shortlistMarketNote:
      "Market-price seafood will be weighed fresh and confirmed with you before cooking.",
    fromPrice: "From",
    optionsCount: "options",
    stylesCount: "styles",
    chooseOptions: "Choose",
  },
  km: {
    soldOut: "អស់",
    inStock: "មាន",
    marketPrice: "តាមតម្លៃទីផ្សារ",
    estRangePrefix: "ប៉ាន់ស្មាន",
    searchPlaceholder: "ស្វែងរកគ្រឿងសមុទ្រ ឬ មុខម្ហូប...",
    clear: "សម្អាត",
    resetFilters: "កំណត់ឡើងវិញ",
    noMatchesTitle: "រកមិនឃើញមុខម្ហូបដែលត្រូវគ្នាទេ",
    noMatchesBody: "សូមសាកល្បងសម្អាតពាក្យស្វែងរក ឬ តម្រង។",
    noItemsBody: "មិនទាន់មានមុខម្ហូបដាក់បង្ហាញនៅឡើយទេ។",
    hours: "ម៉ោងបើកដំណើរការ",
    location: "ទីតាំង",
    contact: "ទំនាក់ទំនង",
    guestWifi: "Wi-Fi សម្រាប់ភ្ញៀវ",
    network: "ឈ្មោះបណ្តាញ",
    password: "ពាក្យសម្ងាត់",
    copyPassword: "ចម្លងពាក្យសម្ងាត់",
    copied: "បានចម្លង",
    openMaps: "បើកក្នុង Google Maps",
    telegram: "Telegram",
    facebook: "Facebook",
    hoursAndInfo: "ព័ត៌មានហាង និង Wi-Fi",
    optionsAndPricing: "ទំហំ និង តម្លៃ",
    cookingStyleTitle: "របៀបចម្អិន / ការរៀបចំ",
    cookingStyleHint: "ជ្រើសរើសរបៀបចម្អិនដែលអ្នកចូលចិត្ត",
    noExtraCharge: "ឥតគិតថ្លៃបន្ថែម",
    quantity: "ចំនួន",
    addToShortlist: "បន្ថែមចូលបញ្ជី",
    done: "រួចរាល់",
    table: "តុ",
    shortlistBarCta: "បង្ហាញបុគ្គលិក",
    shortlistIncludesMarket: "មិនរាប់បញ្ចូលមុខម្ហូបតាមតម្លៃទីផ្សារ",
    shortlistModalTitle: "បញ្ជីមុខម្ហូបសម្រាប់បុគ្គលិក",
    shortlistModalSubtitle: "សូមបង្ហាញអេក្រង់នេះដល់បុគ្គលិកនៅតុរបស់អ្នក",
    shortlistTableLabel: "លេខតុ",
    shortlistTablePlaceholder: "លេខតុ (ឧ. 05)",
    shortlistClearAll: "សម្អាតទាំងអស់",
    shortlistEmpty: "មិនទាន់មានមុខម្ហូបក្នុងបញ្ជីទេ។",
    shortlistEstimatedSubtotal: "សរុបប៉ាន់ស្មាន",
    shortlistMarketNote:
      "គ្រឿងសមុទ្រតាមតម្លៃទីផ្សារនឹងត្រូវថ្លឹងស្រស់ និងបញ្ជាក់តម្លៃជាមួយអ្នកមុនពេលចម្អិន។",
    fromPrice: "ចាប់ពី",
    optionsCount: "ជម្រើស",
    stylesCount: "របៀបចម្អិន",
    chooseOptions: "ជ្រើស",
  },
} as const;
