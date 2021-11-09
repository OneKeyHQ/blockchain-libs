const groupBy = <K extends keyof any, T>(
  array: Array<T>,
  key: (i: T) => K,
): Record<K, Array<T>> => {
  return array.reduce((acc, cur: T) => {
    const group = key(cur);
    if (!acc[group]) {
      acc[group] = [];
    }

    acc[group].push(cur);
    return acc;
  }, {} as Record<K, Array<T>>);
};

export { groupBy };
