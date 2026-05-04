import {
  evaluatePayrollCondition,
  evaluatePayrollFormula,
} from './payroll-expression-evaluator';

describe('payroll expression evaluator', () => {
  const context = {
    baseSalary: 300000,
    taxableAllowances: 50000,
    GROSS_TAXABLE: 350000,
    CNPS_TAX: 14700,
    IRPP_BASE: 230300,
    IRPP_ANNUAL: 2263600,
  };

  it('evaluates arithmetic formulas and allowlisted min/max functions', () => {
    expect(
      evaluatePayrollFormula('baseSalary + taxableAllowances', context),
    ).toBe(350000);
    expect(
      evaluatePayrollFormula('min(GROSS_TAXABLE, 750000) * 0.042', context),
    ).toBeCloseTo(14700);
    expect(
      evaluatePayrollFormula('max((IRPP_BASE * 12) - 500000, 0)', context),
    ).toBe(2263600);
  });

  it('evaluates nested ternary payroll scales', () => {
    const formula =
      'IRPP_ANNUAL <= 2000000 ? IRPP_ANNUAL * 0.1 : (IRPP_ANNUAL <= 3000000 ? 200000 + ((IRPP_ANNUAL - 2000000) * 0.15) : 0)';

    expect(evaluatePayrollFormula(formula, context)).toBe(239540);
  });

  it('evaluates boolean conditions with comparisons and logical operators', () => {
    expect(evaluatePayrollCondition('GROSS_TAXABLE >= 300000', context)).toBe(
      true,
    );
    expect(
      evaluatePayrollCondition(
        'GROSS_TAXABLE > 1000000 || baseSalary == 300000',
        context,
      ),
    ).toBe(true);
    expect(evaluatePayrollCondition('!(GROSS_TAXABLE < 100000)', context)).toBe(
      true,
    );
  });

  it('rejects unsupported functions, unknown variables and member access', () => {
    expect(() =>
      evaluatePayrollFormula(
        'constructor.constructor("return process")()',
        context,
      ),
    ).toThrow(
      /Invalid numeric literal|Unsupported character|Unsupported payroll function/,
    );
    expect(() =>
      evaluatePayrollFormula('sqrt(GROSS_TAXABLE)', context),
    ).toThrow(/Unsupported payroll function/);
    expect(() =>
      evaluatePayrollFormula('UNKNOWN_PAYROLL_VAR + 1', context),
    ).toThrow(/Unknown payroll variable/);
  });
});
