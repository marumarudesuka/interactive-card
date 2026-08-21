export function moveItem<T>(
  items:readonly T[],
  index:number,
  direction:-1 | 1
):T[] {
  const target = index + direction;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return [...items];
  }
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function removeItem<T>(
  items:readonly T[],
  predicate:(item:T) => boolean
):T[] {
  return items.filter((item) => !predicate(item));
}
