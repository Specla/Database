'use strict';

const assert = require('assert');
const Database = require('../');
const Validator = require('../src/Mongo/Validator');

const Config = {
  travis: {
    host: '127.0.0.1',
    port: 27017,
    username: 'specla',
    password: 'password',
    database: 'mydb'
  },
  local: {
    host: '192.168.99.100',
    port: 32768,
    database: 'specla-database'
  }
};

const DB = new Database(Config[process.env.CONFIG || 'local']);

class Item extends DB.Model {

  collection(){
    return 'items';
  }

}

class ItemWithSchema extends DB.Model {

  collection(){
    return 'items';
  }

  schema(){
    return {
      name: String
    }
  }

}

function setupDB(){
  DB.collection('items').remove(() => {
    let data = [];
    for(let i = 1; i <= 20; i++){
      data.push({ name: 'item-'+i, index: i });
    }

    DB.collection('items').insert(data);
  });
}


describe('# Create a new instance of database', () => {
  if(process.env.CONFIG){
    it('Default driver should be Mongo', () => assert.equal('mongo', DB.options.driver));
    it('Host should be 127.0.0.1', () => assert.equal('127.0.0.1', DB.options.host));
    it('Port should be 27017', () => assert.equal(27017, DB.options.port));
    it('Username should be specla', () => assert.equal('specla', DB.options.username));
    it('Password should be password', () => assert.equal('password', DB.options.password));
    it('Database should be mydb', () => assert.equal('mydb', DB.options.database));
  } else {
    it('Default driver should be Mongo', () => assert.equal('mongo', DB.options.driver));
    it('Host should be 192.168.99.100', () => assert.equal('192.168.99.100', DB.options.host));
    it('Port should be 32768', () => assert.equal(32768, DB.options.port));
    it('Database should be specla-database', () => assert.equal('specla-database', DB.options.database));
  }
});


