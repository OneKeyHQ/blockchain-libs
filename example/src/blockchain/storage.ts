import settings from './settings';
import Keyv from 'keyv';

export class Storage {
  private readonly kv: Keyv;

  constructor(uri?: string) {
    uri = uri || `sqlite://${settings.DATA_DIR}/kv.sqlite`;
    this.kv = new Keyv(uri);
  }

  async get(keys: string[]): Promise<any[]> {
    const values = [];

    for (const key of keys) {
      const value = await this.kv.get(key);
      values.push(value);
    }

    return values;
  }

  async set(key: string, value: any): Promise<boolean> {
    return this.kv.set(key, value);
  }

  async delete(keys: string[]): Promise<number> {
    for (const key of keys) {
      await this.kv.delete(key);
    }

    return keys.length;
  }
}
