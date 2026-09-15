import type { QuotationTemplateDefinition } from "@/lib/quotation-templates/types";

const uaeStandardFloors = [
  { floor: 0, name: "Ground Floor", ratePerSqFt: 180 },
  { floor: 1, name: "First Floor", ratePerSqFt: 190 },
  { floor: 2, name: "Second Floor", ratePerSqFt: 200 },
  { floor: 3, name: "Third Floor", ratePerSqFt: 210 },
];

const uaePremiumFloors = [
  { floor: 0, name: "Ground Floor", ratePerSqFt: 230 },
  { floor: 1, name: "First Floor", ratePerSqFt: 240 },
  { floor: 2, name: "Second Floor", ratePerSqFt: 250 },
  { floor: 3, name: "Third Floor", ratePerSqFt: 260 },
];

const uaeLuxuryFloors = [
  { floor: 0, name: "Ground Floor", ratePerSqFt: 300 },
  { floor: 1, name: "First Floor", ratePerSqFt: 310 },
  { floor: 2, name: "Second Floor", ratePerSqFt: 320 },
  { floor: 3, name: "Third Floor", ratePerSqFt: 330 },
];

export const uaeResidentialStandard: QuotationTemplateDefinition = {
  id: "builtin:ae-residential-standard",
  name: "Residential Construction – Standard",
  description:
    "Illustrative UAE residential estimate with editable floor, material, and labour rates.",
  countryCode: "AE",
  currencyCode: "AED",
  projectType: "residential",
  referenceAreaSqFt: 1000,
  defaultQualityId: "standard",
  qualityLevels: [
    {
      id: "standard",
      label: "Standard",
      floorRates: uaeStandardFloors,
    },
    {
      id: "premium",
      label: "Premium",
      floorRates: uaePremiumFloors,
    },
    {
      id: "luxury",
      label: "Luxury",
      floorRates: uaeLuxuryFloors,
    },
  ],
  materials: [
    { id: "ae-m-cement", name: "Cement", category: "material", unit: "bag", quantity: 350, unitPrice: 18 },
    { id: "ae-m-steel", name: "Steel", category: "material", unit: "kg", quantity: 3800, unitPrice: 3.2 },
    { id: "ae-m-sand", name: "Sand", category: "material", unit: "cft", quantity: 1100, unitPrice: 4 },
    { id: "ae-m-aggregate", name: "Aggregate", category: "material", unit: "cft", quantity: 950, unitPrice: 3.5 },
    { id: "ae-m-blocks", name: "Blocks", category: "material", unit: "nos", quantity: 9000, unitPrice: 2.5 },
    { id: "ae-m-tiles", name: "Tiles", category: "material", unit: "sqft", quantity: 900, unitPrice: 8 },
    { id: "ae-m-plumbing", name: "Plumbing materials", category: "material", unit: "lot", quantity: 1, unitPrice: 12000 },
    { id: "ae-m-electrical", name: "Electrical materials", category: "material", unit: "lot", quantity: 1, unitPrice: 11000 },
    { id: "ae-m-paint", name: "Paint", category: "material", unit: "ltr", quantity: 100, unitPrice: 35 },
    { id: "ae-m-waterproof", name: "Waterproofing", category: "material", unit: "lot", quantity: 1, unitPrice: 8000 },
    { id: "ae-m-doors", name: "Doors", category: "material", unit: "nos", quantity: 8, unitPrice: 900 },
    { id: "ae-m-windows", name: "Windows", category: "material", unit: "nos", quantity: 10, unitPrice: 1100 },
    { id: "ae-m-sanitary", name: "Sanitary fittings", category: "material", unit: "lot", quantity: 1, unitPrice: 9000 },
    { id: "ae-m-kitchen", name: "Kitchen materials", category: "material", unit: "lot", quantity: 1, unitPrice: 8000 },
    { id: "ae-m-hardware", name: "Hardware", category: "material", unit: "lot", quantity: 1, unitPrice: 2500 },
    { id: "ae-m-other", name: "Other materials", category: "material", unit: "lot", quantity: 1, unitPrice: 4000 },
  ],
  labour: [
    { id: "ae-l-mason", name: "Mason", category: "labour", unit: "day", quantity: 55, unitPrice: 180 },
    { id: "ae-l-helper", name: "Helper", category: "labour", unit: "day", quantity: 80, unitPrice: 120 },
    { id: "ae-l-carpenter", name: "Carpenter", category: "labour", unit: "day", quantity: 22, unitPrice: 200 },
    { id: "ae-l-electrician", name: "Electrician", category: "labour", unit: "day", quantity: 18, unitPrice: 220 },
    { id: "ae-l-plumber", name: "Plumber", category: "labour", unit: "day", quantity: 16, unitPrice: 220 },
    { id: "ae-l-painter", name: "Painter", category: "labour", unit: "day", quantity: 20, unitPrice: 180 },
    { id: "ae-l-tile", name: "Tile worker", category: "labour", unit: "day", quantity: 18, unitPrice: 190 },
    { id: "ae-l-steel", name: "Steel worker", category: "labour", unit: "day", quantity: 16, unitPrice: 200 },
    { id: "ae-l-operator", name: "Equipment / operator", category: "labour", unit: "day", quantity: 8, unitPrice: 280 },
    { id: "ae-l-other", name: "Other labour", category: "labour", unit: "day", quantity: 12, unitPrice: 140 },
  ],
  otherCosts: [
    { id: "ae-o-equipment", name: "Equipment", category: "other", unit: "lot", quantity: 1, unitPrice: 8000 },
    { id: "ae-o-transport", name: "Transportation", category: "other", unit: "lot", quantity: 1, unitPrice: 5000 },
    { id: "ae-o-site", name: "Site preparation", category: "other", unit: "lot", quantity: 1, unitPrice: 6000 },
    { id: "ae-o-temp", name: "Temporary works", category: "other", unit: "lot", quantity: 1, unitPrice: 4000 },
    { id: "ae-o-waste", name: "Waste disposal", category: "other", unit: "lot", quantity: 1, unitPrice: 2500 },
    { id: "ae-o-misc", name: "Miscellaneous", category: "other", unit: "lot", quantity: 1, unitPrice: 3000 },
  ],
  includedItems: [
    { id: "ae-i-1", text: "Foundation work", included: true },
    { id: "ae-i-2", text: "RCC / structural work", included: true },
    { id: "ae-i-3", text: "Block work", included: true },
    { id: "ae-i-4", text: "Internal plastering", included: true },
    { id: "ae-i-5", text: "Basic flooring", included: true },
    { id: "ae-i-6", text: "Basic electrical work", included: true },
    { id: "ae-i-7", text: "Basic plumbing work", included: true },
    { id: "ae-i-8", text: "Internal painting", included: true },
    { id: "ae-i-9", text: "Basic waterproofing", included: true },
    { id: "ae-i-10", text: "Labour charges", included: true },
    { id: "ae-i-11", text: "Standard construction materials", included: true },
  ],
  excludedItems: [
    { id: "ae-e-1", text: "Land cost", included: false },
    { id: "ae-e-2", text: "Architect / consultant fees", included: false },
    { id: "ae-e-3", text: "Municipality / approval fees", included: false },
    { id: "ae-e-4", text: "Premium sanitary fittings", included: false },
    { id: "ae-e-5", text: "Premium electrical fixtures", included: false },
    { id: "ae-e-6", text: "Modular kitchen", included: false },
    { id: "ae-e-7", text: "Wardrobes", included: false },
    { id: "ae-e-8", text: "Furniture", included: false },
    { id: "ae-e-9", text: "Air conditioning", included: false },
    { id: "ae-e-10", text: "Solar system", included: false },
    { id: "ae-e-11", text: "Lift / elevator", included: false },
    { id: "ae-e-12", text: "Boundary wall", included: false },
    { id: "ae-e-13", text: "Landscaping", included: false },
    { id: "ae-e-14", text: "External development work", included: false },
  ],
  addons: [
    { id: "ae-a-kitchen", name: "Modular Kitchen", amount: 35000 },
    { id: "ae-a-wardrobes", name: "Wardrobes", amount: 22000 },
    { id: "ae-a-solar", name: "Solar System", amount: 28000 },
    { id: "ae-a-lift", name: "Lift", amount: 120000 },
    { id: "ae-a-flooring", name: "Premium Flooring", amount: 25, ratePerSqFt: true },
  ],
  defaultTaxPercentage: 5,
  defaultContingencyPercentage: 5,
  defaultDiscountPercentage: 0,
  defaultNotes:
    "Default rates are estimates and should be reviewed and adjusted based on project location, specifications, material quality, labour rates, and current market prices.",
  defaultTerms:
    "This estimate is based on the selected template rates. Final quotation is subject to site inspection and material specification confirmation. VAT as applicable.",
  source: "builtin",
};
