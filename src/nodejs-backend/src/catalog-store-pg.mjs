import {
  n,
  normalizePackage,
  jsonBigIntReplacer,
} from "./catalog-core.mjs";
import { createMemoryCatalogStore } from "./catalog-store-memory.mjs";

/**
 * @param {import('pg').Pool} pool
 */
export function createPgCatalogStore(pool) {
  async function syncBatchSequence() {
    await pool.query(`
      SELECT setval(
        'catalog_batch_id_seq',
        GREATEST(
          COALESCE(
            (SELECT MAX((elem->>'batchId')::bigint)
             FROM catalog_packages cp,
             LATERAL jsonb_array_elements(
               COALESCE(cp.body->'detail'->'fixed'->'batches', '[]'::jsonb)
             ) AS elem
            ),
            1
          ),
          1
        ),
        true
      )
    `);
  }

  async function seedFromMemoryTemplate() {
    const mem = createMemoryCatalogStore();
    await mem.seedIfEmpty();
    const views = await mem.listCatalogJson();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const v of views) {
        const c = v.category;
        const ins = await client.query(
          `INSERT INTO catalog_categories (name, sort_order, active) VALUES ($1,$2,$3) RETURNING id`,
          [c.name, c.sortOrder, c.active],
        );
        const newCatId = ins.rows[0].id;
        for (const p of v.packages) {
          const r = await client.query(
            `INSERT INTO catalog_packages (category_id, body) VALUES ($1, '{}'::jsonb) RETURNING id`,
            [newCatId],
          );
          const pid = r.rows[0].id;
          const full = { ...p, id: pid, categoryId: newCatId };
          await client.query(
            `UPDATE catalog_packages SET body = $2::jsonb WHERE id = $1`,
            [pid, JSON.stringify(full, jsonBigIntReplacer)],
          );
        }
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    await syncBatchSequence();
  }

  return {
    async listCatalogJson() {
      const cats = await pool.query(
        `SELECT id, name, sort_order, active FROM catalog_categories ORDER BY sort_order ASC`,
      );
      const out = [];
      for (const c of cats.rows) {
        if (!c.active) continue;
        const pkgs = await pool.query(
          `SELECT body FROM catalog_packages WHERE category_id = $1 ORDER BY id ASC`,
          [c.id],
        );
        const packages = pkgs.rows
          .map((r) => r.body)
          .filter((p) => p && p.active);
        out.push({
          category: {
            id: c.id,
            name: c.name,
            sortOrder: c.sort_order,
            active: c.active,
          },
          packages,
        });
      }
      return out;
    },

    async getPackage(packageId) {
      const r = await pool.query(
        `SELECT body FROM catalog_packages WHERE id = $1`,
        [n(packageId)],
      );
      return r.rows[0]?.body ?? null;
    },

    async getPackagePublic(packageId) {
      const r = await pool.query(
        `SELECT body FROM catalog_packages WHERE id = $1`,
        [n(packageId)],
      );
      const p = r.rows[0]?.body;
      if (!p || !p.active) return null;
      return p;
    },

    async insertPackageRecord(pkg) {
      const norm = normalizePackage(pkg);
      if (norm.id === 0) {
        const r = await pool.query(
          `INSERT INTO catalog_packages (category_id, body) VALUES ($1, '{}'::jsonb) RETURNING id`,
          [norm.categoryId],
        );
        const id = r.rows[0].id;
        const full = { ...norm, id };
        await pool.query(
          `UPDATE catalog_packages SET body = $2::jsonb WHERE id = $1`,
          [id, JSON.stringify(full, jsonBigIntReplacer)],
        );
        await syncBatchSequence();
        return id;
      }
      const ex = await pool.query(
        `SELECT 1 FROM catalog_packages WHERE id = $1`,
        [norm.id],
      );
      if (ex.rowCount === 0) throw new Error("Package not found");
      await pool.query(
        `UPDATE catalog_packages SET category_id = $2, body = $3::jsonb WHERE id = $1`,
        [
          norm.id,
          norm.categoryId,
          JSON.stringify(norm, jsonBigIntReplacer),
        ],
      );
      await syncBatchSequence();
      return norm.id;
    },

    async resetStorage() {
      await pool.query(
        `TRUNCATE catalog_categories RESTART IDENTITY CASCADE`,
      );
      await pool.query(`ALTER SEQUENCE catalog_batch_id_seq RESTART WITH 1`);
    },

    async seedIfEmpty() {
      const c = await pool.query(
        `SELECT COUNT(*)::int AS n FROM catalog_categories`,
      );
      if (c.rows[0].n > 0) return;
      await seedFromMemoryTemplate();
    },

    async countCategories() {
      const r = await pool.query(
        `SELECT COUNT(*)::int AS n FROM catalog_categories`,
      );
      return r.rows[0].n;
    },

    async countPackages() {
      const r = await pool.query(
        `SELECT COUNT(*)::int AS n FROM catalog_packages`,
      );
      return r.rows[0].n;
    },

    async upsertCategory({ idOpt, name, sortOrder, active }) {
      if (idOpt === undefined || idOpt === null || idOpt === "") {
        const r = await pool.query(
          `INSERT INTO catalog_categories (name, sort_order, active) VALUES ($1,$2,$3) RETURNING id`,
          [name, sortOrder, active],
        );
        return r.rows[0].id;
      }
      const id = n(idOpt);
      const u = await pool.query(
        `UPDATE catalog_categories SET name = $2, sort_order = $3, active = $4 WHERE id = $1 RETURNING id`,
        [id, name, sortOrder, active],
      );
      if (u.rowCount === 0) throw new Error("Category not found");
      return id;
    },

    async deleteCategory(id) {
      await pool.query(`DELETE FROM catalog_packages WHERE category_id = $1`, [
        n(id),
      ]);
      await pool.query(`DELETE FROM catalog_categories WHERE id = $1`, [n(id)]);
    },

    async deletePackage(id) {
      await pool.query(`DELETE FROM catalog_packages WHERE id = $1`, [n(id)]);
    },

    async reserveBatchIds(count) {
      const ids = [];
      for (let i = 0; i < count; i++) {
        const r = await pool.query(`SELECT nextval('catalog_batch_id_seq') AS id`);
        ids.push(Number(r.rows[0].id));
      }
      return ids;
    },

    async categoryNameOrTrap(catId) {
      const r = await pool.query(
        `SELECT name FROM catalog_categories WHERE id = $1`,
        [n(catId)],
      );
      if (!r.rows[0]) throw new Error("Unknown category");
      return r.rows[0].name;
    },

    async updatePackage(pkgId, pkg) {
      await pool.query(
        `UPDATE catalog_packages SET body = $2::jsonb WHERE id = $1`,
        [n(pkgId), JSON.stringify(pkg, jsonBigIntReplacer)],
      );
    },

    async mutatePackage(packageId, updater) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const r = await client.query(
          `SELECT body FROM catalog_packages WHERE id = $1 FOR UPDATE`,
          [n(packageId)],
        );
        if (!r.rows[0]) throw new Error("Package not found");
        const cur = r.rows[0].body;
        const next = updater(cur);
        await client.query(
          `UPDATE catalog_packages SET body = $2::jsonb WHERE id = $1`,
          [n(packageId), JSON.stringify(next, jsonBigIntReplacer)],
        );
        await client.query("COMMIT");
        return next;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
  };
}
