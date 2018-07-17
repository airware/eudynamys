/* eslint-disable no-console, newline-per-chained-call, no-await-in-loop */
const AWS = require('aws-sdk');
const dynamodbLocal = require('dynamodb-localhost');

const tableDefinition = require('./data/table-definition');
const tableSeed = require('./data/table-seed');

const DYNAMODB_PORT = 4569;
const BATCH_MAX = 25;

const QueryBuilder = require('../QueryBuilder');

describe('QueryBuilder', () => {
  const debug = () => {};
  let dbDocClient;

  beforeAll(async () => {
    jest.setTimeout(10000);
    try {
      if (process.env.DDBLOCAL === 'true') {
        // Installing, immediate if already installed
        await new Promise(dynamodbLocal.install);
        // Start dynamodb local server
        dynamodbLocal.start({
          port: DYNAMODB_PORT,
        });
      }
      // Setup AWS SDK
      AWS.config.dynamodb = {
        endpoint: `http://localhost:${DYNAMODB_PORT}`,
        region: 'localhost',
      };

      // Create sample table
      const dynamodb = new AWS.DynamoDB();

      // Create table
      await dynamodb.createTable(tableDefinition).promise();
      await dynamodb.waitFor('tableExists', {
        TableName: tableDefinition.TableName,
      }).promise();

      dbDocClient = new AWS.DynamoDB.DocumentClient();
      // Seed table
      // Really simple batch write, assuming we shouldn't have error locally
      while (tableSeed.length > 0) {
        const params = {
          RequestItems: {
            [tableDefinition.TableName]: tableSeed.splice(0, BATCH_MAX).map(i => ({
              PutRequest: {
                Item: i,
              },
            })),
          },
        };
        await dbDocClient.batchWrite(params).promise();
        // Wait 50 ms
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      return dbDocClient;
    } catch (err) {
      console.error('Error in test setup:', err);
      throw err;
    }
  });

  afterAll(() => {
    if (process.env.DDBLOCAL === 'true') {
      // Stop dynamodb local server, will delete table as well
      dynamodbLocal.stop(DYNAMODB_PORT);
    }
  });

  describe('get', () => {
    it('should accept `table` `where` `eq` `and` statements', async () => {
      const qb = new QueryBuilder(dbDocClient, debug);
      const data = await qb.table('sample')
        .where('hashKey').eq('23')
        .and('uuid').eq('716d50d1-0a70-4e0b-999f-2f7de9ed6575')
        .get();

      expect(data).not.toBeUndefined();
      expect(data).toMatchObject({
        Item: {
          uuid: '716d50d1-0a70-4e0b-999f-2f7de9ed6575',
        },
      });
    });

    it('should accept `select` statement', async () => {
      const qb = new QueryBuilder(dbDocClient, debug);
      const data = await qb.select(['title', 'description', 'hashKey'])
        .from('sample')
        .where('hashKey').eq('23')
        .and('uuid').eq('3f137753-17ff-472a-95b5-baa2631b674f')
        .get();

      expect(data).not.toBeUndefined();
      expect(data).toMatchObject({
        Item: {
          hashKey: '23',
          title: 'Laborum ut magna magna quis est voluptate nostrud occaecat pariatur incididunt.',
          description: 'Exercitation ipsum voluptate est laborum in. Labore anim exercitation qui sit amet sunt aute minim elit esse. Qui tempor aliqua fugiat anim pariatur. Est irure nulla laboris velit nostrud eiusmod consequat id veniam qui magna elit occaecat. Labore eu qui ex commodo.',
        },
      });
    });
  });

  describe('query', () => {
    it('should accept `table` `where` `eq` `and` statements', async () => {
      const qb = new QueryBuilder(dbDocClient, debug);
      const data = await qb.table('sample')
        .where('hashKey').eq('15c89a6c-944d-42fb-a8e8-8b98a605dae4')
        .and('uuid').eq('c76853b2-93ab-4374-a9d5-77a4f1505ea3')
        .query();

      expect(data).not.toBeUndefined();
      expect(data).toMatchObject({
        Count: 1,
        Items: [{
          uuid: 'c76853b2-93ab-4374-a9d5-77a4f1505ea3',
          hashKey: '15c89a6c-944d-42fb-a8e8-8b98a605dae4',
          rangeKey: '66',
          type: 'Type2',
          published: true,
          createdBy: '4e3751fb-1485-4f84-b559-44c45acbf0c0',
          createdAt: 1467455992,
          updatedBy: '5',
          updatedAt: 1468172808,
          title: 'Lorem ex culpa id magna laboris sit eiusmod tempor eu nulla.',
          description: 'Nostrud anim proident laborum elit cupidatat dolore. Est id anim in nostrud irure duis deserunt qui officia. Ea amet proident aliquip culpa tempor tempor excepteur voluptate magna nostrud aliquip.',
        }],
      });
    });

    it('should accept `filter` statement #1', async () => {
      const qb = new QueryBuilder(dbDocClient, debug);
      const data = await qb.table('sample')
        .where('hashKey').eq('bdea3b5e-a272-4913-a512-c06d5083a2b6')
        .and('uuid').eq('eb57207b-c15b-4d45-825e-67346d549b2b')
        .filter('published').eq(false)
        .query();

      expect(data).not.toBeUndefined();
      expect(data.Count).toEqual(0);
    });

    it('should accept `filter` statement #2', async () => {
      const qb = new QueryBuilder(dbDocClient, debug);
      const data = await qb.table('sample')
        .where('hashKey').eq('bdea3b5e-a272-4913-a512-c06d5083a2b6')
        .and('uuid').eq('eb57207b-c15b-4d45-825e-67346d549b2b')
        .filter('published').eq(true)
        .query();

      expect(data).not.toBeUndefined();
      expect(data.Count).toEqual(1);
    });

    it('should accept advanced `filter` statement', async () => {
      const qb = new QueryBuilder(dbDocClient, debug);
      const data = await qb.select(['uuid', 'title', 'createdAt'])
        .from('sample')
        .where('hashKey').eq('5')
        .filter('published').eq(false)
        .and().begins('type', 'Ty')
        .and('createdAt').gt(1457278812)
        .query();

      expect(data).not.toBeUndefined();
      expect(data).toMatchObject({
        Count: 1,
        Items: [{
          title: 'Consequat ad esse et anim.',
          createdAt: 1466697012,
          uuid: 'df11362f-8f84-4f08-845f-9c4fff184d68',
        }],
      });
    });

    it('should accept `scanIndexForward` statement and return data in reverse order with ScanIndexForward to false', async () => {
      const qb = new QueryBuilder(dbDocClient, debug);
      const data = await qb.scanIndexForward(false)
        .table('sample')
        .index('sample-index')
        .where('rangeKey').eq('7ffdfc34-17c9-46f4-a65b-d9ee0cf0ddaf')
        .query();

      expect(data).not.toBeUndefined();
      expect(data.Items).not.toBeUndefined();
      expect(data.Count).toEqual(3);
      expect(data.Items[0].uuid).toEqual('dd6bd5b4-352a-4df1-89b3-08236371032e');
      expect(data.Items[1].uuid).toEqual('d9676a28-f8a4-4f23-8f58-eabf5b669d83');
      expect(data.Items[2].uuid).toEqual('70594bf3-737f-4146-afc4-1f16b98d61cc');
    });
  });

  describe('scan', () => {
    it('should accept `table` `where` `eq` `and` statements', async () => {
      const qb = new QueryBuilder(dbDocClient, debug);
      const data = await qb.table('sample')
        .filter('hashKey').eq('35')
        .and('uuid').eq('50adbcff-2115-4107-887c-abf906f1feaf')
        .scan();

      expect(data).not.toBeUndefined();
      expect(data).toMatchObject({
        Items: [{
          uuid: '50adbcff-2115-4107-887c-abf906f1feaf',
        }],
        Count: 1,
      });
    });

    it('should accept `select` statement', async () => {
      const qb = new QueryBuilder(dbDocClient, debug);
      const data = await qb.select(['title', 'description', 'hashKey'])
        .from('sample')
        .filter('hashKey').eq('47')
        .and('uuid').eq('27472a6e-be23-442f-a103-18fe7d30b084')
        .scan();

      expect(data).not.toBeUndefined();
      expect(data).toMatchObject({
        Items: [{
          hashKey: '47',
          title: 'Culpa sit voluptate aute aliquip labore minim culpa ad commodo consectetur sunt id Lorem.',
          description: 'Occaecat minim occaecat veniam sit labore sint enim dolore qui. Fugiat mollit et duis eu. Non eiusmod qui occaecat do adipisicing fugiat velit ipsum voluptate non. Duis excepteur anim esse cupidatat consequat est anim commodo voluptate ex mollit velit enim laboris. Esse ea qui sunt eu commodo ea cillum reprehenderit esse et eiusmod veniam duis eu.',
        }],
        Count: 1,
      });
    });

    it('should accept advanced `filter` statement', async () => {
      const qb = new QueryBuilder(dbDocClient, debug);
      const data = await qb.select(['uuid', 'title', 'createdAt'])
        .from('sample')
        .filter('hashKey').eq('29')
        .and().begins('type', 'Typ')
        .and('createdAt').gt(1457278812)
        .and('published').eq(true)
        .scan();

      expect(data).not.toBeUndefined();
      expect(data).toMatchObject({
        Items: [{
          uuid: '340eb596-947a-41a8-8cf2-3a33b3714cce',
          title: 'Nulla fugiat nulla excepteur minim occaecat duis excepteur proident ex.',
          createdAt: 1458654867,
        }],
        Count: 1,
      });
    });
  });
});
