interface StorageLike<T> {
  create: (values: readonly T[]) => Promise<number>;
  findAll: () => Promise<readonly T[]>;
  update: (
    updating: ReadonlyArray<{ readonly [key: number]: object }>,
  ) => Promise<number>;
  delete: (ids: ReadonlyArray<number>) => Promise<number>;
}

interface StorageManager {
  apply: <T>(name: string) => Promise<StorageLike<T>>;
}

interface ApiConfig {
  storageManager: StorageManager;
}

export { StorageLike, StorageManager, ApiConfig };
