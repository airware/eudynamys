const _ = require('lodash');

class ConditionsExpression {
  constructor(queryBuilder, attributeName = '', type = 'where', debug = () => {}) {
    if (!_.isString(attributeName)) {
      throw new Error('InvalidKey Exception');
    }

    let key = '';
    // This allows us to start with something else than an attribute name
    if (attributeName.length > 0) {
      key = queryBuilder.setAttributeName(attributeName);
    }

    this._queryBuilder = queryBuilder;
    this._expression = `(${key}`;
    this._key = {};
    this._type = type;
    this._lastKey = attributeName;
    this._debug = debug;
  }

  _completeExpression(str) {
    this._expression = `${this._expression} ${str}`;
  }

  _operator(operator = '=') {
    return (...args) => {
      let values = [];
      const argsCopy = _.flatten(args); // Don't understand why I need to do that...
      this._completeExpression(operator);
      this._debug(operator);
      this._debug(argsCopy);
      switch (true) {
        // 0 or 1 argument
        case _.includes(['=', '<>', '<=', '<', '>=', '>',
          '(', ')', 'OR', 'NOT', 'AND',
        ], operator):
          if (argsCopy.length > 1) {
            throw new Error('InvalidExpression Exception');
          } else if (argsCopy.length === 1) {
            let tmpKey = null;
            if (operator === 'AND' || operator === 'OR' || operator === '(') {
              this._lastKey = argsCopy[0];
              tmpKey = this._queryBuilder.setAttributeName(argsCopy[0]);
            } else {
              tmpKey = this._queryBuilder.setAttributeValue(argsCopy[0]);
            }
            if (operator === '=') {
              this._key[this._lastKey] = argsCopy[0];
            }
            this._completeExpression(tmpKey);
          }
          break;

        // 2 arguments specific syntax
        case operator === 'BETWEEN':
          values = [];
          for (let i = 0; i < argsCopy.length; i++) {
            const tmpKey = this._queryBuilder.setAttributeValue(argsCopy[i]);
            values.push(tmpKey);
          }
          this._completeExpression(values.join(' AND '));
          break;

        // n arguments (n >= 1)
        case operator === 'IN':
          if (argsCopy.length === 0) {
            throw new Error('InvalidExpression Exception');
          } else {
            values = [];
            for (let i = 0; i < argsCopy.length; i++) {
              const tmpKey = this._queryBuilder.setAttributeValue(argsCopy[i]);
              values.push(tmpKey);
            }
            this._completeExpression(`(${values.join(', ')})`);
          }
          break;

        // 1 argument
        case _.includes(['attribute_not_exists', 'attribute_exists', 'size'], operator):
          if (argsCopy.length !== 1) {
            throw new Error('InvalidExpression Exception');
          } else {
            const tmpKey = this._queryBuilder.setAttributeName(argsCopy[0]);
            this._completeExpression(`(${tmpKey})`);
          }
          break;

        // 2 arguments
        case _.includes(['attribute_type', 'contains', 'begins_with'], operator):
          if (argsCopy.length !== 2) {
            throw new Error('InvalidExpression Exception');
          } else {
            const tmpKey = this._queryBuilder.setAttributeName(argsCopy[0]);
            const tmpKeyValue = this._queryBuilder.setAttributeValue(argsCopy[1]);
            this._completeExpression(`(${tmpKey}, ${tmpKeyValue})`);
          }
          break;

        default: break;
      }
      return this;
    };
  }

  getKey() {
    return this._key;
  }

  getExpression() {
    return this._expression;
  }

  equals(...args) {
    return this._operator('=')(args);
  }

  eq(...args) {
    return this._operator('=')(args);
  }

  ne(...args) {
    return this._operator('<>')(args);
  }

  lte(...args) {
    return this._operator('<=')(args);
  }

  lt(...args) {
    return this._operator('<')(args);
  }

  gte(...args) {
    return this._operator('>=')(args);
  }

  gt(...args) {
    return this._operator('>')(args);
  }

  between(...args) {
    return this._operator('BETWEEN')(args);
  }

  in(...args) {
    return this._operator('IN')(args);
  }

  and(...args) {
    return this._operator('AND')(args);
  }

  or(...args) {
    return this._operator('OR')(args);
  }

  not(...args) {
    return this._operator('NOT')(args);
  }

  op(...args) {
    return this._operator('(')(args);
  }

  cp(...args) {
    return this._operator(')')(args);
  }

  notExists(...args) {
    return this._operator('attribute_not_exists')(args);
  }

  exists(...args) {
    return this._operator('attribute_exists')(args);
  }

  size(...args) {
    return this._operator('size')(args);
  }

  type(...args) {
    return this._operator('attribute_type')(args);
  }

  contains(...args) {
    return this._operator('contains')(args);
  }

  begins(...args) {
    return this._operator('begins_with')(args);
  }

  end() {
    this._expression = `${this._expression})`;
    switch (this._type) {
      case 'filter':
        this._queryBuilder.setFilterExpressionObject(this);
        break;
      case 'where':
        this._queryBuilder.setWhereExpressionObject(this);
        break;
      case 'if':
        this._queryBuilder.setConditionExpressionObject(this);
        break;
      default: break;
    }
    return this._queryBuilder;
  }

  endExpression() {
    return this.end();
  }

  filter(attributeName = '') {
    return new ConditionsExpression(this.end(), attributeName, 'filter', this._debug);
  }

  projectionExpression(expression = '') {
    return this.end().projectionExpression(expression);
  }

  updateExpression(expression = '') {
    return this.end().updateExpression(expression);
  }

  limit(number) {
    return this.end().limit(number);
  }

  put(callback) {
    return this.end().put(callback);
  }

  update(callback) {
    return this.end().update(callback);
  }

  query(callback) {
    return this.end().query(callback);
  }

  scan(callback) {
    return this.end().scan(callback);
  }

  get(callback) {
    return this.end().get(callback);
  }
}

module.exports = ConditionsExpression;
