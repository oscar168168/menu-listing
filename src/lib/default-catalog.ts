import {
  categoriesCol,
  commitBatchedWrites,
  menuItemsCol,
  tenantDoc,
  tenantSlugsCol,
  type FirestoreTenantDoc,
} from "@/lib/firestore";
import { DEFAULT_MENU_CATEGORIES } from "@/lib/i18n";
import type { PricingType, WeightUnit } from "@/types/menu";

export const DEMO_CATALOG_VERSION = "v8-pak-khlang-168-fresh-seafood-kg";

export function isPakKhlangVenue(tenant: {
  slug: string;
  name?: string | null;
  nameKm?: string | null;
  nameEn?: string | null;
}): boolean {
  return (
    tenant.slug === "sora-seafood-grill" ||
    tenant.slug.includes("pak-khlang") ||
    (tenant.nameKm?.includes("ប៉ាក់ខ្លង") ?? false) ||
    (tenant.nameEn?.toLowerCase().includes("pak khlang") ?? false) ||
    (tenant.name?.toLowerCase().includes("pak khlang") ?? false)
  );
}

export const PAK_KHLANG_168_PROFILE = {
  name: "Somros Chhne Pak Khlang 168",
  nameEn: "Somros Chhne Pak Khlang 168",
  nameKm: "សម្រស់ឆ្នេរប៉ាក់ខ្លង 168",
  coverUrl:
    "https://lh3.googleusercontent.com/gps-cs-s/ANWiy9RyHhAD-RW_nZu1uw2S8DtV0qfMEamrKOdXj976lqGaE47VpD5dRRbwQFf1NUEORU32pFjscJis_PZxvm6mJKyIJDz0RkyuKljNg8SrOpwA2JQn1-Vyry-diM0_ZIXWXSPTt2bs=w800-h500-n-k-no",
  metaJson: {
    tagline: "",
    taglineEn: "",
    taglineKm: "",
    address:
      "HWMV+2C, ឃុំប៉ាក់ខ្លង ស្រុកមណ្ឌលសីមា ខេត្តកោះកុង (Pak Khlang, Mondol Seima, Koh Kong)",
    phone: "093 765 166 / 071 886 0606 / 088 9252 222 / 096 6199 770",
    telegramUrl: "https://t.me/LINLEAN168",
    facebookUrl:
      "https://www.facebook.com/p/%E1%9E%86%E1%9F%92%E1%9E%93%E1%9F%81%E1%9E%9A%E1%9E%94%E1%9F%89%E1%9E%B6%E1%9E%80%E1%9F%8B%E1%9E%81%E1%9F%92%E1%9E%9B%E1%9E%84-168-100069414237223/",
    googleMapsUrl:
      "https://www.google.com/maps/place/Pak+Khlang+Beach+168/@11.5826078,102.9435186,17z/data=!4m6!3m5!1s0x3106650066e69f4f:0xf93485f77dc5f9fd!8m2!3d11.5826078!4d102.9435186",
    footerNote:
      "Beachfront restaurant at Pak Khlang, Mondol Seima, Koh Kong. Birthday parties and special events welcome.",
    footerNoteKm:
      "អាហារដ្ឋានឆ្នេរសមុទ្រប៉ាក់ខ្លង ខេត្តកោះកុង មានទទួលធ្វើពិធីខួបកំណើត និងកម្មវិធីផ្សេងៗ។",
  },
} as const;

export type DefaultCategoryKey =
  (typeof DEFAULT_MENU_CATEGORIES)[number]["key"];

export interface SeedMenuItemSpec {
  categoryKey: DefaultCategoryKey;
  name: string;
  nameEn: string;
  nameKm: string;
  description: string;
  descriptionEn: string;
  descriptionKm: string;
  pricingType: PricingType;
  weightUnit?: WeightUnit | null;
  priceDecimal: number;
  imageUrl: string | null;
  tags: string[];
  isAvailable: boolean;
  sortOrder: number;
}