describe('# Query Builder\n', () => {
  setupDB();

  describe('Insert data in the items collection', () => {
    it('Should insert a new item', (done) => {
      DB.collection('items').insert({ name: 'myItem' }, (err, result) => {
        if(err) throw err;

        DB.collection('items').where('name', 'myItem').get((err, result) => {
          assert.equal('myItem', result[0].name);
          done();
        });
      });
    });

    it('Should insert multiple items', (done) => {
      DB.collection('items').insert([{ name: 'itemOne'}, {name: 'itemTwo'}], (err, result) => {
        if(err) throw err;

        DB.collection('items').where('name', ['itemOne', 'itemTwo']).get((err, result) => {
          assert.equal('itemOne', result[0].name);
          assert.equal('itemTwo', result[1].name);
          done();
        });
      });
    });
  });

  describe('Update data', () => {
    it('Should update the myItem to myItemUpdated', (done) => {
      DB.collection('items').where('name', 'myItem').update({ name: 'myItemUpdated' }, (err, result) => {
        if(err) throw err;

        DB.collection('items').where('name', 'myItemUpdated').get((err, result) => {
          assert.equal('myItemUpdated', result[0].name);
          done();
        });
      });
    });

    it('Should update multiple items', (done) => {
      DB.collection('items').where('name', ['itemOne', 'itemTwo']).update({ name: 'MultiUpdate' }, (err, result) => {
        if(err) throw err;
        DB.collection('items').where('name', 'MultiUpdate').get((err, result) => {
          assert.equal('MultiUpdate', result[0].name);
          assert.equal('MultiUpdate', result[1].name);
          done();
        });
      });
    });
  });

  describe('Remove data', () => {
    it('Should remove myItemUpdated', (done) => {
      DB.collection('items').where('name', 'myItemUpdated').remove((err, result) => {
        if(err) throw err;

        DB.collection('items').where('name', 'myItemUpdated').get((err, result) => {
          assert.deepEqual([], result);
          done();
        });
      });
    });

    it('Should remove multiple items', (done) => {
      DB.collection('items').where('name', 'MultiUpdate').remove((err, result) => {
        if(err) throw err;
        DB.collection('items').where('name', 'MultiUpdate').get((err, result) => {
          assert.deepEqual([], result);
          done();
        });
      });
    });
  });

  describe('Get documents', () => {
    it('Should return all the documents', (done) => {
      DB.collection('items').get(done);
    });

    it('Should return single document', (done) => {
      DB.collection('items').where('name', 'item-1').get((err, result) => {
        if(err) throw err;
        assert.equal(1, result.length);
        assert.equal('item-1', result[0].name);
        done();
      });
    });

    it('Should return multiple documents', (done) => {
      DB.collection('items').where('name', ['item-1', 'item-2', 'item-5']).get((err, result) => {
        if(err) throw err;
        assert.equal(3, result.length);
        assert.equal('item-1', result[0].name);
        assert.equal('item-2', result[1].name);
        assert.equal('item-5', result[2].name);
        done();
      });
    });

    it('Should stream documents', () => {
      let count = 0;
      let values = ['item-1', 'item-2', 'item-5'];
      DB.collection('items').where('name', values).stream((item) => {
        assert.equal(values[count], item.name);
        count++;
        return item;
      }).done((result) => {
        assert.equal(3, result.length);
        assert.equal('item-1', result[0].name);
        assert.equal('item-2', result[1].name);
        assert.equal('item-5', result[2].name);
      });
    });
  });

  describe('Sort documents', () => {
    it('Should sort the documents by index DESC', (done) => {
      DB.collection('items').sort('index', 'DESC').get((err, result) => {
        if(err) throw err;
        let resultIndex = 0;
        for(let i = 20; i >= 1; i--){
          assert.equal(result[resultIndex].index, i);
          resultIndex++;
        }
        done();
      });
    });
  });

  describe('Limit documents', () => {
    it('Should only return 2 documents', (done) => {
      DB.collection('items').limit(2).get((err, result) => {
        if(err) throw err;
        assert.equal(2, result.length);
        assert.equal('item-1', result[0].name);
        assert.equal('item-2', result[1].name);
        done();
      });
    });
  });

  describe('Skip documents', () => {
    it('Should skip the first 2 documents', (done) => {
      DB.collection('items').skip(2).get((err, result) => {
        if(err) throw err;
        assert.equal(18, result.length);
        done();
      });
    });
  });

  describe('Register documents as models', () => {
    it('Should turn database documents to models', (done) => {
      DB.collection('items')
        .model(Item)
        .get((err, result) => {
          assert.equal('Item', result[0].constructor.name);
          done();
        });
    });
  });

  describe('Validate data agaist schema before its send to mongo', () => {
    it('Should insert document matching the schema', (done) => {
      DB.collection('items')
        .schema({ name: String, number: Number })
        .insert({ name: 'hello', number: 1 }, (err, result) => {
          assert.equal(false, DB.collection('items').schema({ name: String, number: Number }).insert({ name: 'hello', number: '1' }));
          DB.collection('items').where('name', 'hello').get((err, result) => {
            assert.equal(1, result.length);
            done();
          });
        });
    });
  });

  describe('Raw mongo connection', () => {
    it('Should give you full access to the Mongo object', (done) => {
      DB.raw((db, close) => {
        let cursor = db.collection('items').find({ name: 'item-5' });
        cursor.each((err, doc) => {
          if(err) throw err;
          if(doc !== null){
            assert.equal('item-5', doc.name);
          } else {
            close();
            done();
          }
        });
      });
    });
  });
});

describe('# Model\n', () => {
  // TODO: Find a better way to test Models
  let item = new Item({
    name: 'testItem',
  });

  describe('Create item', () => {
    it('Should create an item with the name testItem', (done) => {
      item.save((err, item) => {
        Item.find(item.get('_id'), (err, item) => {
          assert.equal('testItem', item.get('name'));
          done();
        });
      });
    });
  });

  describe('Get/Set values', () => {
    it('Should get the value', () => assert.equal('testItem', item.get('name')));
    it('Should set the value', () => {
      assert.equal('testItemUpdated', item.set('name', 'testItemUpdated').get('name'));
    });
  });

  describe('Update model', () => {
    it('Should update the model', (done) => {
      Item.where('name', 'item-4').get((err, result) => {
        result[0].set('name', 'item-4-updated');
        result[0].save((err, model) => {
          assert.equal('item-4-updated', model.get('name'));
          done();
        });
      });
    });
  });

  describe('Test model with schema', () => {
    it('Should insert a new model matching the schema', (done) => {
      let itemWithSchema = new ItemWithSchema({ name: 'testing with schema' });
      itemWithSchema.save(() => {
        Item.where('name', 'testing with schema').get((err, result) => {
          assert.equal('testing with schema', result[0].get('name'));
          done();
        });
      });
    });
  });

  describe('Remove model', () => {
    it('Should remove the model', (done) => {
      Item.where('name', 'item-6').get((err, models) => {
        models[0].delete((err) => {
          Item.where('name', 'item-6').get((err, result) => {
            assert.equal(0, result.length);
            done();
          });
        });
      });
    });
  });
});


