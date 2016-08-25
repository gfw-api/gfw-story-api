'use strict';

var logger = require('logger');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var storySerializer = new JSONAPISerializer('story', {
    attributes: ['name', 'title', 'createdAt', 'created_at', 'updatedAt', 'updated_at', 'visible', 'details', 'date', 'email', 'location', 'media', 'lat', 'lng'],
    typeForAttribute: function (attribute, record) {
        return attribute;
    },
    media:{
        attributes: ['url', 'embed_url', 'embedUrl', 'preview_url', 'previewUrl', 'mime_type', 'mimeType', 'order']
    },
    keyForAttribute: 'camelCase'
});

class StorySerializer {

  static serialize(data) {
    return storySerializer.serialize(data);
  }
}

module.exports = StorySerializer;