export const SORA_DEMO_ITEMS: SeedMenuItemSpec[] = [
  // 1. Seafood (គ្រឿងសមុទ្រ) — 8 items
  {
    categoryKey: "seafood",
    name: "Steamed Fish with Lime & Chili",
    nameEn: "Steamed Fish with Lime & Chili",
    nameKm: "ត្រីចំហុយក្រូចឆ្មា",
    description:
      "Whole sea fish steamed with garlic, bird's eye chilies, coriander, and lime broth.",
    descriptionEn:
      "Whole sea fish steamed with garlic, bird's eye chilies, coriander, and lime broth.",
    descriptionKm:
      "ត្រីសមុទ្រចំហុយភ្លាមៗ ជាមួយខ្ទឹមស ម្ទេសហឹរ ជីរវ៉ាន់ស៊ុយ និង ទឹកក្រូចឆ្មាឈ្ងុយឆ្ងាញ់។",
    pricingType: "FIXED",
    priceDecimal: 40000,
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/Pla_thapthim_nueng_manao.jpg/330px-Pla_thapthim_nueng_manao.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 0,
  },
  {
    categoryKey: "seafood",
    name: "Steamed Grouper with Soy & Ginger",
    nameEn: "Steamed Grouper with Soy & Ginger",
    nameKm: "ត្រីតុកកែចំហុយស៊ីអ៊ីវ",
    description:
      "Whole tiger grouper steamed with young ginger, scallion threads, and house soy.",
    descriptionEn:
      "Whole tiger grouper steamed with young ginger, scallion threads, and house soy.",
    descriptionKm:
      "ត្រីតុកកែចំហុយភ្លាមៗ ជាមួយខ្ញីខ្ចី ស្លឹកខ្ទឹម និង ទឹកស៊ីអ៊ីវពិសេសប្រចាំហាង។",
    pricingType: "FIXED",
    priceDecimal: 40000,
    imageUrl:
      "https://www.wokandkin.com/wp-content/uploads/2021/05/Steamed-Fish-with-Ginger-and-Shallots-saved-for-web-1200px.png",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 1,
  },
  {
    categoryKey: "seafood",
    name: "Charcoal Seafood Hotpot",
    nameEn: "Charcoal Seafood Hotpot",
    nameKm: "ស៊ុបឆ្នាំងភ្លើងគ្រឿងសមុទ្រ",
    description:
      "Traditional charcoal hotpot brimming with shrimp, squid, fish, mushrooms, and fresh greens.",
    descriptionEn:
      "Traditional charcoal hotpot brimming with shrimp, squid, fish, mushrooms, and fresh greens.",
    descriptionKm:
      "ស៊ុបឆ្នាំងភ្លើងប្រពៃណី ដាក់បង្គា មឹក ត្រី ផ្សិត និង បន្លែស្រស់ៗឈ្ងុយឆ្ងាញ់។",
    pricingType: "FIXED",
    priceDecimal: 40000,
    imageUrl:
      "https://popmenucloud.com/cdn-cgi/image/width%3D1200%2Cheight%3D1200%2Cfit%3Dscale-down%2Cformat%3Dauto%2Cquality%3D60/yiuvfbac/5c1f77f3-6392-42ca-8d81-681d1cf8d45e.webp",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 2,
  },
  {
    categoryKey: "seafood",
    name: "Tom Yum Seafood Soup",
    nameEn: "Tom Yum Seafood Soup",
    nameKm: "តុមយ៉ាំគ្រឿងសមុទ្រ",
    description:
      "Spicy and sour lemongrass broth loaded with prawns, squid, clams, and kaffir lime leaves.",
    descriptionEn:
      "Spicy and sour lemongrass broth loaded with prawns, squid, clams, and kaffir lime leaves.",
    descriptionKm:
      "ស៊ុបតុមយ៉ាំហឹរជូរអែមឈ្ងុយគល់ស្លឹកគ្រៃ ដាក់បង្គា មឹក និង គ្រឿងសមុទ្រស្រស់។",
    pricingType: "FIXED",
    priceDecimal: 35000,
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/74/%E0%B8%95%E0%B9%89%E0%B8%A1%E0%B8%A2%E0%B8%B3%E0%B8%97%E0%B8%B0%E0%B9%80%E0%B8%A5%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B9%83%E0%B8%AA.jpg/330px-%E0%B8%95%E0%B9%89%E0%B8%A1%E0%B8%A2%E0%B8%B3%E0%B8%97%E0%B8%B0%E0%B9%80%E0%B8%A5%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B9%83%E0%B8%AA.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 3,
  },
  {
    categoryKey: "seafood",
    name: "Fresh Coastal Oysters with Herbs",
    nameEn: "Fresh Coastal Oysters with Herbs",
    nameKm: "អយស្ទ័រស្រស់",
    description:
      "Shucked fresh local Koh Kong oysters served chilled with fried shallots, lime, and greens.",
    descriptionEn:
      "Shucked fresh local Koh Kong oysters served chilled with fried shallots, lime, and greens.",
    descriptionKm:
      "អយស្ទ័រស្រស់ពីកោះកុង ញ៉ាំជាមួយខ្ទឹមក្រហមបំពង កន្ទ្រាំ និង ទឹកត្រីហឹរឆ្ងាញ់។",
    pricingType: "FIXED",
    priceDecimal: 25000,
    imageUrl:
      "/images/pak-khlang/fresh-oysters.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 4,
  },
  {
    categoryKey: "seafood",
    name: "Stir-Fried Blood Cockles with Tamarind",
    nameEn: "Stir-Fried Blood Cockles with Tamarind",
    nameKm: "ងាវឆាអំពិលទុំ",
    description:
      "Fresh blood cockles wok-tossed with garlic, chili, sweet basil, and tamarind sauce.",
    descriptionEn:
      "Fresh blood cockles wok-tossed with garlic, chili, sweet basil, and tamarind sauce.",
    descriptionKm:
      "ងាវស្រស់ឆាអំពិលទុំ ជាមួយខ្ទឹមស ម្ទេស និង ជីរហោរ៉ាប៉ា។",
    pricingType: "FIXED",
    priceDecimal: 25000,
    imageUrl:
      "/images/pak-khlang/blood-cockles.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 5,
  },
  {
    categoryKey: "seafood",
    name: "Grilled Sea Snails",
    nameEn: "Grilled Sea Snails",
    nameKm: "ខ្យងហូលអាំងប្រេងខ្ទឹម",
    description:
      "Coastal sea snails grilled in shell with green Kampot pepper and scallion oil.",
    descriptionEn:
      "Coastal sea snails grilled in shell with green Kampot pepper and scallion oil.",
    descriptionKm:
      "ខ្យងហូលសមុទ្រអាំងជាមួយប្រេងស្លឹកខ្ទឹម និង ម្រេចខ្ចី។",
    pricingType: "FIXED",
    priceDecimal: 25000,
    imageUrl:
      "/images/pak-khlang/sea-snails.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 6,
  },
  {
    categoryKey: "seafood",
    name: "Horseshoe Crab Roe Mango Salad",
    nameEn: "Horseshoe Crab Roe Mango Salad",
    nameKm: "ញាំពងបែលសមុទ្រ",
    description:
      "Iconic Koh Kong delicacy of golden horseshoe crab roe tossed with shredded green mango, shallots, herbs, and chili.",
    descriptionEn:
      "Iconic Koh Kong delicacy of golden horseshoe crab roe tossed with shredded green mango, shallots, herbs, and chili.",
    descriptionKm:
      "មុខម្ហូបប្រចាំឆ្នេរប៉ាក់ខ្លង ញាំពងបែលសមុទ្រជាមួយស្វាយខ្ចី ខ្ទឹមក្រហម ជីគ្រប់មុខ និង ម្ទេសហឹរជូរអែម។",
    pricingType: "FIXED",
    priceDecimal: 40000,
    imageUrl: "/images/pak-khlang/horseshoe-crab-salad.jpg",
    tags: ["Signature", "Fresh Catch"],
    isAvailable: true,
    sortOrder: 7,
  },
  {
    categoryKey: "seafood",
    name: "Charcoal-Grilled Lemongrass Sea Fish",
    nameEn: "Charcoal-Grilled Lemongrass Sea Fish",
    nameKm: "ត្រីសមុទ្រអាំងគល់ស្លឹកគ្រៃ",
    description:
      "Whole local sea fish stuffed with crushed lemongrass and kaffir lime leaves, grilled smoky over charcoal.",
    descriptionEn:
      "Whole local sea fish stuffed with crushed lemongrass and kaffir lime leaves, grilled smoky over charcoal.",
    descriptionKm:
      "ត្រីសមុទ្រស្រស់ញាត់គល់ស្លឹកគ្រៃ និង ស្លឹកក្រូចសើច អាំងភ្លើងធ្យូងផ្ទាប់បន្លែស្រស់ និង ទឹកត្រីកោះកុង។",
    pricingType: "FIXED",
    priceDecimal: 40000,
    imageUrl: "/images/pak-khlang/grilled-whole-fish.jpg",
    tags: ["Signature", "Fresh Catch"],
    isAvailable: true,
    sortOrder: 8,
  },
  {
    categoryKey: "seafood",
    name: "Crispy Fried Sea Fish with Herbs",
    nameEn: "Crispy Fried Sea Fish with Herbs",
    nameKm: "ត្រីបំពងស្វាយខ្ចី និង គ្រឿងក្រអូប",
    description:
      "Golden crispy whole sea fish topped with fried lemongrass, kaffir lime leaves, and spicy Koh Kong mango dip.",
    descriptionEn:
      "Golden crispy whole sea fish topped with fried lemongrass, kaffir lime leaves, and spicy Koh Kong mango dip.",
    descriptionKm:
      "ត្រីសមុទ្របំពងស្រួយរោយគល់ស្លឹកគ្រៃបំពង និង ស្លឹកក្រូចសើច ញ៉ាំជាមួយទឹកត្រីស្វាយខ្ចីកោះកុង។",
    pricingType: "FIXED",
    priceDecimal: 40000,
    imageUrl: "/images/pak-khlang/fried-fish-herbs.jpg",
    tags: ["Fresh Catch"],
    isAvailable: true,
    sortOrder: 9,
  },
  {
    categoryKey: "seafood",
    name: "Cambodian Kroeung Sour Sea Fish Soup",
    nameEn: "Cambodian Kroeung Sour Sea Fish Soup",
    nameKm: "សម្លម្ជូរគ្រឿងត្រីសមុទ្រ",
    description:
      "Traditional aromatic lemongrass kroeung sour soup simmered with fresh coastal fish and morning glory.",
    descriptionEn:
      "Traditional aromatic lemongrass kroeung sour soup simmered with fresh coastal fish and morning glory.",
    descriptionKm:
      "សម្លម្ជូរគ្រឿងត្រីសមុទ្រស្រស់ ដាក់ត្រកួន និង គ្រឿងបុកក្រអូបឈ្ងុយបែបខ្មែរ។",
    pricingType: "FIXED",
    priceDecimal: 35000,
    imageUrl: "/images/pak-khlang/samlor-machu-kroeung.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 10,
  },
  {
    categoryKey: "seafood",
    name: "Steamed Green Mussels with Koh Kong Sauce",
    nameEn: "Steamed Green Mussels with Koh Kong Sauce",
    nameKm: "គ្រំសមុទ្រស្រុះទឹកត្រីកោះកុង",
    description:
      "Plump coastal green mussels steamed with lemongrass, sweet basil, fried garlic, and fiery chili-lime dip.",
    descriptionEn:
      "Plump coastal green mussels steamed with lemongrass, sweet basil, fried garlic, and fiery chili-lime dip.",
    descriptionKm:
      "គ្រំសមុទ្រស្រស់ស្រុះគល់ស្លឹកគ្រៃ និង ជីរហោរ៉ាប៉ា ញ៉ាំជាមួយទឹកត្រីកោះកុងហឹរឆ្ងាញ់។",
    pricingType: "FIXED",
    priceDecimal: 25000,
    imageUrl: "/images/pak-khlang/green-mussels.jpg",
    tags: ["Fresh Catch"],
    isAvailable: true,
    sortOrder: 11,
  },

  // 2. Crab (ក្តាម) — 6 items
  {
    categoryKey: "crab",
    name: "Kampot Pepper Crab",
    nameEn: "Kampot Pepper Crab",
    nameKm: "ក្តាមឆាម្រេចកំពត",
    description:
      "Fresh Kep crab wok-tossed with green Kampot peppercorn clusters and garlic.",
    descriptionEn:
      "Fresh Kep crab wok-tossed with green Kampot peppercorn clusters and garlic.",
    descriptionKm:
      "ក្តាមសមុទ្រឆាជាមួយម្រេចខ្ចីកំពតស្រស់ ខ្ទឹមស និង ទឹកប្រេងខ្យងពិសេស។",
    pricingType: "FIXED",
    priceDecimal: 40000,
    imageUrl:
      "/images/pak-khlang/kampot-pepper-crab.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 0,
  },
  {
    categoryKey: "crab",
    name: "Steamed Fresh Mud Crab",
    nameEn: "Steamed Fresh Mud Crab",
    nameKm: "ក្តាមថ្មចំហុយ",
    description:
      "Fresh coastal Koh Kong mud crabs steamed to preserve sweet meat and rich roe.",
    descriptionEn:
      "Fresh coastal Koh Kong mud crabs steamed to preserve sweet meat and rich roe.",
    descriptionKm:
      "ក្តាមថ្មស្រស់ចំហុយធម្មជាតិ សាច់ណែនផ្អែម ញ៉ាំជាមួយទឹកក្រូចឆ្មាអំបិលម្រេច។",
    pricingType: "FIXED",
    priceDecimal: 40000,
    imageUrl:
      "/images/pak-khlang/steamed-mud-crab.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 1,
  },
  {
    categoryKey: "crab",
    name: "Steamed Blue Crab with Lemongrass",
    nameEn: "Steamed Blue Crab with Lemongrass",
    nameKm: "ក្តាមសេះចំហុយគល់ស្លឹកគ្រៃ",
    description:
      "Sweet blue swimmer crab steamed with crushed lemongrass and kaffir lime leaves.",
    descriptionEn:
      "Sweet blue swimmer crab steamed with crushed lemongrass and kaffir lime leaves.",
    descriptionKm:
      "ក្តាមសេះស្រស់ចំហុយជាមួយគល់ស្លឹកគ្រៃ និង ស្លឹកក្រូចសើចឈ្ងុយឆ្ងាញ់។",
    pricingType: "FIXED",
    priceDecimal: 35000,
    imageUrl:
      "/images/pak-khlang/steamed-blue-crab.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 2,
  },
  {
    categoryKey: "crab",
    name: "Marinated Raw Blue Swimming Crab",
    nameEn: "Marinated Raw Blue Swimming Crab",
    nameKm: "ក្តាមសេះប្រៃទឹកត្រីកោះកុង",
    description:
      "Fresh blue swimming crab marinated in Koh Kong chili, garlic, and tangy lime sauce.",
    descriptionEn:
      "Fresh blue swimming crab marinated in Koh Kong chili, garlic, and tangy lime sauce.",
    descriptionKm:
      "ក្តាមសេះត្រាំទឹកត្រីកោះកុង ម្ទេសហឹរ ខ្ទឹមស និង ទឹកក្រូចឆ្មាស្រស់។",
    pricingType: "FIXED",
    priceDecimal: 35000,
    imageUrl:
      "/images/pak-khlang/marinated-blue-crab.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 3,
  },
  {
    categoryKey: "crab",
    name: "Stir-Fried Crab in Yellow Curry & Egg",
    nameEn: "Stir-Fried Crab in Yellow Curry & Egg",
    nameKm: "ក្តាមឆាការីពងទា",
    description:
      "Koh Kong border specialty of fresh sea crab wok-braised in rich golden curry sauce, creamy egg, and Chinese celery.",
    descriptionEn:
      "Koh Kong border specialty of fresh sea crab wok-braised in rich golden curry sauce, creamy egg, and Chinese celery.",
    descriptionKm:
      "ក្តាមសមុទ្រស្រស់ឆាការីពងទាបែបកោះកុង ទឹកការីខាប់ឈ្ងុយឆ្ងាញ់ជាមួយគិនឆាយ និង ស្លឹកខ្ទឹម។",
    pricingType: "FIXED",
    priceDecimal: 40000,
    imageUrl: "/images/pak-khlang/curry-egg-crab.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 4,
  },
  {
    categoryKey: "crab",
    name: "Spicy Marinated Roe Mud Crab",
    nameEn: "Spicy Marinated Roe Mud Crab",
    nameKm: "ក្តាមថ្មប្រៃពងទឹកត្រីកោះកុង",
    description:
      "Chilled female mud crab brimming with rich orange roe, dressed in fiery Koh Kong garlic, chili, and lime marinade.",
    descriptionEn:
      "Chilled female mud crab brimming with rich orange roe, dressed in fiery Koh Kong garlic, chili, and lime marinade.",
    descriptionKm:
      "ក្តាមថ្មពងពេញសំបក ត្រាំទឹកត្រីកោះកុង ខ្ទឹមស ម្ទេសហឹរ និង ទឹកក្រូចឆ្មាស្រស់។",
    pricingType: "FIXED",
    priceDecimal: 45000,
    imageUrl: "/images/pak-khlang/marinated-roe-mud-crab.jpg",
    tags: ["Live Tank", "Spicy"],
    isAvailable: true,
    sortOrder: 5,
  },

  // 3. Shrimp (បង្គា និង បង្កង) — 6 items
  {
    categoryKey: "shrimp",
    name: "Grilled Giant River Prawns",
    nameEn: "Grilled Giant River Prawns",
    nameKm: "បង្កងអាំងធ្យូង",
    description:
      "Mekong giant river prawns grilled over charcoal with green chili seafood dip.",
    descriptionEn:
      "Mekong giant river prawns grilled over charcoal with green chili seafood dip.",
    descriptionKm:
      "បង្កងទន្លេមេគង្គអាំងលើធ្យូងឈើធម្មជាតិ ញ៉ាំជាមួយទឹកត្រីកោះកុង។",
    pricingType: "FIXED",
    priceDecimal: 40000,
    imageUrl: "/images/grilled-river-prawns.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 0,
  },
  {
    categoryKey: "shrimp",
    name: "Charcoal-Grilled King Prawns",
    nameEn: "Charcoal-Grilled King Prawns",
    nameKm: "បង្គាដុតអំបិលម្ទេស",
    description:
      "Whole king prawns grilled over hot charcoal until smoky and sweet, served with green sauce.",
    descriptionEn:
      "Whole king prawns grilled over hot charcoal until smoky and sweet, served with green sauce.",
    descriptionKm:
      "បង្គាសមុទ្រអាំងធ្យូងក្តៅៗ ឈ្ងុយឆ្ងាញ់ ញ៉ាំជាមួយទឹកត្រីកោះកុង។",
    pricingType: "FIXED",
    priceDecimal: 40000,
    imageUrl:
      "/images/pak-khlang/grilled-king-prawns.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 1,
  },
  {
    categoryKey: "shrimp",
    name: "Stir-Fried Shrimp with Garlic & Scallions",
    nameEn: "Stir-Fried Shrimp with Garlic & Scallions",
    nameKm: "បង្គាឆាខ្ទឹមស",
    description:
      "Fresh local Koh Kong shrimp stir-fried with garlic, oyster glaze, and scallions.",
    descriptionEn:
      "Fresh local Koh Kong shrimp stir-fried with garlic, oyster glaze, and scallions.",
    descriptionKm:
      "បង្គាស្រស់កោះកុងឆាជាមួយខ្ទឹមស ប្រេងខ្យង និង ស្លឹកខ្ទឹមឈ្ងុយឆ្ងាញ់។",
    pricingType: "FIXED",
    priceDecimal: 35000,
    imageUrl:
      "/images/pak-khlang/stir-fried-garlic-shrimp.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 2,
  },
  {
    categoryKey: "shrimp",
    name: "Koh Kong Raw Shrimp",
    nameEn: "Koh Kong Raw Shrimp",
    nameKm: "ភ្លាបង្គាកោះកុង",
    description:
      "Chilled sweet sea prawns marinated in fresh lime, chili, garlic, and herbs.",
    descriptionEn:
      "Chilled sweet sea prawns marinated in fresh lime, chili, garlic, and herbs.",
    descriptionKm:
      "បង្គាស្រស់ត្រជាក់ លាយទឹកត្រីកោះកុង ម្ទេសហឹរ ខ្ទឹមស និង ម្រះស្រួយ។",
    pricingType: "FIXED",
    priceDecimal: 35000,
    imageUrl:
      "/images/pak-khlang/koh-kong-raw-shrimp.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 3,
  },
  {
    categoryKey: "shrimp",
    name: "Garlic Fried Sea Shrimp",
    nameEn: "Garlic Fried Sea Shrimp",
    nameKm: "បង្គាបំពងខ្ទឹមស",
    description:
      "Crispy golden fried shrimp tossed with toasted garlic and aromatic Kampot pepper.",
    descriptionEn:
      "Crispy golden fried shrimp tossed with toasted garlic and aromatic Kampot pepper.",
    descriptionKm:
      "បង្គាសមុទ្របំពងស្រួយលីងជាមួយខ្ទឹមសបំពង និង ម្រេចសកំពត។",
    pricingType: "FIXED",
    priceDecimal: 25000,
    imageUrl:
      "/images/pak-khlang/garlic-fried-shrimp.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 4,
  },
  {
    categoryKey: "shrimp",
    name: "Spicy Blanched Shrimp & Herb Salad",
    nameEn: "Spicy Blanched Shrimp & Herb Salad",
    nameKm: "ញាំបង្គាឆ្អិនគ្រឿងសមុទ្រ",
    description:
      "Sweet poached sea shrimp tossed with sliced shallots, lemongrass, culantro, bird's eye chili, and fresh lime.",
    descriptionEn:
      "Sweet poached sea shrimp tossed with sliced shallots, lemongrass, culantro, bird's eye chili, and fresh lime.",
    descriptionKm:
      "បង្គាសមុទ្រស្រុះឆ្អិនល្មម ញាំជាមួយខ្ទឹមក្រហម គល់ស្លឹកគ្រៃ ជីររណារ និង ម្ទេសក្រូចឆ្មា។",
    pricingType: "FIXED",
    priceDecimal: 30000,
    imageUrl: "/images/pak-khlang/spicy-shrimp-salad.jpg",
    tags: ["Spicy"],
    isAvailable: true,
    sortOrder: 5,
  },

  // 4. Squid (មឹក) — 7 items
  {
    categoryKey: "squid",
    name: "Charcoal-Grilled Squid",
    nameEn: "Charcoal-Grilled Squid",
    nameKm: "មឹកអាំងទឹកត្រីកោះកុង",
    description:
      "Whole tender coastal squid grilled over charcoal with spicy Koh Kong lime dip.",
    descriptionEn:
      "Whole tender coastal squid grilled over charcoal with spicy Koh Kong lime dip.",
    descriptionKm:
      "មឹកស្រស់អាំងធ្យូងឈ្ងុយ ញ៉ាំជាមួយទឹកត្រីកោះកុងហឹរឆ្ងាញ់។",
    pricingType: "FIXED",
    priceDecimal: 35000,
    imageUrl:
      "/images/pak-khlang/grilled-squid.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 0,
  },
  {
    categoryKey: "squid",
    name: "Steamed Squid with Koh Kong Sauce",
    nameEn: "Steamed Squid with Koh Kong Sauce",
    nameKm: "មឹកចំហុយទឹកត្រីកោះកុង",
    description:
      "Tender steamed squid rings served alongside zesty green chili-lime Koh Kong sauce.",
    descriptionEn:
      "Tender steamed squid rings served alongside zesty green chili-lime Koh Kong sauce.",
    descriptionKm:
      "មឹកស្រស់ចំហុយសាច់ស្រួយផ្អែម ញ៉ាំជាមួយទឹកត្រីកោះកុងហឹរឆ្ងាញ់។",
    pricingType: "FIXED",
    priceDecimal: 35000,
    imageUrl:
      "/images/pak-khlang/steamed-squid-koh-kong.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 1,
  },
  {
    categoryKey: "squid",
    name: "Stir-Fried Squid with Green Peppercorn",
    nameEn: "Stir-Fried Squid with Green Peppercorn",
    nameKm: "មឹកឆាម្រេចខ្ចី",
    description:
      "Wok-fried fresh squid with green peppercorns, sweet onions, bell peppers, and oyster sauce.",
    descriptionEn:
      "Wok-fried fresh squid with green peppercorns, sweet onions, bell peppers, and oyster sauce.",
    descriptionKm:
      "មឹកស្រស់ឆាជាមួយម្រេចខ្ចី ខ្ទឹមបារាំង ម្ទេសប្លោក និង ប្រេងខ្យងឈ្ងុយ។",
    pricingType: "FIXED",
    priceDecimal: 35000,
    imageUrl:
      "/images/pak-khlang/squid-green-peppercorn.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 2,
  },
  {
    categoryKey: "squid",
    name: "Green Mango & Squid Salad",
    nameEn: "Green Mango & Squid Salad",
    nameKm: "ញាំមឹកស្វាយខ្ចី",
    description:
      "Poached coastal squid tossed with shredded green mango, mint, and roasted peanuts.",
    descriptionEn:
      "Poached coastal squid tossed with shredded green mango, mint, and roasted peanuts.",
    descriptionKm:
      "មឹកស្រស់ស្រុះញាំជាមួយស្វាយខ្ចី ជីអង្កាម និង សណ្តែកដីលីង។",
    pricingType: "FIXED",
    priceDecimal: 25000,
    imageUrl:
      "/images/pak-khlang/mango-squid-salad.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 3,
  },
  {
    categoryKey: "squid",
    name: "Charcoal-Grilled Baby Octopus",
    nameEn: "Charcoal-Grilled Baby Octopus",
    nameKm: "មឹកពីងពាងអាំងធ្យូង",
    description:
      "Whole coastal baby octopuses grilled tender over glowing charcoal embers with spicy green Koh Kong dipping sauce.",
    descriptionEn:
      "Whole coastal baby octopuses grilled tender over glowing charcoal embers with spicy green Koh Kong dipping sauce.",
    descriptionKm:
      "មឹកពីងពាងសមុទ្រស្រស់អាំងលើភ្លើងធ្យូងក្តៅៗ ញ៉ាំជាមួយទឹកត្រីកោះកុងហឹរឆ្ងាញ់។",
    pricingType: "FIXED",
    priceDecimal: 30000,
    imageUrl: "/images/pak-khlang/grilled-baby-octopus.jpg",
    tags: ["Fresh Catch"],
    isAvailable: true,
    sortOrder: 4,
  },
  {
    categoryKey: "squid",
    name: "Stir-Fried Squid with Holy Basil & Chili",
    nameEn: "Stir-Fried Squid with Holy Basil & Chili",
    nameKm: "មឹកឆាម្រះព្រៅ",
    description:
      "Coastal squid rings wok-seared over high flame with crushed garlic, red bird's eye chili, and fragrant holy basil.",
    descriptionEn:
      "Coastal squid rings wok-seared over high flame with crushed garlic, red bird's eye chili, and fragrant holy basil.",
    descriptionKm:
      "មឹកសមុទ្រស្រស់ឆាភ្លើងខ្លាំងជាមួយខ្ទឹមស ម្ទេសហឹរ និង ស្លឹកម្រះព្រៅឈ្ងុយឆ្ងាញ់។",
    pricingType: "FIXED",
    priceDecimal: 30000,
    imageUrl: "/images/pak-khlang/basil-squid.jpg",
    tags: ["Spicy"],
    isAvailable: true,
    sortOrder: 5,
  },
  {
    categoryKey: "squid",
    name: "Crispy Deep-Fried Calamari Squid",
    nameEn: "Crispy Deep-Fried Calamari Squid",
    nameKm: "មឹកបំពងម្សៅស្រួយ",
    description:
      "Lightly battered coastal squid deep-fried golden and crisp, served with plum chili and Kampot lime-pepper dip.",
    descriptionEn:
      "Lightly battered coastal squid deep-fried golden and crisp, served with plum chili and Kampot lime-pepper dip.",
    descriptionKm:
      "មឹកស្រស់បំពងម្សៅស្រួយពណ៌មាស ញ៉ាំជាមួយទឹកម្រេចក្រូចឆ្មា និង ទឹកจิ้มម្ទេសផ្អែម។",
    pricingType: "FIXED",
    priceDecimal: 25000,
    imageUrl: "/images/pak-khlang/crispy-fried-squid.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 6,
  },

  // 5. Meat & Salads (ម្ហូបសាច់ និង ញាំ) — 6 items
  {
    categoryKey: "meat",
    name: "Cambodian Beef Lok Lak with Egg & Fries",
    nameEn: "Cambodian Beef Lok Lak with Egg & Fries",
    nameKm: "សាច់គោឡុកឡាក់ពងទាចៀន",
    description:
      "Wok-seared marinated beef cubes served with fried egg, crispy fries, fresh greens, and Kampot pepper-lime dip.",
    descriptionEn:
      "Wok-seared marinated beef cubes served with fried egg, crispy fries, fresh greens, and Kampot pepper-lime dip.",
    descriptionKm:
      "សាច់គោឡុកឡាក់ផុយឆ្ងាញ់ បន្ថែមពងទាចៀន ដំឡូងបារាំងបំពង បន្លែស្រស់ និង ទឹកម្រេចក្រូចឆ្មា។",
    pricingType: "FIXED",
    priceDecimal: 25000,
    imageUrl: "/images/pak-khlang/beef-lok-lak.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 0,
  },
  {
    categoryKey: "meat",
    name: "Whole Charcoal-Roasted Chicken",
    nameEn: "Whole Charcoal-Roasted Chicken",
    nameKm: "មាន់ដុតធ្យូងឆ្នេរប៉ាក់ខ្លង",
    description:
      "Whole free-range chicken marinated in lemongrass, garlic, and honey, slow-roasted golden with cucumber and herbs.",
    descriptionEn:
      "Whole free-range chicken marinated in lemongrass, garlic, and honey, slow-roasted golden with cucumber and herbs.",
    descriptionKm:
      "មាន់ស្រែប្រឡាក់គល់ស្លឹកគ្រៃ ខ្ទឹមស និង ទឹកឃ្មុំ ដុតធ្យូងឡើងក្រហមឈ្ងុយ ញ៉ាំជុំគ្រួសារនៅមាត់ឆ្នេរ។",
    pricingType: "FIXED",
    priceDecimal: 40000,
    imageUrl: "/images/pak-khlang/roasted-chicken.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 1,
  },
  {
    categoryKey: "meat",
    name: "Spicy Lime Beef Salad with Long Beans",
    nameEn: "Spicy Lime Beef Salad with Long Beans",
    nameKm: "ភ្លាសាច់គោសណ្ដែកគួរ",
    description:
      "Tender sliced beef tossed with crisp long beans, lemongrass, shallots, roasted peanuts, basil, and fresh lime.",
    descriptionEn:
      "Tender sliced beef tossed with crisp long beans, lemongrass, shallots, roasted peanuts, basil, and fresh lime.",
    descriptionKm:
      "ភ្លាសាច់គោស្រស់លាយសណ្ដែកគួរស្រួយ គល់ស្លឹកគ្រៃ ខ្ទឹមក្រហម សណ្តែកដីលីង និង ទឹកក្រូចឆ្មាហឹរឆ្ងាញ់។",
    pricingType: "FIXED",
    priceDecimal: 25000,
    imageUrl: "/images/pak-khlang/spicy-beef-salad.jpg",
    tags: ["Spicy"],
    isAvailable: true,
    sortOrder: 2,
  },
  {
    categoryKey: "meat",
    name: "Blue Crab Green Papaya Salad",
    nameEn: "Blue Crab Green Papaya Salad",
    nameKm: "បុកល្ហុងក្តាមសេះ",
    description:
      "Koh Kong border-style shredded green papaya pounded with chili, garlic, cherry tomatoes, lime, and fresh blue crab.",
    descriptionEn:
      "Koh Kong border-style shredded green papaya pounded with chili, garlic, cherry tomatoes, lime, and fresh blue crab.",
    descriptionKm:
      "បុកល្ហុងក្តាមសេះស្រស់ រសជាតិជូរហឹរឆ្ងាញ់បែបអ្នកកោះកុង ញ៉ាំកាត់ទ្រលាន់នៅមាត់សមុទ្រ។",
    pricingType: "FIXED",
    priceDecimal: 25000,
    imageUrl: "/images/pak-khlang/blue-crab-papaya-salad.jpg",
    tags: ["Signature", "Spicy"],
    isAvailable: true,
    sortOrder: 3,
  },
  {
    categoryKey: "meat",
    name: "Charcoal BBQ Skewers",
    nameEn: "Charcoal BBQ Skewers",
    nameKm: "សាច់អាំងចង្កាក់",
    description:
      "Marinated meat and bell pepper skewers grilled over charcoal until smoky.",
    descriptionEn:
      "Marinated meat and bell pepper skewers grilled over charcoal until smoky.",
    descriptionKm:
      "សាច់អាំងចង្កាក់ដោតជាមួយម្ទេសប្លោក អាំងធ្យូងឈ្ងុយឆ្ងាញ់។",
    pricingType: "FIXED",
    priceDecimal: 25000,
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/DFC_6118_Grilled_marinated_beef_skewers_sizzling_with_caramelized_edges_-_a_popular_street_food_snack_from_Sattahip_Chon_Buri.jpg/330px-DFC_6118_Grilled_marinated_beef_skewers_sizzling_with_caramelized_edges_-_a_popular_street_food_snack_from_Sattahip_Chon_Buri.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 4,
  },
  {
    categoryKey: "meat",
    name: "Crispy French Fries",
    nameEn: "Crispy French Fries",
    nameKm: "ដំឡូងបារាំងបំពង",
    description:
      "Golden crispy french fries lightly salted and served hot with tomato ketchup and sweet chili sauce.",
    descriptionEn:
      "Golden crispy french fries lightly salted and served hot with tomato ketchup and sweet chili sauce.",
    descriptionKm:
      "ដំឡូងបារាំងបំពងស្រួយក្តៅៗ ញ៉ាំលេងជាមួយទឹកប៉េងប៉ោះ និង ទឹកម្ទេស។",
    pricingType: "FIXED",
    priceDecimal: 10000,
    imageUrl: "/images/pak-khlang/french-fries.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 5,
  },

  // 6. Rice (បាយ និង មី) — 4 items
  {
    categoryKey: "rice",
    name: "Seafood Fried Rice",
    nameEn: "Seafood Fried Rice",
    nameKm: "បាយឆាគ្រឿងសមុទ្រ",
    description:
      "Smoky jasmine rice wok-fried with prawns, squid, crab meat, and farm egg.",
    descriptionEn:
      "Smoky jasmine rice wok-fried with prawns, squid, crab meat, and farm egg.",
    descriptionKm:
      "បាយអង្ករផ្កាម្លិះឆាឈ្ងុយ ជាមួយបង្គា មឹក សាច់ក្តាម ស្លឹកខ្ទឹម និង ពងមាន់។",
    pricingType: "FIXED",
    priceDecimal: 25000,
    imageUrl:
      "https://www.yummymedley.com/wp-content/uploads/2017/05/seafood-fried-rice.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 0,
  },
  {
    categoryKey: "rice",
    name: "Claypot Crab Glass Noodles",
    nameEn: "Claypot Crab Glass Noodles",
    nameKm: "មីសួឆ្នាំងដីក្តាម",
    description:
      "Glass noodles slow-steamed in a hot claypot with white pepper, ginger, and crab.",
    descriptionEn:
      "Glass noodles slow-steamed in a hot claypot with white pepper, ginger, and crab.",
    descriptionKm:
      "មីសួអប់ក្នុងឆ្នាំងដីក្តៅៗ ជាមួយសាច់ក្តាម ម្រេចស ខ្ញី និង គិនឆាយឈ្ងុយ។",
    pricingType: "FIXED",
    priceDecimal: 35000,
    imageUrl:
      "/images/pak-khlang/crab-glass-noodles.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 1,
  },
  {
    categoryKey: "rice",
    name: "Stir-Fried Seafood Noodles",
    nameEn: "Stir-Fried Seafood Noodles",
    nameKm: "មីឆាគ្រឿងសមុទ្រ",
    description:
      "Wok-fried noodles tossed with fresh coastal shrimp, squid rings, crisp greens, egg, and savory garlic-oyster glaze.",
    descriptionEn:
      "Wok-fried noodles tossed with fresh coastal shrimp, squid rings, crisp greens, egg, and savory garlic-oyster glaze.",
    descriptionKm:
      "មីឆាគ្រឿងសមុទ្រក្តៅៗ ដាក់បង្គា មឹកស្រស់ បន្លែគ្រប់មុខ និង ពងមាន់ឈ្ងុយឆ្ងាញ់។",
    pricingType: "FIXED",
    priceDecimal: 25000,
    imageUrl: "/images/pak-khlang/seafood-fried-noodles.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 2,
  },
  {
    categoryKey: "rice",
    name: "Wok-Fried Beef Rice",
    nameEn: "Wok-Fried Beef Rice",
    nameKm: "បាយឆាសាច់គោ",
    description:
      "Fragrant jasmine rice wok-tossed over high heat with tender marinated beef slices, egg, garlic, and scallions.",
    descriptionEn:
      "Fragrant jasmine rice wok-tossed over high heat with tender marinated beef slices, egg, garlic, and scallions.",
    descriptionKm:
      "បាយឆាសាច់គោក្រអូបឈ្ងុយ ឆាជាមួយពងមាន់ ខ្ទឹមស និង ស្លឹកខ្ទឹមស្រស់។",
    pricingType: "FIXED",
    priceDecimal: 20000,
    imageUrl: "/images/pak-khlang/beef-fried-rice.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 3,
  },

  // 7. Beer (ស្រាបៀរ) — 4 items
  {
    categoryKey: "beer",
    name: "Ganzberg Beer",
    nameEn: "Ganzberg Beer",
    nameKm: "ស្រាបៀរ ហ្គានស៍បឺគ",
    description: "Ice-cold German-style premium Ganzberg lager served chilled on ice at your beach table.",
    descriptionEn: "Ice-cold German-style premium Ganzberg lager served chilled on ice at your beach table.",
    descriptionKm: "ស្រាបៀរហ្គានស៍បឺគត្រជាក់ៗ ដាក់ទឹកកកជូននៅមាត់ឆ្នេរប៉ាក់ខ្លង។",
    pricingType: "FIXED",
    priceDecimal: 6000,
    imageUrl: "/images/pak-khlang/ganzberg-beer.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 0,
  },
  {
    categoryKey: "beer",
    name: "Anchor Beer",
    nameEn: "Anchor Beer",
    nameKm: "ស្រាបៀរ អាន់ឆ័រ",
    description: "Ice-cold Anchor lager served chilled on ice by the beach.",
    descriptionEn: "Ice-cold Anchor lager served chilled on ice by the beach.",
    descriptionKm: "ស្រាបៀរអាន់ឆ័រត្រជាក់ៗ ដាក់ទឹកកកជូននៅមាត់ឆ្នេរ។",
    pricingType: "FIXED",
    priceDecimal: 6000,
    imageUrl:
      "https://camhappymart.com/storage/app/public/product/1607842621OoykFGxp.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 1,
  },
  {
    categoryKey: "beer",
    name: "Angkor Beer",
    nameEn: "Angkor Beer",
    nameKm: "ស្រាបៀរ អង្គរ",
    description: "Ice-cold Angkor lager served chilled.",
    descriptionEn: "Ice-cold Angkor lager served chilled.",
    descriptionKm: "ស្រាបៀរអង្គរត្រជាក់ៗ។",
    pricingType: "FIXED",
    priceDecimal: 6000,
    imageUrl: "https://domrey.com/uploads/catalogs/8848858120028.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 2,
  },
  {
    categoryKey: "beer",
    name: "Cambodia Beer",
    nameEn: "Cambodia Beer",
    nameKm: "ស្រាបៀរ កម្ពុជា",
    description: "Crisp golden Cambodia lager served chilled.",
    descriptionEn: "Crisp golden Cambodia lager served chilled.",
    descriptionKm: "ស្រាបៀរកម្ពុជាត្រជាក់ៗ។",
    pricingType: "FIXED",
    priceDecimal: 6000,
    imageUrl:
      "https://aeoncambodia.sgp1.digitaloceanspaces.com/image/catalog/product/8847100740878.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 3,
  },

  // 8. Drink (ភេសជ្ជៈ) — 5 items
  {
    categoryKey: "drink",
    name: "Bottled Thai Iced Milk Tea",
    nameEn: "Bottled Thai Iced Milk Tea",
    nameKm: "តែក្រហមទឹកដោះគោដប",
    description: "House-brewed creamy orange Thai iced milk tea served chilled.",
    descriptionEn:
      "House-brewed creamy orange Thai iced milk tea served chilled.",
    descriptionKm: "តែក្រហមទឹកដោះគោឆុងថ្មីៗ រសជាតិឈ្ងុយឆ្ងាញ់ ដាក់ដបត្រជាក់ៗ។",
    pricingType: "FIXED",
    priceDecimal: 6000,
    imageUrl:
      "/images/pak-khlang/thai-milk-tea.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 0,
  },
  {
    categoryKey: "drink",
    name: "Cambodian Iced Milk Coffee",
    nameEn: "Cambodian Iced Milk Coffee",
    nameKm: "កាហ្វេទឹកដោះគោទឹកកក",
    description:
      "Dark roasted Mondulkiri coffee dripped slow over condensed milk and ice.",
    descriptionEn:
      "Dark roasted Mondulkiri coffee dripped slow over condensed milk and ice.",
    descriptionKm: "កាហ្វេលីងមណ្ឌលគិរីឆុងជាមួយទឹកដោះគោខាប់ និង ទឹកកក។",
    pricingType: "FIXED",
    priceDecimal: 8000,
    imageUrl: "/images/kohi-latte.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 1,
  },
  {
    categoryKey: "drink",
    name: "Fresh Young Coconut",
    nameEn: "Fresh Young Coconut",
    nameKm: "ទឹកដូងស្រស់",
    description: "Chilled whole fragrant coconut cracked to order.",
    descriptionEn: "Chilled whole fragrant coconut cracked to order.",
    descriptionKm: "ដូងក្រអូបត្រជាក់កាប់ស្រស់ៗភ្លាមៗ។",
    pricingType: "FIXED",
    priceDecimal: 8000,
    imageUrl:
      "https://rachelcooksthai.com/wp-content/uploads/2011/02/How-to-Open-a-Young-Coconut-4.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 2,
  },
  {
    categoryKey: "drink",
    name: "Coca-Cola & Chilled Soft Drinks",
    nameEn: "Coca-Cola & Chilled Soft Drinks",
    nameKm: "កូកាកូឡា និង ភេសជ្ជៈត្រជាក់",
    description: "Ice-cold Coca-Cola and assorted soft drinks served over ice.",
    descriptionEn:
      "Ice-cold Coca-Cola and assorted soft drinks served over ice.",
    descriptionKm: "កូកាកូឡា និង ភេសជ្ជៈត្រជាក់គ្រប់មុខ ដាក់ទឹកកកជូនភ្លាមៗ។",
    pricingType: "FIXED",
    priceDecimal: 4000,
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/Coca-Cola_Glas_mit_Eis.jpg/250px-Coca-Cola_Glas_mit_Eis.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 3,
  },
  {
    categoryKey: "drink",
    name: "Chilled Fresh Iced Lime Tea",
    nameEn: "Chilled Fresh Iced Lime Tea",
    nameKm: "តែក្រូចឆ្មាទឹកកក",
    description:
      "Refreshing brisk iced tea squeezed to order with fragrant green Cambodian limes over ice.",
    descriptionEn:
      "Refreshing brisk iced tea squeezed to order with fragrant green Cambodian limes over ice.",
    descriptionKm:
      "តែក្រូចឆ្មាទឹកកកឆុងថ្មីៗ ច្របាច់ក្រូចឆ្មាស្រស់ជូរផ្អែមត្រជាក់ចិត្ត។",
    pricingType: "FIXED",
    priceDecimal: 6000,
    imageUrl: "/images/pak-khlang/iced-lime-tea.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 4,
  },

  // 9. Fresh Seafood — Sold by kg (គ្រឿងសមុទ្រស្រស់ · ថ្លឹងគីឡូ) — 7 items
  {
    categoryKey: "fresh",
    name: "Live Mud Crab (Per kg)",
    nameEn: "Live Mud Crab",
    nameKm: "ក្តាមថ្មរស់ (ថ្លឹងគីឡូ)",
    description:
      "Live Koh Kong mud crab sold fresh by the kilo; free steaming, grilling, or stir-fry preparation available.",
    descriptionEn:
      "Live Koh Kong mud crab sold fresh by the kilo; steamed, grilled, or wok-fried to order.",
    descriptionKm:
      "ក្តាមថ្មរស់ស្រស់ៗពីកោះកុង លក់តាមគីឡូ — អាចជ្រើសរើសចំហុយ អាំង ឬ ឆាបានតាមចំណូលចិត្ត។",
    pricingType: "WEIGHT_BASED",
    weightUnit: "PER_KG",
    priceDecimal: 65000,
    imageUrl: "/images/pak-khlang/fresh-mud-crab-kg.jpg",
    tags: ["Live Tank", "Signature"],
    isAvailable: true,
    sortOrder: 0,
  },
  {
    categoryKey: "fresh",
    name: "Fresh Blue Swimming Crab (Per kg)",
    nameEn: "Fresh Blue Swimming Crab",
    nameKm: "ក្តាមសេះស្រស់ (ថ្លឹងគីឡូ)",
    description:
      "Live blue swimming crab sold fresh per kilo from Pak Khlang morning fishing boats.",
    descriptionEn:
      "Live blue swimming crab sold fresh per kilo from Pak Khlang morning fishing boats.",
    descriptionKm:
      "ក្តាមសេះស្រស់ៗថ្មីៗពីទូកនេសាទប៉ាក់ខ្លង លក់ថ្លឹងគីឡូជូនភ្លាមៗ។",
    pricingType: "WEIGHT_BASED",
    weightUnit: "PER_KG",
    priceDecimal: 55000,
    imageUrl: "/images/pak-khlang/fresh-blue-crab-kg.jpg",
    tags: ["Live Tank"],
    isAvailable: true,
    sortOrder: 1,
  },
  {
    categoryKey: "fresh",
    name: "Fresh Whole Squid (Per kg)",
    nameEn: "Fresh Whole Squid",
    nameKm: "មឹកបំពង់ស្រស់ (ថ្លឹងគីឡូ)",
    description:
      "Whole boat-fresh coastal squid sold by the kilo on crushed ice for charcoal grilling or steaming.",
    descriptionEn:
      "Whole boat-fresh coastal squid sold by the kilo on crushed ice for charcoal grilling or steaming.",
    descriptionKm:
      "មឹកបំពង់សមុទ្រស្រស់ៗលើទឹកកក លក់ថ្លឹងគីឡូសម្រាប់អាំង ចំហុយ ឬ ឆា។",
    pricingType: "WEIGHT_BASED",
    weightUnit: "PER_KG",
    priceDecimal: 45000,
    imageUrl: "/images/pak-khlang/fresh-squid-kg.jpg",
    tags: ["Fresh Catch"],
    isAvailable: true,
    sortOrder: 2,
  },
  {
    categoryKey: "fresh",
    name: "Fresh Baby Octopus (Per kg)",
    nameEn: "Fresh Baby Octopus",
    nameKm: "មឹកពីងពាងស្រស់ (ថ្លឹងគីឡូ)",
    description:
      "Fresh coastal baby octopus sold per kilo; tender texture ideal for charcoal grilling or Koh Kong sauce.",
    descriptionEn:
      "Fresh coastal baby octopus sold per kilo; tender texture ideal for charcoal grilling or Koh Kong sauce.",
    descriptionKm:
      "មឹកពីងពាងសមុទ្រស្រស់លក់ថ្លឹងគីឡូ សាច់ស្រួយឆ្ងាញ់សម្រាប់អាំង ឬ ស្រុះទឹកត្រីកោះកុង។",
    pricingType: "WEIGHT_BASED",
    weightUnit: "PER_KG",
    priceDecimal: 45000,
    imageUrl: "/images/pak-khlang/fresh-octopus-kg.jpg",
    tags: ["Fresh Catch"],
    isAvailable: true,
    sortOrder: 3,
  },
  {
    categoryKey: "fresh",
    name: "Fresh Blood Cockles (Per kg)",
    nameEn: "Fresh Blood Cockles",
    nameKm: "ងាវស្រស់ (ថ្លឹងគីឡូ)",
    description:
      "Fresh Koh Kong blood cockles weighed per kilo — perfect blanched rare or stir-fried with tamarind.",
    descriptionEn:
      "Fresh Koh Kong blood cockles weighed per kilo — perfect blanched rare or stir-fried with tamarind.",
    descriptionKm:
      "ងាវសមុទ្រស្រស់ថ្លឹងគីឡូ យកទៅស្រុះទឹកត្រីកោះកុង ឬ ឆាអំពិលទុំឈ្ងុយឆ្ងាញ់។",
    pricingType: "WEIGHT_BASED",
    weightUnit: "PER_KG",
    priceDecimal: 30000,
    imageUrl: "/images/pak-khlang/fresh-cockles-kg.jpg",
    tags: ["Fresh Catch"],
    isAvailable: true,
    sortOrder: 4,
  },
  {
    categoryKey: "fresh",
    name: "Fresh Spotted Babylon Snails (Per kg)",
    nameEn: "Fresh Spotted Babylon Snails",
    nameKm: "ខ្យងតុកកែស្រស់ (ថ្លឹងគីឡូ)",
    description:
      "Sweet spotted sea snails sold fresh by the kilo for charcoal grilling or steaming with lemongrass.",
    descriptionEn:
      "Sweet spotted sea snails sold fresh by the kilo for charcoal grilling or steaming with lemongrass.",
    descriptionKm:
      "ខ្យងតុកកែសមុទ្រស្រស់លក់ថ្លឹងគីឡូ សាច់ផ្អែមស្រួយសម្រាប់អាំង ឬ ស្រុះគល់ស្លឹកគ្រៃ។",
    pricingType: "WEIGHT_BASED",
    weightUnit: "PER_KG",
    priceDecimal: 40000,
    imageUrl: "/images/pak-khlang/fresh-spotted-snails-kg.jpg",
    tags: ["Fresh Catch"],
    isAvailable: true,
    sortOrder: 5,
  },
  {
    categoryKey: "fresh",
    name: "Fresh Coastal Sea Snails (Per kg)",
    nameEn: "Fresh Coastal Sea Snails",
    nameKm: "ខ្យងសមុទ្រស្រស់ (ថ្លឹងគីឡូ)",
    description:
      "Wild-caught Pak Khlang sea snails weighed straight off the boat by the kilo.",
    descriptionEn:
      "Wild-caught Pak Khlang sea snails weighed straight off the boat by the kilo.",
    descriptionKm:
      "ខ្យងសមុទ្រស្រស់ៗនេសាទថ្មីៗពីឆ្នេរប៉ាក់ខ្លង លក់ថ្លឹងគីឡូផ្ទាល់។",
    pricingType: "WEIGHT_BASED",
    weightUnit: "PER_KG",
    priceDecimal: 35000,
    imageUrl: "/images/pak-khlang/fresh-snails-market-kg.jpg",
    tags: ["Fresh Catch"],
    isAvailable: true,
    sortOrder: 6,
  },
];

