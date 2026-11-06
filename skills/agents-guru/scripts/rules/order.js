// WHY: a bare sort compares by UTF-16 code unit, and localeCompare would reorder every report, so this keeps the bare sort's order behind the comparator Biome asks for.
export function byCodeUnit(a, b) {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}
