# eudynamys

[![license](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/airware/asl-validator/blob/master/LICENSE)
[![npm version](https://badge.fury.io/js/eudynamys.svg)](https://badge.fury.io/js/eudynamys)
[![CircleCI](https://circleci.com/gh/airware/eudynamys/tree/master.svg?style=shield&circle-token=f04773ae978c7ebae19f25424bf0570d5aa9b287)](https://circleci.com/gh/airware/eudynamys/tree/master)
[![codecov](https://codecov.io/gh/airware/eudynamys/branch/master/graph/badge.svg)](https://codecov.io/gh/airware/eudynamys)
[![NSP Status](https://nodesecurity.io/orgs/airware/projects/49c7c597-87c8-4f17-915c-f582a5793ad8/badge)](https://nodesecurity.io/orgs/airware/projects/49c7c597-87c8-4f17-915c-f582a5793ad8)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fairware%2Feudynamys.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fairware%2Feudynamys?ref=badge_shield)

[![NPM](https://nodei.co/npm/eudynamys.png?stars=true)](https://www.npmjs.com/package/eudynamys)

Yet another simple query builder for DynamoDB. Give it a try!

# Install
```bash
npm install --save eudynamys
```
`eudynamys` requires Node 6+.

# Usage
## Instantiate the client
```javascript
const AWS = require('aws-sdk');
const dbDocClient = new AWS.DynamoDB.DocumentClient();
const QueryBuilder = require('eudynamys');
const qb = new QueryBuilder(dbDocClient);
```

## Debug
You can pass a debug function as 2nd parameter of `QueryBuilder` constructor. It will displays the parameters passed to DynamoDB document client. Use either `console.log` or a custom logger.
```javascript
const qb = new QueryBuilder(dbDocClient, console.log);
```

## API
### Filters and methods return `this`
- `table(tableName)`, `from(tableName)` Select a table
- `index(indexName)`                    Select an index
- `item(object = {})`                   Define an item to put
- `select(attributeName = '')`          Attributes to fetch
- `exclusiveStartKey(key)`              In order to loop
- `limit(number)`                       Maximum number of items
- `count()`                             Count
- `where(keyAttributeName = '')`        Where
- `filter(attributeName = '')`          Filter
- `if(attributeName = '')`              If
- `match(joiSchema = {})`           Match a [Joi](https://www.npmjs.com/package/joi) schema
- `equals(...args)`, `eq(...args)` Equals
- `ne(...args)`                    Not equals
- `lte(...args)`                   Lower than or equal
- `lt(...args)`                    Lower than
- `gte(...args)`                   Greater than or equal
- `gt(...args)`                    Greater than
- `between(...args)`               Between
- `in(...args)`                    In
- `and(...args)`                   And
- `or(...args)`                    Or
- `not(...args)`                   Not
- `op(...args)`                    Open parenthesis
- `cp(...args)`                    Close parenthesis

### Actions, return a `Promise` resolved with `DynamoDB` response.
- `put()`
- `update()`
- `query()`
- `scan()`
- `get()`

## Example
```javascript
qb.select(['uuid', 'title', 'createdAt'])
  .from('sample')
  .where('key').eq('8e7d307b-4e1b-4f26-984b-dfc2b35bdbbc')
  .filter('published').eq(false)
  .and().begins('type', 'Ty')
  .and('createdAt').gt(1457278812)
  .query();
```

# Lint
```bash
npm run lint
```

# Test
Requires node 8+. Will install a DynamoDB local server using [dynamodb-localhost](https://www.npmjs.com/package/dynamodb-localhost), create and seed a table, and validate results.
```bash
npm run test
```


## License
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fairware%2Feudynamys.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fairware%2Feudynamys?ref=badge_large)