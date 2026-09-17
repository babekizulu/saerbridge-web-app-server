"use strict";

const CORE_PRODUCTS = [
  {
    slug: "nile",
    name: "Nile",
    shortDescription:
      "Resource mapping and resource planning for publicly accessible physical and institutional resources.",
    longDescription:
      "Nile maps publicly accessible physical and institutional resources such as timber, bricks, cement, government departments, financing organisations and venture-capital organisations. It is designed to help people plan efficient use of resources around them, including a future AI planning interface.",
    subdomainUrl: "https://nile.saerbridge.com",
    productStatus: "development",
    displayOrder: 1,
  },
  {
    slug: "andromeda",
    name: "Andromeda",
    shortDescription: "Personal lifestyle and planning software for budgets, literacy and wellness guidance.",
    longDescription:
      "Andromeda helps users draft monthly budget plans and provides financial-literacy, lifestyle and general wellness guidance. The information is educational. It is not personalised financial, medical or legal advice.",
    subdomainUrl: "https://andromeda.saerbridge.com",
    productStatus: "development",
    displayOrder: 2,
  },
  {
    slug: "percival",
    name: "Percival",
    shortDescription: "Regional gap-analysis and opportunity mapping for South African regions.",
    longDescription:
      "Percival maps unmet needs in South African regions and provides recommendation panels identifying possible business or organisational solutions that could address those gaps. Inferences are labelled and distinguishable from verified public data.",
    subdomainUrl: "https://percival.saerbridge.com",
    productStatus: "development",
    displayOrder: 3,
  },
  {
    slug: "source",
    name: "Source",
    shortDescription: "A social-interest geography platform for discovering places associated with shared interests.",
    longDescription:
      "Source lets people publish or discover maps of places associated with their interests and find physical places where people with similar interests tend to spend time. Source does not provide direct messaging, chat or user-to-user communication.",
    subdomainUrl: "https://source.saerbridge.com",
    productStatus: "development",
    displayOrder: 4,
  },
  {
    slug: "thoth",
    name: "Thoth",
    shortDescription: "A civic-policy participation platform for structured recommendations and digital feedback.",
    longDescription:
      "Thoth allows constituents and voters to provide structured recommendations concerning proposed political policy or legislation and to submit ratings or feedback digitally. It remains informational and participatory. It does not provide candidate recommendations, political persuasion or microtargeting.",
    subdomainUrl: "https://thoth.saerbridge.com",
    productStatus: "development",
    displayOrder: 5,
  },
  {
    slug: "alethea",
    name: "Alethea",
    shortDescription: "Service-delivery and service-lag mapping for public infrastructure issues.",
    longDescription:
      "Alethea provides heatmaps and geographic filters identifying issues such as pothole density, water shortages, electricity outages and other service-delivery gaps. User reports, verified data and AI inference are kept visually and structurally distinct.",
    subdomainUrl: "https://alethea.saerbridge.com",
    productStatus: "development",
    displayOrder: 6,
  },
];

module.exports = { CORE_PRODUCTS };
