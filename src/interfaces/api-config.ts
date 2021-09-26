type StorageLike<T> = {
  readonly create: (values: readonly T[]) => Promise<number>;
  readonly findAll: () => Promise<readonly T[]>;
  readonly update: (
    updating: ReadonlyArray<{
      readonly [key: number]: { readonly [key: string]: any };
    }>,
  ) => Promise<number>;
  readonly delete: (ids: ReadonlyArray<number>) => Promise<number>;
};

type StorageManager = {
  readonly apply: <T>(name: string) => Promise<StorageLike<T>>;
};

type ApiConfig = {
  readonly storageManager: StorageManager;
};

export { StorageLike, StorageManager, ApiConfig };
