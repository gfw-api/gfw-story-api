'use strict';
var logger = require('logger');
var should = require('should');
var assert = require('assert');
var StorySerializer = require('serializers/storySerializer');

describe('Story serializer test', function() {
    var story = {
        name: 'pruebaRA',
        title: 'titulo',
        createdAt: '2016-04-12T15:41:38.000Z',
        updatedAt: '2016-04-12T15:41:38.125Z',
        id: '9',
        visible: true,
        details: 'Detalles',
        date: '2012-07-10T00:00:00.000Z',
        email: 'raul.requero@vizzuality.com',
        location: 'Segovia',
        userId: 'aaaa',
        media: [{
            url: '',
            embed_url: '',
            preview_url: '',
            mime_type: 'image/jpeg',
            order: 0
        }, {
            url: '20131022123544995734_20.jpg',
            embed_url: '',
            preview_url: 'thumb_20131022123544995734_20.jpg',
            mime_type: 'image/jpeg',
            order: 1
        }],
        lat: 40.4344902028538,
        lng: -3.70132373942569
    };


    before(function*() {

    });

    it('Generate correct jsonapi response of the story', function() {
        let response = StorySerializer.serialize(story);
        response.should.not.be.a.Array();
        response.should.have.property('data');
        let data = response.data;
        data.should.have.property('type');
        data.should.have.property('attributes');
        data.should.have.property('id');
        data.type.should.equal('story');
        data.id.should.equal(story.id);
        data.attributes.should.have.property('name');
        data.attributes.should.have.property('title');
        data.attributes.should.have.property('createdAt');
        data.attributes.should.have.property('updatedAt');
        data.attributes.should.have.property('visible');
        data.attributes.should.have.property('details');
        data.attributes.should.have.property('date');
        data.attributes.should.have.property('email');
        data.attributes.should.have.property('location');
        data.attributes.should.have.property('userId');
        data.attributes.should.have.property('media');

        data.attributes.name.should.be.equal(story.name);
        data.attributes.title.should.be.equal(story.title);
        data.attributes.createdAt.should.be.equal(story.createdAt);
        data.attributes.updatedAt.should.be.equal(story.updatedAt);
        data.attributes.visible.should.be.equal(story.visible);
        data.attributes.details.should.be.equal(story.details);
        data.attributes.date.should.be.equal(story.date);
        data.attributes.email.should.be.equal(story.email);
        data.attributes.location.should.be.equal(story.location);
        data.attributes.userId.should.be.equal(story.userId);
        data.attributes.media.should.be.length(story.media.length);

    });


    after(function*() {

    });
});
