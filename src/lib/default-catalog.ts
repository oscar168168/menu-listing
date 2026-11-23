import {
  categoriesCol,
  commitBatchedWrites,
  menuItemsCol,
  tenantDoc,
  type FirestoreTenantDoc,
} from "@/lib/firestore";
import { DEFAULT_MENU_CATEGORIES } from "@/lib/i18n";
import type { PricingType } from "@/types/menu";

export const DEMO_CATALOG_VERSION = "v3-khr-7cats-images";

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
  // 1. Seafood (គ្រឿងសមុទ្រ)
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
    sortOrder: 0,
  },
  {
    categoryKey: "seafood",
    name: "Blanched Blood Cockles",
    nameEn: "Blanched Blood Cockles",
    nameKm: "ងាវស្រុះទឹកអំពិលទុំ",
    description:
      "Quick-blanched coastal blood cockles served with roasted peanut tamarind dip.",
    descriptionEn:
      "Quick-blanched coastal blood cockles served with roasted peanut tamarind dip.",
    descriptionKm:
      "ងាវស្រស់ស្រុះល្មម ញ៉ាំផ្ទាប់ជាមួយទឹកអំពិលទុំសណ្តែកដីលីង។",
    pricingType: "FIXED",
    priceDecimal: 25000,
    imageUrl:
      "https://cdn.i-scmp.com/sites/default/files/styles/square/public/d8/images/2019/09/18/scmp_02aug17_fe_foodshoot2550_jonw4348_new_.jpg?itok=fvGPCN8I",
    tags: [],
    isAvailable: true,
    sortOrder: 1,
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
    sortOrder: 2,
  },

  // 2. Crab (ក្តាម)
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
    imageUrl: "/images/kampot-pepper-crab.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 0,
  },
  {
    categoryKey: "crab",
    name: "Steamed Blue Crab with Lemongrass",
    nameEn: "Steamed Blue Crab with Lemongrass",
    nameKm: "ក្តាមសេះចំហុយគល់ស្លឹកគ្រៃ",
    description:
      "Sweet Kep blue swimmer crab steamed with crushed lemongrass and kaffir lime leaves.",
    descriptionEn:
      "Sweet Kep blue swimmer crab steamed with crushed lemongrass and kaffir lime leaves.",
    descriptionKm:
      "ក្តាមសេះស្រស់ចំហុយជាមួយគល់ស្លឹកគ្រៃ និង ស្លឹកក្រូចសើចឈ្ងុយឆ្ងាញ់។",
    pricingType: "FIXED",
    priceDecimal: 35000,
    imageUrl: "https://vuacuacamau.vn/images/posts/steamed-blue-swimmer-crab.webp",
    tags: [],
    isAvailable: true,
    sortOrder: 1,
  },

  // 3. Shrimp (បង្គា និង បង្កង)
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
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f6/SpicyRawShrimpSalad.jpg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 1,
  },
  {
    categoryKey: "shrimp",
    name: "Garlic Fried Sea Shrimp",
    nameEn: "Garlic Fried Sea Shrimp",
    nameKm: "បង្គាបំពងខ្ទឹមស",
    description:
      "Crispy sea shrimp wok-tossed with golden fried garlic and Kampot white pepper.",
    descriptionEn:
      "Crispy sea shrimp wok-tossed with golden fried garlic and Kampot white pepper.",
    descriptionKm:
      "បង្គាសមុទ្របំពងស្រួយលីងជាមួយខ្ទឹមសបំពង និង ម្រេចសកំពត។",
    pricingType: "FIXED",
    priceDecimal: 25000,
    imageUrl:
      "https://www.seriouseats.com/thmb/eYqPkgaqMxxA5vKYb-807q5DbiI=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/__opt__aboutcom__coeus__resources__content_migration__serious_eats__seriouseats.com__recipes__images__2012__07__20120717-chichi-shrimp-c765d1ceb15d4125b8220cc6953219bd.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 2,
  },

  // 4. Squid (មឹក)
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
      "https://images.squarespace-cdn.com/content/v1/5e9483a9bb182a1caddc2e21/1600936560729-WHHCQH5671Z389Q9560P/D8E8859F-946D-4A07-B4F4-BC7709C1066E.jpeg",
    tags: ["Signature"],
    isAvailable: true,
    sortOrder: 0,
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
    sortOrder: 1,
  },

  // 5. Rice (បាយ និង មី)
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
    imageUrl: "https://www.yummymedley.com/wp-content/uploads/2017/05/seafood-fried-rice.jpg",
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
    imageUrl: "https://carryitlikeharry.com/wp-content/uploads/2017/07/DSCF0492.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 1,
  },

  // 6. Beer (ស្រាបៀរ)
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
    sortOrder: 0,
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
    sortOrder: 1,
  },

  // 7. Drink (ភេសជ្ជៈ)
  {
    categoryKey: "drink",
    name: "Cambodian Iced Milk Coffee",
    nameEn: "Cambodian Iced Milk Coffee",
    nameKm: "កាហ្វេទឹកដោះគោទឹកកក",
    description:
      "Dark roasted Mondulkiri coffee dripped slow over condensed milk and ice.",
    descriptionEn:
      "Dark roasted Mondulkiri coffee dripped slow over condensed milk and ice.",
    descriptionKm:
      "កាហ្វេលីងមណ្ឌលគិរីឆុងជាមួយទឹកដោះគោខាប់ និង ទឹកកក។",
    pricingType: "FIXED",
    priceDecimal: 8000,
    imageUrl: "/images/kohi-latte.jpg",
    tags: [],
    isAvailable: true,
    sortOrder: 0,
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
    sortOrder: 1,
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
  const isSora = tenant.slug === "sora-seafood-grill";
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

  const nextMeta = {
    ...(tenant.metaJson && typeof tenant.metaJson === "object"
      ? tenant.metaJson
      : {}),
    demoCatalogVersion: DEMO_CATALOG_VERSION,
  };

  const tenantUpdates = {
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
