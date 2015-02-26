describe('flat-cache', function () {
  'use strict';
  var expect = require('chai').expect;
  var readJSON = require('read-json-sync');
  var path = require('path');
  var del = require('del');

  beforeEach(function () {

    del.sync([path.resolve(__dirname, '../../.cache/'), path.resolve(__dirname, '../fixtures/.cache/')], {
      force: true
    });
  });

  afterEach(function() {

    del.sync([path.resolve(__dirname, '../../.cache/'), path.resolve(__dirname, '../fixtures/.cache/')], {
      force: true
    });
  });

  it('should create a cache object if none existed in disc with the given id', function () {
    var cache = require('../../cache').load('someId');
    expect(cache.keys().length).to.equal(0);
  });

  it('should set a key and persist it', function () {
    var cache = require('../../cache').load('someId');
    var data = {
      foo: 'foo',
      bar: 'bar'
    };

    cache.setKey('some-key', data);
    expect(cache.getKey('some-key')).to.deep.equal(data);

    cache.save();
    expect(readJSON(path.resolve(__dirname, '../../.cache/someId'))['some-key']).to.deep.equal(data);
  });

  it('should remove a key from the cache object and persist the change', function () {
    var cache = require('../../cache').load('someId');
    var data = {
      foo: 'foo',
      bar: 'bar'
    };

    cache.setKey('some-key', data);
    expect(cache.getKey('some-key')).to.deep.equal(data);
    cache.save();

    cache.removeKey('some-key');
    expect(readJSON(path.resolve(__dirname, '../../.cache/someId'))['some-key'], 'value is still in the persisted storage').to.deep.equal(data);

    cache.save();
    expect(readJSON(path.resolve(__dirname, '../../.cache/someId'))['some-key']).to.be.undefined
  });

  describe('loading an existing cache', function () {
    beforeEach(function () {
      var cache = require('../../cache').load('someId');
      cache.setKey('foo', {
        bar: 'baz'
      });
      cache.setKey('bar', {
        foo: 'baz'
      });
      cache.save();
    });

    it('should load an existing cache', function () {
      var cache = require('../../cache').load('someId');
      expect(readJSON(path.resolve(__dirname, '../../.cache/someId'))).to.deep.equal(cache._persisted);
    });

    it('should return the same structure if load called twice with the same docId', function () {
      var cache = require('../../cache').load('someId');
      var cache2 = require('../../cache').load('someId');

      expect(cache._persisted).to.deep.equal(cache2._persisted);

    });

    it('should remove the key and persist the new state', function () {
      var cache = require('../../cache').load('someId');
      cache.removeKey('foo');
      cache.save();
      expect(readJSON(path.resolve(__dirname, '../../.cache/someId'))).to.deep.equal({
        bar: {
          foo: 'baz'
        }
      });
    });

  });

  describe('loading an existing cache custom directory', function () {
    beforeEach(function () {
      var cache = require('../../cache').load('someId', path.resolve(__dirname, '../fixtures/.cache'));
      cache.setKey('foo', {
        bar: 'baz'
      });
      cache.setKey('bar', {
        foo: 'baz'
      });
      cache.save();
    });

    it('should load an existing cache', function () {
      var cache = require('../../cache').load('someId', path.resolve(__dirname, '../fixtures/.cache'));
      expect(readJSON(path.resolve(__dirname, '../fixtures/.cache/someId'))).to.deep.equal(cache._persisted);
    });

    it('should return the same structure if load called twice with the same docId', function () {
      var cache = require('../../cache').load('someId', path.resolve(__dirname, '../fixtures/.cache'));
      var cache2 = require('../../cache').load('someId', path.resolve(__dirname, '../fixtures/.cache') );

      expect(cache._persisted).to.deep.equal(cache2._persisted);

    });


  });

});