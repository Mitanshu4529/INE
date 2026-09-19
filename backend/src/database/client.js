import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DB_PATH = path.join(__dirname, '../../../data/local_db.json');

class DatabaseClient {
  constructor() {
    this.useLocal = !config.supabaseUrl || !config.supabaseServiceRoleKey;
    if (!this.useLocal) {
      this.supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
      logger.info('Database: Using Supabase');
    } else {
      logger.info('Database: Using local JSON fallback (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing)');
      this._initLocalDb();
    }
  }

  async _initLocalDb() {
    try {
      await fs.mkdir(path.dirname(LOCAL_DB_PATH), { recursive: true });
      try {
        await fs.access(LOCAL_DB_PATH);
      } catch {
        const initialDb = {
          tracked_products: [],
          price_history: [],
          scrape_logs: []
        };
        await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(initialDb, null, 2));
      }
    } catch (err) {
      logger.error(`Database: Failed to initialize local DB: ${err.message}`);
    }
  }

  async _readLocal() {
    const data = await fs.readFile(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(data);
  }

  async _writeLocal(data) {
    await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
  }

  // --- Tracked Products ---

  async getTrackedProducts() {
    if (!this.useLocal) {
      const { data, error } = await this.supabase
        .from('tracked_products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } else {
      const db = await this._readLocal();
      return db.tracked_products;
    }
  }

  async getTrackedProduct(id) {
    if (!this.useLocal) {
      const products = await this.getTrackedProducts();
      return products.find(product => String(product.id) === String(id));
    } else {
      const db = await this._readLocal();
      return db.tracked_products.find(p => p.id === id);
    }
  }

  async findProductByStoreId(productId) {
    if (!this.useLocal) {
      const { data, error } = await this.supabase
        .from('tracked_products')
        .select('*')
        .eq('product_id', productId)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found
      return data;
    } else {
      const db = await this._readLocal();
      return db.tracked_products.find(p => p.product_id === productId);
    }
  }

  async addTrackedProduct(product) {
    if (!this.useLocal) {
      const { data, error } = await this.supabase
        .from('tracked_products')
        .insert([{
          product_id: product.id,
          product_name: product.name,
          product_slug: product.slug,
          product_url: `${config.mockStoreUrl}/product/${product.id}`,
          sku: product.sku,
          current_price: null,
          current_stock: null
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const db = await this._readLocal();
      const newProduct = {
        id: crypto.randomUUID(),
        product_id: product.id,
        product_name: product.name,
        product_slug: product.slug,
        product_url: `${config.mockStoreUrl}/product/${product.id}`,
        sku: product.sku,
        current_price: null,
        current_stock: null,
        tracking_status: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.tracked_products.push(newProduct);
      await this._writeLocal(db);
      return newProduct;
    }
  }

  async updateProductPrice(id, price, stock) {
    if (!this.useLocal) {
      const { error } = await this.supabase
        .from('tracked_products')
        .update({
          current_price: price,
          current_stock: stock,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) throw error;
    } else {
      const db = await this._readLocal();
      const product = db.tracked_products.find(p => p.id === id);
      if (product) {
        product.current_price = price;
        product.current_stock = stock;
        product.updated_at = new Date().toISOString();
        await this._writeLocal(db);
      }
    }
  }

  // --- Price History ---

  async addPriceHistory(trackedProductId, price, stock) {
    if (!this.useLocal) {
      const { error } = await this.supabase
        .from('price_history')
        .insert([{
          tracked_product_id: trackedProductId,
          price,
          stock
        }]);
      if (error) throw error;
    } else {
      const db = await this._readLocal();
      db.price_history.push({
        id: crypto.randomUUID(),
        tracked_product_id: trackedProductId,
        price,
        stock,
        scraped_at: new Date().toISOString()
      });
      await this._writeLocal(db);
    }
  }

  async getPriceHistory(trackedProductId) {
    if (!this.useLocal) {
      const { data, error } = await this.supabase
        .from('price_history')
        .select('*')
        .eq('tracked_product_id', trackedProductId)
        .order('scraped_at', { ascending: false });
      if (error) throw error;
      return data;
    } else {
      const db = await this._readLocal();
      return db.price_history
        .filter(h => h.tracked_product_id === trackedProductId)
        .sort((a, b) => new Date(b.scraped_at) - new Date(a.scraped_at));
    }
  }

  // --- Scrape Logs ---

  async addScrapeLog(log) {
    if (!this.useLocal) {
      const { error } = await this.supabase
        .from('scrape_logs')
        .insert([{
          tracked_product_id: log.tracked_product_id,
          status: log.status,
          attempt_number: log.attempt_number,
          duration_ms: log.duration_ms,
          error_message: log.error_message,
          http_status: log.http_status,
          details: log.details
        }]);
      if (error) throw error;
    } else {
      const db = await this._readLocal();
      db.scrape_logs.push({
        id: crypto.randomUUID(),
        ...log,
        attempt_timestamp: new Date().toISOString()
      });
      await this._writeLocal(db);
    }
  }

  async getScrapeLogs(trackedProductId) {
    if (!this.useLocal) {
      const { data, error } = await this.supabase
        .from('scrape_logs')
        .select('*')
        .eq('tracked_product_id', trackedProductId)
        .order('attempt_timestamp', { ascending: false });
      if (error) throw error;
      return data;
    } else {
      const db = await this._readLocal();
      return db.scrape_logs
        .filter(l => l.tracked_product_id === trackedProductId)
        .sort((a, b) => new Date(b.attempt_timestamp) - new Date(a.attempt_timestamp));
    }
  }
}

export const db = new DatabaseClient();
