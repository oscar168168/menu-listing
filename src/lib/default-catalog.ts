import {
  categoriesCol,
  commitBatchedWrites,
  menuItemsCol,
  tenantDoc,
  type FirestoreTenantDoc,
} from "@/lib/firestore";
import { DEFAULT_MENU_CATEGORIES } from "@/lib/i18n";
import type { PricingType } from "@/types/menu";

export const DEMO_CATALOG_VERSION = "v5-pak-khlang-168-full-menu";

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
      "https://m1.quebecormedia.com/emp/emp/005ce5d3-9363-41f7-8ab2-b7c6c5dd46dd_ORIGINAL.jpg",
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
      "https://cdn.i-scmp.com/sites/default/files/styles/square/public/d8/images/2019/09/18/scmp_02aug17_fe_foodshoot2550_jonw4348_new_.jpg?itok=fvGPCN8I",
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
      "https://i0.wp.com/thegoodlifefrance.com/wp-content/uploads/2019/11/snails-cooked-in-garlic-butter.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 6,
  },
  {
    categoryKey: "seafood",
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
    sortOrder: 7,
  },

  // 2. Crab (ក្តាម) — 4 items
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
      "https://lh3.googleusercontent.com/gps-cs-s/ANWiy9Tj7CsaqNHAyG1Exoj5GYLruR130geWwZoFOFCoKV5CDx_k-j9cowZXm3xJgsurirp1meY1WCzvNYFyGITshKNdwcTf8Xh3veSkQDnSc37OcIUN8USUFFZTEyjX4oA6vlPBStB93g=w400-h400-n-k-no",
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
      "https://lh3.googleusercontent.com/gps-cs-s/ANWiy9SIS9-oidQ8IifsJaJ4T_5OTCQ0SVBSrIHQtAH17KdX1CJs__hzRMnbdhk4IBI7FujkUOwtdySn1AEOZYtJLnDndFqScHFvKxeKSU4nQtPjAJH60NMcBqJIneH8MKhuFMNh_6QR=w400-h400-n-k-no",
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
      "https://vuacuacamau.vn/images/posts/steamed-blue-swimmer-crab.webp",
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
      "https://lh3.googleusercontent.com/gps-cs-s/ANWiy9Rl4piUV549SuFvTVbyAfOZR6nKHdUIznnBRpeUbQLK53DBaaJM-frYxFrh53O7PW9dhK95pKSHyhy48I8t8OcrkgunLPAjX0M96Eag9zV9GcPDM4mN5IT1q7O9R1LToWx0zrXf=w400-h400-n-k-no",
    tags: [],
    isAvailable: true,
    sortOrder: 3,
  },

  // 3. Shrimp (បង្គា និង បង្កង) — 5 items
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
      "https://lh3.googleusercontent.com/gps-cs-s/ANWiy9Q0BlzMx1b336rOR3iH3g9YV4z4JM7NXZIztvAnGBtP-DyzORKNQOXvDUk7jccFyOd8IWj9yc73GK72tL9ckRAs1zehVC2JAGwtUoEQSYAgX18dmlhdT7Kcxk17Mx_HtXpWK7vm=w400-h400-n-k-no",
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
      "https://lh3.googleusercontent.com/gps-cs-s/ANWiy9TvSg_MCV244cZIPJQ4m4f6K2aq4eC6-SpoRuF8iK-jg7ghzxRVnFLrXHB6yt0UHDkilNFhIlj8aTSCJ6Bp9_mQqd24bEPEvEKeaGMv7531SsAz-mHnPqJtnUQkSNhgA_DsNB1q-Q=w400-h400-n-k-no",
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
      "https://oursamui.com/wp-content/uploads/2026/03/Goong-Chae-Nam-Pla.jpeg",
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
      "https://lh3.googleusercontent.com/gps-cs-s/ANWiy9SLAv9b8zXmqtWQUN-6tumftddOIAUdSsx6Mtlc1Berg3whYwU_iARBg4UjW1_javBpmqSNgqdncP3l24esJfCrhn_kWA-xycE7aTxh8_hHs4pyKfeEyem_D_KHFZbLXqhsoRRJ=w400-h400-n-k-no",
    tags: [],
    isAvailable: true,
    sortOrder: 4,
  },

  // 4. Squid (មឹក) — 4 items
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
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/DFC_6124_Grilled_whole_squid_skewers_sizzling_over_hot_coals_with_smoky_char_and_golden_glaze_ready_to_eat.jpg/330px-DFC_6124_Grilled_whole_squid_skewers_sizzling_over_hot_coals_with_smoky_char_and_golden_glaze_ready_to_eat.jpg",
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
      "https://images.squarespace-cdn.com/content/v1/5e9483a9bb182a1caddc2e21/1600936560729-WHHCQH5671Z389Q9560P/D8E8859F-946D-4A07-B4F4-BC7709C1066E.jpeg",
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
      "https://grantourismotravels.com/wp-content/uploads/2020/08/Squid-Green-Peppercorns-Recipe-Cambodia-Kampot-Pepper-Stir-Fry-Copyright-2020-Terence-Carter-Grantourismo.jpg",
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
      "https://api.photon.aremedia.net.au/wp-content/uploads/sites/11/food/2015/09/16/27172/C148F552-Da37fd1-ThaiMangoSquidSalad-RMAFAD-27-(1).jpg?fit=2048%2C1536&format=auto",
    tags: [],
    isAvailable: true,
    sortOrder: 3,
  },

  // 5. Rice (បាយ និង មី) — 2 items
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
      "https://carryitlikeharry.com/wp-content/uploads/2017/07/DSCF0492.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 1,
  },

  // 6. Beer (ស្រាបៀរ) — 3 items
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
    sortOrder: 0,
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
    sortOrder: 1,
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
    sortOrder: 2,
  },

  // 7. Drink (ភេសជ្ជៈ) — 4 items
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
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Thai_Red_Ice_Milk_Tea_-_Siam_Siam_2024-07-31.jpg/250px-Thai_Red_Ice_Milk_Tea_-_Siam_Siam_2024-07-31.jpg",
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
  "Kampot Pepper Crab",
  "Grilled Giant River Prawns",
  "Steamed Grouper with Soy & Ginger",
  "Blanched Blood Cockles",
  "Koh Kong Raw Shrimp",
  "Green Mango & Squid Salad",
  "Seafood Fried Rice",
  "Claypot Crab Glass Noodles",
  "Fresh Young Coconut",
  "Iced Honey Lime Tea",
  "Cambodian Iced Milk Coffee",
  "Kep Blue Swimmer Crab with Green Pepper",
  "Charcoal-Grilled Tiger Prawns",
  "Charcoal-Grilled Baby Squid",
  "Live Coastal Tiger Prawns",
  "Grilled Sea Snails",
  "Coastal Fish Sour Herb Soup",
  "Kep Crab Fried Rice",
  "Chilled Fresh Palm Juice",
  "Steamed Blue Crab with Lemongrass",
  "Garlic Fried Sea Shrimp",
  "Charcoal-Grilled Squid",
  "Angkor Beer",
  "Cambodia Beer",
  "Steamed Fish with Lime & Chili",
  "Charcoal Seafood Hotpot",
  "Tom Yum Seafood Soup",
  "Fresh Coastal Oysters with Herbs",
  "Stir-Fried Blood Cockles with Tamarind",
  "Charcoal BBQ Skewers",
  "Steamed Fresh Mud Crab",
  "Marinated Raw Blue Swimming Crab",
  "Charcoal-Grilled King Prawns",
  "Stir-Fried Shrimp with Garlic & Scallions",
  "Steamed Squid with Koh Kong Sauce",
  "Stir-Fried Squid with Green Peppercorn",
  "Anchor Beer",
  "Bottled Thai Iced Milk Tea",
  "Coca-Cola & Chilled Soft Drinks",
]);