export const KEP_DEMO_ITEMS: SeedMenuItemSpec[] = [
  {
    categoryKey: "seafood",
    name: "Coastal Fish Sour Herb Soup",
    nameEn: "Coastal Fish Sour Herb Soup",
    nameKm: "សម្លម្ជូរគ្រឿងត្រីសមុទ្រ",
    description:
      "Fragrant Khmer kroeung broth simmered with reef fish, tamarind leaves, and herbs.",
    descriptionEn:
      "Fragrant Khmer kroeung broth simmered with reef fish, tamarind leaves, and herbs.",
    descriptionKm:
      "សម្លម្ជូរគ្រឿងត្រីសមុទ្រស្រស់ ដាក់ស្លឹកអំពិលខ្ចី ព្រលិត និង ជីរណាឈ្ងុយ។",
    pricingType: "FIXED",
    priceDecimal: 35000,
    imageUrl:
      "https://www.wokandkin.com/wp-content/uploads/2021/05/Steamed-Fish-with-Ginger-and-Shallots-saved-for-web-1200px.png",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 0,
  },
  {
    categoryKey: "seafood",
    name: "Grilled Sea Snails",
    nameEn: "Grilled Sea Snails",
    nameKm: "ខ្យងហូលអាំង",
    description:
      "Wild coastal sea snails grilled in shell with green pepper and scallion oil.",
    descriptionEn:
      "Wild coastal sea snails grilled in shell with green pepper and scallion oil.",
    descriptionKm:
      "ខ្យងហូលសមុទ្រអាំងជាមួយប្រេងស្លឹកខ្ទឹម និង ម្រេចខ្ចី។",
    pricingType: "FIXED",
    priceDecimal: 25000,
    imageUrl:
      "https://i0.wp.com/thegoodlifefrance.com/wp-content/uploads/2019/11/snails-cooked-in-garlic-butter.jpg",
    tags: [],
    isAvailable: false,
    sortOrder: 1,
  },
  {
    categoryKey: "crab",
    name: "Kep Blue Swimmer Crab with Green Pepper",
    nameEn: "Kep Blue Swimmer Crab with Green Pepper",
    nameKm: "ក្តាមសេះឆាម្រេចខ្ចី",
    description:
      "Morning-caught Kep blue swimmer crab flash-fried with green Kampot peppercorns.",
    descriptionEn:
      "Morning-caught Kep blue swimmer crab flash-fried with green Kampot peppercorns.",
    descriptionKm:
      "ក្តាមសេះស្រស់ចាប់នៅពេលព្រឹក ឆាជាមួយម្រេចខ្ចីស្រស់ពីចម្ការកំពត។",
    pricingType: "FIXED",
    priceDecimal: 40000,
    imageUrl: "/images/kampot-pepper-crab.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 0,
  },
  {
    categoryKey: "shrimp",
    name: "Charcoal-Grilled Tiger Prawns",
    nameEn: "Charcoal-Grilled Tiger Prawns",
    nameKm: "បង្គាខ្លាអាំងធ្យូង",
    description:
      "Sea-caught tiger prawns grilled over coconut husks with spicy Kampot lime dip.",
    descriptionEn:
      "Sea-caught tiger prawns grilled over coconut husks with spicy Kampot lime dip.",
    descriptionKm:
      "បង្គាខ្លាសមុទ្រអាំងធ្យូងត្រឡោកដូង ញ៉ាំជាមួយទឹកត្រីកោះកុងហឹរឆ្ងាញ់។",
    pricingType: "FIXED",
    priceDecimal: 40000,
    imageUrl: "/images/grilled-river-prawns.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 0,
  },
  {
    categoryKey: "squid",
    name: "Charcoal-Grilled Baby Squid",
    nameEn: "Charcoal-Grilled Baby Squid",
    nameKm: "មឹកអាំងទឹកត្រីកោះកុង",
    description:
      "Whole tender baby squid brushed with fish sauce and grilled over charcoal.",
    descriptionEn:
      "Whole tender baby squid brushed with fish sauce and grilled over charcoal.",
    descriptionKm:
      "មឹកកូនស្រស់លាបទឹកត្រីអាំងធ្យូង ញ៉ាំជាមួយទឹកត្រីកោះកុងហឹរឆ្ងាញ់។",
    pricingType: "FIXED",
    priceDecimal: 35000,
    imageUrl:
      "https://images.squarespace-cdn.com/content/v1/5e9483a9bb182a1caddc2e21/1600936560729-WHHCQH5671Z389Q9560P/D8E8859F-946D-4A07-B4F4-BC7709C1066E.jpeg",
    tags: [],
    isAvailable: true,
    sortOrder: 0,
  },
  {
    categoryKey: "rice",
    name: "Kep Crab Fried Rice",
    nameEn: "Kep Crab Fried Rice",
    nameKm: "បាយឆាក្តាមកែប",
    description:
      "Hand-picked sweet crab meat tossed with jasmine rice, egg, and Kampot pepper.",
    descriptionEn:
      "Hand-picked sweet crab meat tossed with jasmine rice, egg, and Kampot pepper.",
    descriptionKm:
      "បាយឆាសាច់ក្តាមកែបផ្អែម ជាមួយពងមាន់ និង ម្រេចកំពតឈ្ងុយ។",
    pricingType: "FIXED",
    priceDecimal: 25000,
    imageUrl: "https://www.yummymedley.com/wp-content/uploads/2017/05/seafood-fried-rice.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 0,
  },
  {
    categoryKey: "beer",
    name: "Angkor Beer",
    nameEn: "Angkor Beer",
    nameKm: "ស្រាបៀរ អង្គរ",
    description: "Chilled Angkor beer by the bottle or can.",
    descriptionEn: "Chilled Angkor beer by the bottle or can.",
    descriptionKm: "ស្រាបៀរអង្គរត្រជាក់ៗ។",
    pricingType: "FIXED",
    priceDecimal: 6000,
    imageUrl: "https://domrey.com/uploads/catalogs/8848858120028.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 0,
  },
  {
    categoryKey: "drink",
    name: "Cambodian Iced Milk Coffee",
    nameEn: "Cambodian Iced Milk Coffee",
    nameKm: "កាហ្វេទឹកដោះគោទឹកកក",
    description:
      "Dark roasted Mondulkiri coffee dripped slow over condensed milk and crushed ice.",
    descriptionEn:
      "Dark roasted Mondulkiri coffee dripped slow over condensed milk and crushed ice.",
    descriptionKm:
      "កាហ្វេលីងមណ្ឌលគិរីឆុងជាមួយទឹកដោះគោខាប់ និង ទឹកកកឈូស។",
    pricingType: "FIXED",
    priceDecimal: 8000,
    imageUrl: "/images/kohi-latte.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 0,
  },
  {
    categoryKey: "drink",
    name: "Chilled Fresh Palm Juice",
    nameEn: "Chilled Fresh Palm Juice",
    nameKm: "ទឹកត្នោតស្រស់ត្រជាក់",
    description: "Naturally sweet morning-tapped sugar palm juice served over ice.",
    descriptionEn: "Naturally sweet morning-tapped sugar palm juice served over ice.",
    descriptionKm: "ទឹកត្នោតផ្អែមធម្មជាតិដងពេលព្រឹក ដាក់ទឹកកកត្រជាក់។",
    pricingType: "FIXED",
    priceDecimal: 6000,
    imageUrl:
      "https://rachelcooksthai.com/wp-content/uploads/2011/02/How-to-Open-a-Young-Coconut-4.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 1,
  },
];

