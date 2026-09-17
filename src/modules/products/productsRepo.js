"use strict";

function publicProduct(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    longDescription: row.long_description,
    subdomainUrl: row.subdomain_url,
    productStatus: row.product_status,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createProductsRepo(pool) {
  async function list() {
    const { rows } = await pool.query(`SELECT * FROM products ORDER BY display_order ASC, name ASC`);
    return rows.map(publicProduct);
  }

  async function findBySlug(slug) {
    const { rows } = await pool.query(`SELECT * FROM products WHERE slug = $1`, [slug]);
    return rows[0] ? publicProduct(rows[0]) : null;
  }

  async function findById(id) {
    const { rows } = await pool.query(`SELECT * FROM products WHERE id = $1`, [id]);
    return rows[0] ? publicProduct(rows[0]) : null;
  }

  async function create(input) {
    const { rows } = await pool.query(
      `INSERT INTO products (slug, name, short_description, long_description, subdomain_url, product_status, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.slug,
        input.name,
        input.shortDescription,
        input.longDescription,
        input.subdomainUrl,
        input.productStatus,
        input.displayOrder,
      ]
    );
    return publicProduct(rows[0]);
  }

  async function update(id, input) {
    const current = await findById(id);
    if (!current) return null;
    const next = { ...current, ...input };
    const { rows } = await pool.query(
      `UPDATE products
       SET slug = $2,
           name = $3,
           short_description = $4,
           long_description = $5,
           subdomain_url = $6,
           product_status = $7,
           display_order = $8,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        next.slug,
        next.name,
        next.shortDescription,
        next.longDescription,
        next.subdomainUrl,
        next.productStatus,
        next.displayOrder,
      ]
    );
    return publicProduct(rows[0]);
  }

  async function remove(id) {
    const { rowCount } = await pool.query(`DELETE FROM products WHERE id = $1`, [id]);
    return rowCount > 0;
  }

  return { list, findBySlug, findById, create, update, remove };
}

module.exports = { createProductsRepo, publicProduct };
