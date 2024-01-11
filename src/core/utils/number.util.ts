export const getSum = (values: number[]) => {
  const sum = values.reduce((acc, curr) => {
    acc += curr;
    return acc;
  }, 0);

  return +sum.toFixed(4);
}