'use strict';

const logger = require('logger');
const JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
const cartoDBService = require('services/cartoDBService');
const Story = require('models/story');
const StorySerializer = require('serializers/storySerializer');
const mailService = require('services/mailService');
const config = require('config');
const ctRegisterMicroservice = require('ct-register-microservice-node');

const deserializer = function(obj){
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
            lng: story.lng,
            hideUser: story.hide_user || story.hideUser
        };

        if (story.hideUser !== true) {
            newStory.userId = story.user_id;
        }

        return newStory;
    }

    static * updateStory(id, data){
        if (data.loggedUser) {
            data.userId = data.loggedUser.id;
            if(data.hideUser === true) {
                logger.info('Hide User. Removing name and email');
                data.name = '';
                data.email = '';
            }
        }
        let story = yield cartoDBService.updateStory(id, data);
        yield Story.where({
          id: id,
          userId: data.loggedUser.id
        }).findOneAndRemove();
        let storyFormat = StoryService.formatStory(story);
        yield new Story(storyFormat).save();
        return StorySerializer.serialize(storyFormat);
    }

    static * createStory(data){
        //if user is logged. this param is add by api-gateway
        if (data.loggedUser) {
            data.userId = data.loggedUser.id;
            if(data.hideUser === true) {
                logger.info('Hide User. Removing name and email');
                data.name = '';
                data.email = '';
            }
        }

        let story = yield cartoDBService.createStory(data);
        logger.debug('Saving new story in cache', story);
        let storyFormat = StoryService.formatStory(story);
        yield new Story(storyFormat).save();
        logger.debug('Checking if email is defined to send email', data.loggedUser);
        if(data.loggedUser){
            let language = 'en';
            if (data.loggedUser) {
                logger.info('Obtaining user', '/user/' + data.loggedUser.id);
                try {
                    let result = yield ctRegisterMicroservice.requestToMicroservice({
                        uri: '/user/' + data.loggedUser.id,
                        method: 'GET',
                        json: true
                    });
                    
                    let user = yield deserializer(result);
                    if (user.language) {
                        logger.info('Setting user language to send email');
                        language = user.language.toLowerCase().replace(/_/g, '-');
                    }
                } catch(e) {
                    logger.error('error obtaining user',e);
                }

            }
            let template = `${config.get('mailStory.template')}-${language}`;
            mailService.sendMail(template, {
                name: storyFormat.name,
                story_url: config.get('mailStory.myStories')
            },[{
                address: data.loggedUser.email
            }]);

        }
        logger.info('sending email to WRI');
        let wriRecipients = config.get('wriMailStory.recipients').split(',');
        wriRecipients = wriRecipients.map(function(mail){
            return {
                address: mail
            };
        });
        mailService.sendMail(config.get('wriMailStory.template'), {
            story_url: config.get('mailStory.urlDetail') + storyFormat.id
        },wriRecipients);

        return StorySerializer.serialize(storyFormat);
    }

    static * getUser(id) {
        try{
            logger.debug('Doing request to /user');
            let result = yield ctRegisterMicroservice.requestToMicroservice({
                uri:  '/user/' + id,
                method: 'GET',
                json: true
            });
            
            return yield deserializer(result);
        }catch(e){
            logger.error(e);
            return null;
        }
    }

    static * getStoryById(id, fields){
        logger.debug('Searching in cache');
        let story = yield Story.findOne({ id: id });

        if (!story) {
            logger.debug('Not find in cache. Obtaining of cartodb');
            story = yield cartoDBService.getStoryById(id);
            if (!story) {
                return null;
            }
            story = StoryService.formatStory(story);
            story = yield new Story(story).save();

        } else {
            logger.debug('Found in cache. Returning');
        }

        // if (story.userId && !story.hideUser && !story.populatedUser) {
        //     logger.debug('Populating name and email from user api');
        //     let user = yield StoryService.getUser(story.userId);
        //     if (user ) {
        //         story.name = user.fullName;
        //         story.email = user.email;
        //         story.populatedUser = true;
        //
        //         try {
        //             yield story.save();
        //         } catch(e) {
        //             logger.error(e);
        //         }
        //     } else {
        //         logger.warn('User not exist');
        //     }
        // }

        // delete populatedUser  property  for not show this property to final user
        delete story.populatedUser;
        return StorySerializer.serialize(story, fields);
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

    static * getStories(filters){
        try {
            let stories = yield cartoDBService.getStories(filters);
            stories = StoryService.formatStories(stories);
            yield StoryService.cacheAllStories(stories);
            return StorySerializer.serialize(stories, filters.fields);
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }

    static * getStoriesByUser(user_id, fields){
        try {
            let stories = yield cartoDBService.getStoriesByUser(user_id);
            stories = StoryService.formatStories(stories);
            return StorySerializer.serialize(stories, fields);
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

        yield cartoDBService.deleteStoryById(id);

        return StorySerializer.serialize(story);
    }

}

module.exports = StoryService;
