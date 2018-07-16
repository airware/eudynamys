const Joi = require('joi');
const _ = require('lodash');
const ConditionsExpression = require('./ConditionsExpression');
const utils = require('./utils');

class QueryBuilder {
  _init() {
    this._params = {};
    this._attributeNames = {};
    this._attributeValues = {};
    this._keyConditions = [];
    this._valueCount = 0;
    this._whereExpressionObject = null;
    this._filterExpressionObject = null;
    this._conditionExpressionObject = null;
  }

  constructor(dbDocClient = null, debugFunction = () => {}) {
    this._debug = debugFunction;
    this._dbDocClient = dbDocClient;
    this._init();
  }

  setAttributeName(attributeName = '') {
    const nestedNames = attributeName.split('.');

    const resKeys = [];

    for (let i = 0; i < nestedNames.length; i++) {
      const tmpKey = `#${_.camelCase(nestedNames[i])}`;
      this._attributeNames[tmpKey] = nestedNames[i];
      resKeys.push(tmpKey);
    }
    return resKeys.join('.');
  }

  setAttributeValue(value) {
    this._valueCount = this._valueCount + 1;
    const key = `:val${this._valueCount}`;

    this._attributeValues[key] = value;
    return key;
  }

  setWhereExpressionObject(obj) {
    this._whereExpressionObject = obj;
  }

  setFilterExpressionObject(obj) {
    this._filterExpressionObject = obj;
  }

  setConditionExpressionObject(obj) {
    this._conditionExpressionObject = obj;
  }

  table(tableName) {
    if (!utils.isString(tableName)) {
      throw new Error('InvalidTableName Exception');
    }
    this._params.TableName = tableName;
    return this;
  }

  from(tableName) {
    return this.table(tableName);
  }

  index(indexName) {
    if (!utils.isString(indexName)) {
      throw new Error('InvalidIndexName Exception');
    }
    this._params.IndexName = indexName;
    return this;
  }

  key(keyName) {
    if (!utils.isString(keyName)) {
      throw new Error('InvalidKey Exception');
    }
    this._keys.puhs(keyName);
    return this;
  }

  /**
   * item sets an object as Item for a DynamoDB.put or DynamoDB.update
   *
   * @param {Object} object the object to be set
   */
  item(object = {}) {
    this._params.Item = object;
    this._debug(object);
    return this;
  }

  /**
   * set Item to null if the given item doesn't match a given joiSchema
   *
   * @param  {Object}       joiSchema a Joi schema
   *
   * @return {QueryBuilder}   this
   */
  match(joiSchema = {}) {
    this._debug(joiSchema);
    try {
      const result = Joi.validate(this._params.Item, joiSchema);
      if (result.error) {
        this._params.Item = null;
      }
      return this;
    } catch (err) {
      this._debug(err);
      this._params.Item = null;
      return this;
    }
  }

  select(attributeName = '') {
    let attributeNames = null;
    const projections = [];

    this._debug('-- select --');
    this._debug(attributeName);

    if (_.isArray(attributeName)) {
      attributeNames = attributeName;
    } else if (utils.isString(attributeName) && attributeName === '*') {
      return this;
    } else if (utils.isString(attributeName) && attributeName !== '*') {
      attributeNames = _.map(attributeName.split(','), _.trim);
    } else {
      throw new Error('InvalidAttributeName Exception');
    }

    for (let i = 0; i < attributeNames.length; i++) {
      const tmpKey = this.setAttributeName(attributeNames[i]);
      projections.push(tmpKey);
    }
    this._params.ProjectionExpression = projections.join(', ');
    this._debug(this._params.ProjectionExpression);
    return this;
  }

  /**
   * projectionExpression sets a manual projection expression
   *
   * @param  {String} projection the manualy set projection expresion
   *
   * @return {QueryBuilder}
   */
  projectionExpression(projection = '') {
    if (!utils.isString(projection)) {
      throw new Error('InvalidProjectionExpression Exception');
    }
    this._params.ProjectionExpression = projection;
    return this;
  }

  updateExpression(update = '') {
    if (!utils.isString(update)) {
      throw new Error('InvalidUpdateExpression Exception');
    }
    this._params.UpdateExpression = update;
    return this;
  }

  /**
   * projectionExpression sets a manual parameters object
   *
   * @param  {Object} options    a AWS.DynamoDB.DocumentClient compatible param Object
   *
   * @return {QueryBuilder}
   */
  params(options) {
    Object.assign(this._params, options);
    return this;
  }

  /**
   * exclusiveStartKey sets a an exclusiveStartKey
   *
   * @param  {Object} key    the exclusiveStartKey for the next request
   *
   * @return {QueryBuilder}
   */
  exclusiveStartKey(key) {
    this._params.ExclusiveStartKey = key;
    return this;
  }

  /**
   * scanIndexForward set the order for index traversal
   * @param  {Boolean} value    If false, the traversal is performed in descending order
   *
   * @return {QueryBuilder}
   */
  scanIndexForward(value) {
    if (typeof value === 'boolean') {
      this._params.ScanIndexForward = value;
    }
    return this;
  }

