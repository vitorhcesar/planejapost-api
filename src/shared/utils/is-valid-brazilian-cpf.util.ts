export function isValidBrazilianCpf(value: string): boolean {
  const cpf = value.replace(/\D/g, "");

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const calculateDigit = (slice: string, factor: number): number => {
    const total = slice
      .split("")
      .reduce((sum, digit, index) => sum + Number(digit) * (factor - index), 0);

    const remainder = (total * 10) % 11;

    return remainder === 10 ? 0 : remainder;
  };

  const firstDigit = calculateDigit(cpf.slice(0, 9), 10);
  const secondDigit = calculateDigit(cpf.slice(0, 10), 11);

  return firstDigit === Number(cpf[9]) && secondDigit === Number(cpf[10]);
}