const LEGACY_DEMO_ITEM_NAMES = new Set<string>([
  ...SORA_DEMO_ITEMS.map((item) => item.nameEn),
  ...KEP_DEMO_ITEMS.map((item) => item.nameEn),
  "Blanched Blood Cockles",
  "Iced Honey Lime Tea",
  "Live Coastal Tiger Prawns",
]);

const inFlightSyncs = new Map<string, Promise<FirestoreTenantDoc>>();

/**
 * Seeds or upgrades a tenant's categories & demo items to the 7 default categories
 * (Seafood, Crab, Shrimp, Squid, Rice, Beer, Drink) and KHR pricing (25,000៛ / 35,000៛ / 40,000៛).
 * Preserves any custom user-created items by re-attaching them to the closest default category.
 * Uses an in-process lock and deterministic IDs so concurrent callers cannot duplicate docs.
 */
export async function syncTenantDefaultCatalog(
  tenantId: string,
  tenant: FirestoreTenantDoc,
  options: { preserveCustomItems?: boolean } = { preserveCustomItems: true }
): Promise<FirestoreTenantDoc> {
  const existing = inFlightSyncs.get(tenantId);
  if (existing) {
    return existing;
  }

  const run = runSyncTenantDefaultCatalog(tenantId, tenant, options).finally(() => {
    inFlightSyncs.delete(tenantId);
  });
  inFlightSyncs.set(tenantId, run);
  return run;
}

