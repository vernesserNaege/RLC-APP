// Small helpers for editing a list. Each returns a NEW list, because React only redraws
// when it gets a new list, not when the old one is changed in place.

// Changes some fields of the item with this key, e.g. updateByKey(steps, "k1", { title: "New" }).
export const updateByKey = <T extends { key: string }>(list: T[], key: string, changes: Partial<NoInfer<T>>): T[] =>
  list.map((item) => (item.key === key ? { ...item, ...changes } : item));

export const removeAt = <T>(list: T[], index: number): T[] => list.filter((_, i) => i !== index);

// Moves one item up (by = -1) or down (by = +1).
export function moveItem<T>(list: T[], index: number, by: number): T[] {
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(index + by, 0, item);
  return next;
}