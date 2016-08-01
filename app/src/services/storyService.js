'use strict';

var logger = require('logger');
var JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
var cartoDBService = require('services/cartoDBService');
var Story = require('models/story');
var StorySerializer = require('serializers/storySerializer');
var mailService = require('services/mailService');
var config = require('config');

var deserializer = function(obj){
    return function(callback){
        new JSONAPIDeserializer({keyForAttribute: 'camelCase'}).deserialize(obj, callback);
    };
};

class StoryService {

    static formatStory(story) {
        if (!story) {
            return {};
        }

        let newStory = {
            name: story.name,
            title: story.title,
            createdAt: story.created_at,
            updatedAt: story.updated_at,
            id: story.id,
            visible: story.visible,
            details: story.details,
            date: story.date,
            email: story.email,
            location: story.location,
            media: story.media ? JSON.parse(story.media) : null,
            lat: story.lat,
            lng: story.lng
        };

        if (story.hideUser !== true) {
            newStory.userId = story.user_id;
        }

        return newStory;
    }

    static * createStory(data){
        //if user is logged. this param is add by api-gateway
        if (data.loggedUser && data.hideUser !== true) {
            data.userId = data.loggedUser.id;
            data.name = data.loggedUser.fullName ? data.loggedUser.fullName  : '';
            data.email = data.loggedUser.email ? data.loggedUser.email : '';
        }

        let story = yield cartoDBService.createStory(data);
        logger.debug('Saving new story in cache');
        let storyFormat = StoryService.formatStory(story);
        yield new Story(storyFormat).save();
        logger.debug('Checking if email is defined to send email');
        if(storyFormat.email){
            mailService.sendMail(config.get('mailStory.template'), {
                name: storyFormat.name,
                story_url: config.get('mailStory.urlDetail') + storyFormat.id
            },[{
                address: storyFormat.email
            }]);
        }

        return StorySerializer.serialize(storyFormat);
    }

    static * getUser(id) {
        try{
            logger.debug('Doing request to /user');
            let result = yield require('vizz.microservice-client').requestToMicroservice({
                uri:  '/user/' + id,
                method: 'GET',
                json: true
            });
            if (result.statusCode !== 200) {
                console.error('Error obtaining user:');
                console.error(result);
                return null;
            }
            return yield deserializer(result.body);
        }catch(e){
            logger.error(e);
            return null;
        }
    }

    static * getStoryById(id){
        logger.debug('Searching in cache');
        let story = yield Story.findOne({ id: id });

        if (!story) {
            logger.debug('Not find in cache. Obtaining of cartodb');
            story = yield cartoDBService.getStoryById(id);
            if (!story) {
                this.throw(404, 'Story not found');
                return;
            }
            story = StoryService.formatStory(story);
            story = yield new Story(story).save();

        } else {
            logger.debug('Found in cache. Returning');
        }

        if (story.userId && !story.populatedUser) {
            logger.debug('Populating name and email from user api');
            let user = yield StoryService.getUser(story.userId);
            if (user ) {
                story.name = user.fullName;
                story.email = user.email;
                story.populatedUser = true;

                try {
                    yield story.save();
                } catch(e) {
                    logger.error(e);
                }
            } else {
                logger.warn('User not exist');
            }
        }

        // delete populatedUser  property  for not show this property to final user
        delete story.populatedUser;
        return StorySerializer.serialize(story);
    }

    static formatStories(stories) {
        let newStories = [];

        if (stories) {
            for (let i = 0, length = stories.length; i < length; i++) {
                newStories.push(StoryService.formatStory(stories[i]));
            }
        }
        return newStories;
    }

    static * cacheAllStories(stories) {
        logger.debug('Removing cache');
        yield Story.remove({});
        logger.debug('Populating cache');
        for (let i = 0, length = stories.length; i < length; i++) {
            yield new Story(stories[i]).save();
        }
    }

    static * getStories(){
        try {
            let stories = yield cartoDBService.getStories();
            stories = StoryService.formatStories(stories);
            yield StoryService.cacheAllStories(stories);
            return StorySerializer.serialize(stories);
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }

    static * getStoriesByUser(user_id){
        try {
            let stories = yield cartoDBService.getStoriesByUser(user_id);
            stories = StoryService.formatStories(stories);
            return StorySerializer.serialize(stories);
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }

    static * deleteStoryById(id, userId) {
        let story = yield Story.where({
          id: id,
          userId: userId
        }).findOneAndRemove();

        if (story) {
          yield cartoDBService.deleteStoryById(id);
        }

        return StorySerializer.serialize(story);
    }

}

module.exports = StoryService;
