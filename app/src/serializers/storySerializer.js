'use strict';

var logger = require('logger');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var storySerializer = new JSONAPISerializer('story', {
    attributes: ['name', 'title', 'createdAt', 'updatedAt', 'visible', 'details', 'date', 'email', 'location', 'media', 'lat', 'lng'],
    typeForAttribute: function (attribute, record) {
        return attribute;
    },
    media:{
        attributes: ['url', 'embedUrl', 'previewUrl', 'mime_type', 'order']
    },
    keyForAttribute: 'camelCase'
});

class StorySerializer {

  static serialize(data) {
    return storySerializer.serialize(data);
  }
}

module.exports = StorySerializer;
