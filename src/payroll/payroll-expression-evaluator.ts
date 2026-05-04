type PayrollExpressionValue = number | boolean;

type TokenType =
  | 'number'
  | 'identifier'
  | 'operator'
  | 'leftParen'
  | 'rightParen'
  | 'comma'
  | 'question'
  | 'colon'
  | 'eof';

interface Token {
  type: TokenType;
  value: string;
}

const FUNCTIONS: Record<string, (...values: number[]) => number> = {
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  max: (...values) => Math.max(...values),
  min: (...values) => Math.min(...values),
  round: Math.round,
};

export function evaluatePayrollExpression(
  expression: string,
  context: Record<string, number>,
): PayrollExpressionValue {
  const parser = new PayrollExpressionParser(tokenize(expression), context);
  return parser.parse();
}

export function evaluatePayrollFormula(
  expression: string,
  context: Record<string, number>,
): number {
  const result = evaluatePayrollExpression(expression, context);
  const numericResult = toNumber(result);
  if (!Number.isFinite(numericResult)) {
    throw new Error('Payroll formula returned a non-finite number');
  }
  return numericResult;
}

export function evaluatePayrollCondition(
  expression: string,
  context: Record<string, number>,
): boolean {
  return toBoolean(evaluatePayrollExpression(expression, context));
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    const twoChars = expression.slice(index, index + 2);
    if (['<=', '>=', '==', '!=', '&&', '||'].includes(twoChars)) {
      tokens.push({ type: 'operator', value: twoChars });
      index += 2;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      const start = index;
      index += 1;
      while (index < expression.length && /[0-9.]/.test(expression[index])) {
        index += 1;
      }
      const value = expression.slice(start, index);
      if (!/^(?:\d+|\d*\.\d+)$/.test(value)) {
        throw new Error(`Invalid numeric literal "${value}"`);
      }
      tokens.push({ type: 'number', value });
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      const start = index;
      index += 1;
      while (
        index < expression.length &&
        /[A-Za-z0-9_]/.test(expression[index])
      ) {
        index += 1;
      }
      tokens.push({
        type: 'identifier',
        value: expression.slice(start, index),
      });
      continue;
    }

    if ('+-*/><!'.includes(char)) {
      tokens.push({ type: 'operator', value: char });
      index += 1;
      continue;
    }

    if (char === '(') tokens.push({ type: 'leftParen', value: char });
    else if (char === ')') tokens.push({ type: 'rightParen', value: char });
    else if (char === ',') tokens.push({ type: 'comma', value: char });
    else if (char === '?') tokens.push({ type: 'question', value: char });
    else if (char === ':') tokens.push({ type: 'colon', value: char });
    else
      throw new Error(`Unsupported character "${char}" in payroll expression`);
    index += 1;
  }

  tokens.push({ type: 'eof', value: '' });
  return tokens;
}

