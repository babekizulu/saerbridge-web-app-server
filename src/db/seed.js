"use strict";

require("dotenv").config();

const { createPool, closePool } = require("./pool");
const { CORE_PRODUCTS } = require("../config/products");
const { legalConfig } = require("../config/legal");

const LEGAL_DOCS = [
  { document_type: "terms", version: legalConfig.termsVersion, title: "End User Agreement" },
  { document_type: "privacy", version: legalConfig.privacyPolicyVersion, title: "Privacy Policy" },
  { document_type: "ethics", version: legalConfig.ethicsVersion, title: "Ethics & Compliance" },
  { document_type: "ai_processing_notice", version: legalConfig.aiNoticeVersion, title: "AI processing notice" },
];

async function seed(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error("DATABASE_URL is required to seed");
  const pool = createPool(databaseUrl);
  try {
    for (const product of CORE_PRODUCTS) {
      await pool.query(
        `INSERT INTO products (
           slug, name, short_description, long_description, subdomain_url, product_status, display_order
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           short_description = EXCLUDED.short_description,
           long_description = EXCLUDED.long_description,
           subdomain_url = EXCLUDED.subdomain_url,
           product_status = EXCLUDED.product_status,
           display_order = EXCLUDED.display_order,
           updated_at = now()`,
        [
          product.slug,
          product.name,
          product.shortDescription,
          product.longDescription,
          product.subdomainUrl,
          product.productStatus,
          product.displayOrder,
        ]
      );
    }

    for (const doc of LEGAL_DOCS) {
      await pool.query(
        `INSERT INTO legal_documents (document_type, version, title, is_current, effective_at)
         VALUES ($1, $2, $3, TRUE, now())
         ON CONFLICT (document_type, version) DO UPDATE SET
           title = EXCLUDED.title,
           is_current = TRUE`,
        [doc.document_type, doc.version, doc.title]
      );
    }
  } finally {
    await closePool(pool);
  }
}

if (require.main === module) {
  seed()
    .then(() => process.stdout.write("seed complete\n"))
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = { seed };
