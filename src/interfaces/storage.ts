type StorageLike<T> = {
  readonly create: (values: readonly T[]) => Promise<number>;
  readonly findAll: () => Promise<readonly T[]>;
  readonly update: (
    updating: ReadonlyArray<{ readonly [key: number]: object }>,
  ) => Promise<number>;
  readonly delete: (ids: ReadonlyArray<number>) => Promise<number>;
};

type StorageManager = {
  readonly apply: <T>(name: string) => Promise<StorageLike<T>>;
};

export { StorageLike, StorageManager };