describe('# Schema validation', () => {

  it('Should accept a string', () =>  {
    assert.equal(0, new Validator({ item: String }, { item: 'test' }).errors.length);
    assert.equal(1, new Validator({ item: String }, { item: ['test'] }).errors.length);
    assert.equal(1, new Validator({ item: String }, { item: {test: 'test'} }).errors.length);
    assert.equal(1, new Validator({ item: String }, { item: 43 }).errors.length);
    assert.equal(1, new Validator({ item: String }, { item: true }).errors.length);
  });

  it('Should accept a number', () =>  {
    assert.equal(0, new Validator({ item: Number }, { item: 1 }).errors.length);
    assert.equal(1, new Validator({ item: Number }, { item: '1' }).errors.length);
    assert.equal(1, new Validator({ item: Number }, { item: ['1'] }).errors.length);
    assert.equal(1, new Validator({ item: Number }, { item: {test: '1'} }).errors.length);
    assert.equal(1, new Validator({ item: Number }, { item: true }).errors.length);
  });

  it('Should accept a boolean', () =>  {
    assert.equal(0, new Validator({ item: Boolean }, { item: true }).errors.length);
    assert.equal(1, new Validator({ item: Boolean }, { item: '1' }).errors.length);
    assert.equal(1, new Validator({ item: Boolean }, { item: 1 }).errors.length);
    assert.equal(1, new Validator({ item: Boolean }, { item: {test: '1'} }).errors.length);
    assert.equal(1, new Validator({ item: Boolean }, { item: ['test'] }).errors.length);
  });

  it('Should accept a array', () =>  {
    assert.equal(0, new Validator({ item: Array }, { item: ['test', 'test2'] }).errors.length);
    assert.equal(1, new Validator({ item: Array }, { item: '1' }).errors.length);
    assert.equal(1, new Validator({ item: Array }, { item: 325 }).errors.length);
    assert.equal(1, new Validator({ item: Array }, { item: {test: '1'} }).errors.length);
    assert.equal(1, new Validator({ item: Array }, { item: true }).errors.length);
  });

  it('Should accept a object', () =>  {
    assert.equal(0, new Validator({ item: Object }, { item: { test: 'test' } }).errors.length);
    assert.equal(1, new Validator({ item: Object }, { item: '1' }).errors.length);
    assert.equal(1, new Validator({ item: Object }, { item: 325 }).errors.length);
    assert.equal(1, new Validator({ item: Object }, { item: ['test'] }).errors.length);
    assert.equal(1, new Validator({ item: Object }, { item: true }).errors.length);
  });

  it('Should accept a nested object', () =>  {
    assert.equal(0, new Validator({ item: { name: String } }, { item: { name: 'test' } }).errors.length);
    assert.equal(1, new Validator({ item: { name: String } }, { item: { name: 1 } }).errors.length);
    assert.equal(1, new Validator({ item: { name: String } }, { item: [{ name: 'test' }] }).errors.length);
  });

  it('Should accept a nested array with objects', () =>  {
    assert.equal(0, new Validator({ item: [{ name: String }] }, { item: [{ name: 'test' }] }).errors.length);
    assert.equal(1, new Validator({ item: [{ name: String }] }, { item: [{ name: 1 }] }).errors.length);
    assert.equal(1, new Validator({ item: [{ name: String }] }, { item: { name: 'test' } }).errors.length);
  });

});