async function runSyncTenantDefaultCatalog(
  tenantId: string,
  tenant: FirestoreTenantDoc,
  options: { preserveCustomItems?: boolean }
): Promise<FirestoreTenantDoc> {
  const isSora = isPakKhlangVenue(tenant);
  const isKep = tenant.slug === "kep-bay-kitchen";
  const demoItems = isKep ? KEP_DEMO_ITEMS : SORA_DEMO_ITEMS;

  const [freshTenantSnap, existingCatsSnap, existingItemsSnap] = await Promise.all([
    tenantDoc(tenantId).get(),
    categoriesCol(tenantId).get(),
    menuItemsCol(tenantId).get(),
  ]);

  const currentTenant = freshTenantSnap.exists ? freshTenantSnap.data()! : tenant;
  const freshMeta =
    currentTenant.metaJson &&
    typeof currentTenant.metaJson === "object" &&
    !Array.isArray(currentTenant.metaJson)
      ? (currentTenant.metaJson as Record<string, unknown>)
      : {};

  if (
    options.preserveCustomItems !== false &&
    freshMeta.demoCatalogVersion === DEMO_CATALOG_VERSION &&
    existingCatsSnap.size <= DEFAULT_MENU_CATEGORIES.length &&
    existingItemsSnap.size >= demoItems.length &&
    existingItemsSnap.size <= demoItems.length + 10
  ) {
    return currentTenant;
  }

  const oldCatNameById = new Map<string, { nameEn: string; nameKm: string }>();
  for (const doc of existingCatsSnap.docs) {
    const d = doc.data();
    oldCatNameById.set(doc.id, {
      nameEn: (d.nameEn || d.name || "").toLowerCase(),
      nameKm: d.nameKm || "",
    });
  }

  const customItemsToKeep = options.preserveCustomItems
    ? existingItemsSnap.docs
        .map((d) => ({ id: d.id, data: d.data() }))
        .filter(
          ({ data: item }) =>
            !LEGACY_DEMO_ITEM_NAMES.has(item.nameEn || item.name) &&
            !LEGACY_DEMO_ITEM_NAMES.has(item.name)
        )
    : [];

  const targetCatIds = new Set<string>(
    DEFAULT_MENU_CATEGORIES.map((cat) => `default-cat-${cat.key}`)
  );
  const targetItemIds = new Set<string>(
    isSora || isKep
      ? demoItems.map(
          (item, idx) =>
            `default-item-${String(idx).padStart(2, "0")}-${item.categoryKey}`
        )
      : []
  );
  for (const custom of customItemsToKeep) {
    targetItemIds.add(custom.id);
  }

  const ops: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];

  for (const doc of existingItemsSnap.docs) {
    if (!targetItemIds.has(doc.id)) {
      ops.push((b) => b.delete(doc.ref));
    }
  }
  for (const doc of existingCatsSnap.docs) {
    if (!targetCatIds.has(doc.id)) {
      ops.push((b) => b.delete(doc.ref));
    }
  }

  const now = new Date();
  const catIdByKey = new Map<DefaultCategoryKey, string>();

  DEFAULT_MENU_CATEGORIES.forEach((cat, idx) => {
    const id = `default-cat-${cat.key}`;
    const ref = categoriesCol(tenantId).doc(id);
    catIdByKey.set(cat.key, id);
    ops.push((b) =>
      b.set(ref, {
        tenantId,
        name: cat.nameEn,
        nameEn: cat.nameEn,
        nameKm: cat.nameKm,
        sortOrder: idx,
        isVisible: true,
        pricingMode: cat.key === "fresh" ? "WEIGHT_BASED" : "FIXED",
        createdAt: now,
        updatedAt: now,
      })
    );
  });

  if (isSora || isKep) {
    demoItems.forEach((item, idx) => {
      const categoryId = catIdByKey.get(item.categoryKey)!;
      const id = `default-item-${String(idx).padStart(2, "0")}-${item.categoryKey}`;
      const ref = menuItemsCol(tenantId).doc(id);
      ops.push((b) =>
        b.set(ref, {
          tenantId,
          categoryId,
          name: item.name,
          nameEn: item.nameEn,
          nameKm: item.nameKm,
          description: item.description,
          descriptionEn: item.descriptionEn,
          descriptionKm: item.descriptionKm,
          pricingType: item.pricingType,
          weightUnit:
            item.weightUnit ??
            (item.pricingType === "WEIGHT_BASED" ? "PER_KG" : null),
          priceDecimal: item.priceDecimal,
          marketPriceMin: null,
          marketPriceMax: null,
          variantsJson: null,
          cookingStylesJson: null,
          imageUrl: item.imageUrl,
          tags: item.tags,
          isAvailable: item.isAvailable,
          sortOrder: item.sortOrder,
          createdAt: now,
          updatedAt: now,
        })
      );
    });
  }

  // Re-attach any custom items the user manually added
  customItemsToKeep.forEach(({ id, data: custom }, idx) => {
    const oldCat = oldCatNameById.get(custom.categoryId);
    let targetKey: DefaultCategoryKey = "seafood";
    const hint = `${oldCat?.nameEn ?? ""} ${oldCat?.nameKm ?? ""}`.toLowerCase();
    if (hint.includes("fresh") || hint.includes("គ្រឿងសមុទ្រស្រស់") || hint.includes("ថ្លឹងគីឡូ"))
      targetKey = "fresh";
    else if (hint.includes("crab") || hint.includes("ក្តាម")) targetKey = "crab";
    else if (hint.includes("shrimp") || hint.includes("prawn") || hint.includes("បង្គា") || hint.includes("បង្កង"))
      targetKey = "shrimp";
    else if (hint.includes("squid") || hint.includes("មឹក")) targetKey = "squid";
    else if (hint.includes("meat") || hint.includes("salad") || hint.includes("សាច់") || hint.includes("ញាំ"))
      targetKey = "meat";
    else if (hint.includes("rice") || hint.includes("noodle") || hint.includes("បាយ") || hint.includes("មី"))
      targetKey = "rice";
    else if (hint.includes("beer") || hint.includes("ស្រាបៀរ")) targetKey = "beer";
    else if (hint.includes("drink") || hint.includes("ភេសជ្ជៈ")) targetKey = "drink";

    const categoryId = catIdByKey.get(targetKey)!;
    const ref = menuItemsCol(tenantId).doc(id);
    // If custom item had a small USD price (< 200) and we're upgrading tenant to KHR, convert it cleanly
    const migratedPrice =
      currentTenant.currency === "USD" && custom.priceDecimal > 0 && custom.priceDecimal < 250
        ? Math.round((custom.priceDecimal * 4100) / 100) * 100
        : custom.priceDecimal;

    ops.push((b) =>
      b.set(ref, {
        ...custom,
        tenantId,
        categoryId,
        priceDecimal: migratedPrice,
        sortOrder: 20 + idx,
        updatedAt: now,
      })
    );
  });

  const existingMeta =
    currentTenant.metaJson &&
    typeof currentTenant.metaJson === "object" &&
    !Array.isArray(currentTenant.metaJson)
      ? (currentTenant.metaJson as Record<string, unknown>)
      : {};

  const nextMeta = {
    ...(isSora ? PAK_KHLANG_168_PROFILE.metaJson : {}),
    ...existingMeta,
    demoCatalogVersion: DEMO_CATALOG_VERSION,
  };

  const tenantUpdates = {
    ...(isSora
      ? {
          name: currentTenant.nameKm ? currentTenant.name : PAK_KHLANG_168_PROFILE.name,
          nameEn: currentTenant.nameKm
            ? currentTenant.nameEn ?? currentTenant.name
            : PAK_KHLANG_168_PROFILE.nameEn,
          nameKm: currentTenant.nameKm ? currentTenant.nameKm : PAK_KHLANG_168_PROFILE.nameKm,
          coverUrl: currentTenant.coverUrl || PAK_KHLANG_168_PROFILE.coverUrl,
        }
      : {}),
    currency: "KHR",
    showDualCurrency: false,
    exchangeRate: 4100,
    khrRounding: 100,
    metaJson: nextMeta,
    updatedAt: now,
  };

  ops.push((b) => b.update(tenantDoc(tenantId), tenantUpdates));
  if (currentTenant.slug) {
    const normalizedSlug = currentTenant.slug.trim().toLowerCase();
    ops.push((b) =>
      b.set(tenantSlugsCol().doc(normalizedSlug), {
        tenantId,
        slug: normalizedSlug,
        updatedAt: now,
      })
    );
  }
  await commitBatchedWrites(ops);

  return {
    ...currentTenant,
    ...tenantUpdates,
  };
}