  limit(number) {
    if (_.isInteger(number)) {
      this._params.Limit = number;
    } else {
      const num = _.toNumber(number);
      if (!Number.isNaN(num)) {
        this._params.Limit = num;
      }
    }
    return this;
  }

  count() {
    this._params.Select = 'COUNT';
    return this;
  }

  /**
   * where instanciates a new ConditionsExpression for DynamoDB.get
   *
   * @param  {String} keyAttributeName the first attribute name of the expression
   * @return {[type]}                  a new ConditionsExpression
   */
  where(keyAttributeName = '') {
    return new ConditionsExpression(this, keyAttributeName, 'where', this._debug);
  }

  /**
   * filter instanciates a new ConditionsExpression for DynamoDB.scan
   * and DynamoDB.query
   *
   * @param  {String} keyAttributeName the first attribute name of the expression
   * @return {[type]}                  a new ConditionsExpression
   */
  filter(attributeName = '') {
    return new ConditionsExpression(this, attributeName, 'filter', this._debug);
  }

  /**
   * if instanciates a new ConditionsExpression for DynamoDB.put
   * and DynamoDB.update
   *
   * @param  {String} keyAttributeName the first attribute name of the expression
   * @return {[type]}                  a new ConditionsExpression
   */
  if(attributeName = '') {
    return new ConditionsExpression(this, attributeName, 'if', this._debug);
  }

  put() {
    if (this._conditionExpressionObject) {
      this._params.ConditionExpression = this._conditionExpressionObject.getExpression();
    }
    if (_.size(this._attributeNames) > 0) {
      this._params.ExpressionAttributeNames = this._attributeNames;
    }
    if (_.size(this._attributeValues) > 0) {
      this._params.ExpressionAttributeValues = this._attributeValues;
    }
    this._debug(this._params);
    return this._dbDocClient.put(this._params).promise();
  }

  update() {
    if (this._conditionExpressionObject) {
      this._params.ConditionExpression = this._conditionExpressionObject.getExpression();
    }
    if (this._whereExpressionObject) {
      this._params.Key = this._whereExpressionObject.getKey();
    }
    if (_.size(this._attributeNames) > 0) {
      let words = [];
      const attributesNames = [];
      const attributesValues = [];
      if (utils.isString(this._params.UpdateExpression)) {
        // get UpdateExpression attributes and names of the UpdateExpression
        words = _.concat(words, _.words(this._params.UpdateExpression, /[a-zA-Z0-9:#]+/g));
      }
      if (utils.isString(this._params.ConditionExpression)) {
        // get UpdateExpression attributes and names of the ConditionExpression
        words = _.concat(words, _.words(this._params.ConditionExpression, /[a-zA-Z0-9:#]+/g));
      }
      words.forEach((elt) => {
        if (elt[0] === ':') {
          attributesValues.push(elt);
        } else if (elt[0] === '#') {
          attributesNames.push(elt);
        }
      });
      // cleanup ExpressionAttributeNames
      this._attributeNames = _.pick(this._attributeNames, attributesNames);
      // cleanup ExpressionAttributeValues
      this._attributeValues = _.pick(this._attributeValues, attributesValues);
    }
    if (_.size(this._attributeNames) > 0) {
      this._params.ExpressionAttributeNames = this._attributeNames;
    }
    if (_.size(this._attributeValues) > 0) {
      this._params.ExpressionAttributeValues = this._attributeValues;
    }
    this._debug(this._params);
    return this._dbDocClient.update(this._params).promise();
  }

  query() {
    if (this._whereExpressionObject) {
      this._params.KeyConditionExpression = this._whereExpressionObject.getExpression();
    }
    if (_.size(this._attributeNames) > 0) {
      this._params.ExpressionAttributeNames = this._attributeNames;
    }
    if (_.size(this._attributeValues) > 0) {
      this._params.ExpressionAttributeValues = this._attributeValues;
    }
    if (this._filterExpressionObject) {
      this._params.FilterExpression = this._filterExpressionObject.getExpression();
    }
    this._debug(this._params);
    return this._dbDocClient.query(this._params).promise();
  }

  scan() {
    if (_.size(this._attributeNames) > 0) {
      this._params.ExpressionAttributeNames = this._attributeNames;
    }
    if (_.size(this._attributeValues) > 0) {
      this._params.ExpressionAttributeValues = this._attributeValues;
    }
    if (this._filterExpressionObject) {
      this._params.FilterExpression = this._filterExpressionObject.getExpression();
    }
    this._debug(this._params);
    return this._dbDocClient.scan(this._params).promise();
  }

  get() {
    if (this._whereExpressionObject) {
      this._params.Key = this._whereExpressionObject.getKey();
    }
    if (_.size(this._attributeNames) > 0 && _.isString(this._params.ProjectionExpression)) {
      // removes all attributesNames that are not specified the 2nd parameter
      const projectAttributesNames = _.map(this._params.ProjectionExpression.split(','), _.trim);
      this._attributeNames = _.pick(this._attributeNames, projectAttributesNames);
      this._params.ExpressionAttributeNames = this._attributeNames;
    }
    this._debug(this._params);
    return this._dbDocClient.get(this._params).promise();
  }
}

module.exports = QueryBuilder;