class PayrollExpressionParser {
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly context: Record<string, number>,
  ) {}

  parse(): PayrollExpressionValue {
    const result = this.parseConditional();
    this.expect('eof');
    return result;
  }

  private parseConditional(): PayrollExpressionValue {
    const condition = this.parseLogicalOr();
    if (!this.match('question')) {
      return condition;
    }
    const whenTrue = this.parseConditional();
    this.expect('colon');
    const whenFalse = this.parseConditional();
    return toBoolean(condition) ? whenTrue : whenFalse;
  }

  private parseLogicalOr(): PayrollExpressionValue {
    let left = this.parseLogicalAnd();
    while (this.matchOperator('||')) {
      const right = this.parseLogicalAnd();
      left = toBoolean(left) || toBoolean(right);
    }
    return left;
  }

  private parseLogicalAnd(): PayrollExpressionValue {
    let left = this.parseEquality();
    while (this.matchOperator('&&')) {
      const right = this.parseEquality();
      left = toBoolean(left) && toBoolean(right);
    }
    return left;
  }

  private parseEquality(): PayrollExpressionValue {
    let left = this.parseComparison();
    while (
      this.current().type === 'operator' &&
      ['==', '!='].includes(this.current().value)
    ) {
      const operator = this.advance().value;
      const right = this.parseComparison();
      left =
        operator === '=='
          ? toNumber(left) === toNumber(right)
          : toNumber(left) !== toNumber(right);
    }
    return left;
  }

  private parseComparison(): PayrollExpressionValue {
    let left = this.parseTerm();
    while (
      this.current().type === 'operator' &&
      ['<', '<=', '>', '>='].includes(this.current().value)
    ) {
      const operator = this.advance().value;
      const right = this.parseTerm();
      const leftNumber = toNumber(left);
      const rightNumber = toNumber(right);
      if (operator === '<') left = leftNumber < rightNumber;
      else if (operator === '<=') left = leftNumber <= rightNumber;
      else if (operator === '>') left = leftNumber > rightNumber;
      else left = leftNumber >= rightNumber;
    }
    return left;
  }

  private parseTerm(): PayrollExpressionValue {
    let left = this.parseFactor();
    while (
      this.current().type === 'operator' &&
      ['+', '-'].includes(this.current().value)
    ) {
      const operator = this.advance().value;
      const right = this.parseFactor();
      left =
        operator === '+'
          ? toNumber(left) + toNumber(right)
          : toNumber(left) - toNumber(right);
    }
    return left;
  }

  private parseFactor(): PayrollExpressionValue {
    let left = this.parseUnary();
    while (
      this.current().type === 'operator' &&
      ['*', '/'].includes(this.current().value)
    ) {
      const operator = this.advance().value;
      const right = this.parseUnary();
      left =
        operator === '*'
          ? toNumber(left) * toNumber(right)
          : toNumber(left) / toNumber(right);
    }
    return left;
  }

  private parseUnary(): PayrollExpressionValue {
    if (this.matchOperator('+')) return toNumber(this.parseUnary());
    if (this.matchOperator('-')) return -toNumber(this.parseUnary());
    if (this.matchOperator('!')) return !toBoolean(this.parseUnary());
    return this.parsePrimary();
  }

  private parsePrimary(): PayrollExpressionValue {
    const token = this.current();

    if (this.match('number')) {
      return Number(token.value);
    }

    if (this.match('identifier')) {
      if (this.match('leftParen')) {
        return this.evaluateFunction(token.value);
      }
      if (!(token.value in this.context)) {
        throw new Error(`Unknown payroll variable "${token.value}"`);
      }
      const value = this.context[token.value];
      if (!Number.isFinite(value)) {
        throw new Error(`Payroll variable "${token.value}" is not finite`);
      }
      return value;
    }

    if (this.match('leftParen')) {
      const expression = this.parseConditional();
      this.expect('rightParen');
      return expression;
    }

    throw new Error(`Unexpected token "${token.value || token.type}"`);
  }

  private evaluateFunction(name: string): number {
    const fn = FUNCTIONS[name];
    if (!fn) {
      throw new Error(`Unsupported payroll function "${name}"`);
    }

    const args: number[] = [];
    if (!this.match('rightParen')) {
      do {
        args.push(toNumber(this.parseConditional()));
      } while (this.match('comma'));
      this.expect('rightParen');
    }

    if (args.length === 0) {
      throw new Error(
        `Payroll function "${name}" requires at least one argument`,
      );
    }

    return fn(...args);
  }

  private match(type: TokenType): boolean {
    if (this.current().type !== type) {
      return false;
    }
    this.advance();
    return true;
  }

  private matchOperator(operator: string): boolean {
    if (
      this.current().type !== 'operator' ||
      this.current().value !== operator
    ) {
      return false;
    }
    this.advance();
    return true;
  }

  private expect(type: TokenType): Token {
    if (this.current().type !== type) {
      throw new Error(
        `Expected ${type}, got "${this.current().value || this.current().type}"`,
      );
    }
    return this.advance();
  }

  private current(): Token {
    return this.tokens[this.index];
  }

  private advance(): Token {
    return this.tokens[this.index++];
  }
}

function toNumber(value: PayrollExpressionValue): number {
  return typeof value === 'boolean' ? Number(value) : value;
}

function toBoolean(value: PayrollExpressionValue): boolean {
  return typeof value === 'boolean' ? value : value !== 0;
}
