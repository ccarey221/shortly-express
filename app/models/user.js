var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  initialize: function(userObj) {
    this.on('creating', function(model, attrs, options) {
      model.set('username', userObj.username);
      model.set('password', userObj.password);
    });
  }
});

module.exports = User;



//ghetto query
  // Users
  //   .query('where', 'username', 'LIKE', '%')
  //   .fetch()
  //   .then(function(model) {
  //     console.log('model', model.models);
  //   });
