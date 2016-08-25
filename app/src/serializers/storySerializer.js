'use strict';

var logger = require('logger');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;
const ALL_ATTRIBUTES = ['name', 'title', 'createdAt', 'created_at', 'updatedAt', 'updated_at', 'visible', 'details', 'date', 'email', 'location', 'media', 'lat', 'lng', 'hideUser'];
var storySerializer = new JSONAPISerializer('story', {
    attributes: ALL_ATTRIBUTES,
    typeForAttribute: function(attribute, record) {
        return attribute;
    },
    media: {
        attributes: ['url', 'embed_url', 'embedUrl', 'preview_url', 'previewUrl', 'mime_type', 'mimeType', 'order']
    },
    keyForAttribute: 'camelCase'
});

class StorySerializer {

    static serialize(data, attributes) {
        if (attributes) {
            storySerializer.opts.attributes = attributes.split(',');
        } else {
            storySerializer.opts.attributes = ALL_ATTRIBUTES;
        }

        return storySerializer.serialize(data);
    }
}

module.exports = StorySerializer;
