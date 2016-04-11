'use strict';

var logger = require('logger');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var userSerializer = new JSONAPISerializer('user', {
    attributes: ['fullName', 'provider', 'providerId', 'email', 'createdAt', 'sector', 'primaryResponsibilities', 'country', 'state', 'city', 'howDoYouUse'],
    typeForAttribute: function (attribute, record) {
        return attribute;
    },
    keyForAttribute: 'camelCase' 
});

class UserSerializer {

  static serialize(data) {
    return userSerializer.serialize(data);
  }
}

module.exports = UserSerializer;