/**
 * Seeds or upgrades a tenant's categories & demo items to the 7 default categories
 * (Seafood, Crab, Shrimp, Squid, Rice, Beer, Drink) and KHR pricing (25,000៛ / 35,000៛ / 40,000៛).
 * Preserves any custom user-created items by re-attaching them to the closest default category.
 */
export async function syncTenantDefaultCatalog(
  tenantId: string,
  tenant: FirestoreTenantDoc,
  options: { preserveCustomItems?: boolean } = { preserveCustomItems: true }
): Promise<FirestoreTenantDoc> {
  const isSora = isPakKhlangVenue(tenant);
  const isKep = tenant.slug === "kep-bay-kitchen";
  const demoItems = isKep ? KEP_DEMO_ITEMS : SORA_DEMO_ITEMS;

  const [existingCatsSnap, existingItemsSnap] = await Promise.all([
    categoriesCol(tenantId).get(),
    menuItemsCol(tenantId).get(),
  ]);

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
        .map((d) => d.data())
        .filter(
          (item) =>
            !LEGACY_DEMO_ITEM_NAMES.has(item.nameEn || item.name) &&
            !LEGACY_DEMO_ITEM_NAMES.has(item.name)
        )
    : [];

  const ops: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];

  for (const doc of existingItemsSnap.docs) {
    ops.push((b) => b.delete(doc.ref));
  }
  for (const doc of existingCatsSnap.docs) {
    ops.push((b) => b.delete(doc.ref));
  }

  const now = new Date();
  const catIdByKey = new Map<DefaultCategoryKey, string>();

  DEFAULT_MENU_CATEGORIES.forEach((cat, idx) => {
    const ref = categoriesCol(tenantId).doc();
    catIdByKey.set(cat.key, ref.id);
    ops.push((b) =>
      b.set(ref, {
        tenantId,
        name: cat.nameEn,
        nameEn: cat.nameEn,
        nameKm: cat.nameKm,
        sortOrder: idx,
        isVisible: true,
        createdAt: now,
        updatedAt: now,
      })
    );
  });

  if (isSora || isKep) {
    for (const item of demoItems) {
      const categoryId = catIdByKey.get(item.categoryKey)!;
      const ref = menuItemsCol(tenantId).doc();
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
          weightUnit: null,
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
    }
  }

  // Re-attach any custom items the user manually added
  customItemsToKeep.forEach((custom, idx) => {
    const oldCat = oldCatNameById.get(custom.categoryId);
    let targetKey: DefaultCategoryKey = "seafood";
    const hint = `${oldCat?.nameEn ?? ""} ${oldCat?.nameKm ?? ""}`;
    if (hint.includes("crab") || hint.includes("ក្តាម")) targetKey = "crab";
    else if (hint.includes("shrimp") || hint.includes("prawn") || hint.includes("បង្គា") || hint.includes("បង្កង"))
      targetKey = "shrimp";
    else if (hint.includes("squid") || hint.includes("មឹក")) targetKey = "squid";
    else if (hint.includes("rice") || hint.includes("noodle") || hint.includes("បាយ") || hint.includes("មី"))
      targetKey = "rice";
    else if (hint.includes("beer") || hint.includes("ស្រាបៀរ")) targetKey = "beer";
    else if (hint.includes("drink") || hint.includes("ភេសជ្ជៈ")) targetKey = "drink";

    const categoryId = catIdByKey.get(targetKey)!;
    const ref = menuItemsCol(tenantId).doc();
    // If custom item had a small USD price (< 200) and we're upgrading tenant to KHR, convert it cleanly
    const migratedPrice =
      tenant.currency === "USD" && custom.priceDecimal > 0 && custom.priceDecimal < 250
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
    tenant.metaJson &&
    typeof tenant.metaJson === "object" &&
    !Array.isArray(tenant.metaJson)
      ? (tenant.metaJson as Record<string, unknown>)
      : {};

  const nextMeta = {
    ...(isSora ? PAK_KHLANG_168_PROFILE.metaJson : {}),
    ...existingMeta,
    demoCatalogVersion: DEMO_CATALOG_VERSION,
  };

  const tenantUpdates = {
    ...(isSora
      ? {
          name: tenant.nameKm ? tenant.name : PAK_KHLANG_168_PROFILE.name,
          nameEn: tenant.nameKm
            ? tenant.nameEn ?? tenant.name
            : PAK_KHLANG_168_PROFILE.nameEn,
          nameKm: tenant.nameKm ? tenant.nameKm : PAK_KHLANG_168_PROFILE.nameKm,
          coverUrl: tenant.coverUrl || PAK_KHLANG_168_PROFILE.coverUrl,
        }
      : {}),
    currency: "KHR",
    showDualCurrency: true,
    exchangeRate: 4100,
    khrRounding: 100,
    metaJson: nextMeta,
    updatedAt: now,
  };

  ops.push((b) => b.update(tenantDoc(tenantId), tenantUpdates));
  await commitBatchedWrites(ops);

  return {
    ...tenant,
    ...tenantUpdates,
  };
}
