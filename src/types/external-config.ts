type StorageLike = {
  readonly set: (key: string, value: any) => Promise<boolean>;
  readonly get: (keys: string[]) => Promise<any[]>;
  readonly delete: (keys: string[]) => Promise<number>;
};

type ExternalConfig = {
  readonly storage: StorageLike;
};

export { StorageLike, ExternalConfig };
