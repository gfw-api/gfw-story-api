const logger = require('logger');
const JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
const cartoDBService = require('services/cartoDBService');
const Story = require('models/story.model');
const StorySerializer = require('serializers/storySerializer');
const mailService = require('services/mailService');
const config = require('config');
const ctRegisterMicroservice = require('ct-register-microservice-node');

const deserializer = (obj) => (callback) => {
    new JSONAPIDeserializer({ keyForAttribute: 'camelCase' }).deserialize(obj, callback);
};

class StoryService {

    static formatStory(story) {
        if (!story) {
            return {};
        }

        const newStory = {
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

    static* updateStory(id, data) {
        if (data.loggedUser) {
            data.userId = data.loggedUser.id;
            if (data.hideUser === true) {
                logger.info('Hide User. Removing name and email');
                data.name = '';
                data.email = '';
            }
        }
        const story = yield cartoDBService.updateStory(id, data);
        yield Story.where({
            id,
            userId: data.loggedUser.id
        }).findOneAndRemove();
        const storyFormat = StoryService.formatStory(story);
        yield new Story(storyFormat).save();
        return StorySerializer.serialize(storyFormat);
    }

    static* createStory(data) {
        // if user is logged. this param is add by api-gateway
        if (data.loggedUser) {
            data.userId = data.loggedUser.id;
            if (data.hideUser === true) {
                logger.info('Hide User. Removing name and email');
                data.name = '';
                data.email = '';
            }
        }

        const story = yield cartoDBService.createStory(data);
        logger.debug('Saving new story in cache', story);
        const storyFormat = StoryService.formatStory(story);
        yield new Story(storyFormat).save();
        logger.debug('Checking if email is defined to send email');
        if (data.loggedUser) {
            let language = 'en';
            let user = null;
            if (data.loggedUser) {
                logger.info('Obtaining user', `/user/${data.loggedUser.id}`);
                try {
                    const result = yield ctRegisterMicroservice.requestToMicroservice({
                        uri: `/user/${data.loggedUser.id}`,
                        method: 'GET',
                        json: true
                    });

                    user = yield deserializer(result);
                    if (user.language) {
                        logger.info('Setting user language to send email');
                        language = user.language.toLowerCase().replace(/_/g, '-');
                    }
                } catch (e) {
                    logger.error('error obtaining user', e);
                }

            }
            const template = `${config.get('mailStory.template')}-${language}`;
            mailService.sendMail(template, {
                name: storyFormat.name,
                story_url: config.get('mailStory.myStories')
            }, [{
                address: user.email
            }]);
            logger.info('Email sended to user with template', template);

        }
        logger.info('sending email to WRI');
        let wriRecipients = config.get('wriMailStory.recipients').split(',');
        wriRecipients = wriRecipients.map((mail) => ({
            address: mail
        }));
        mailService.sendMail(config.get('wriMailStory.template'), {
            story_url: config.get('mailStory.urlDetail') + storyFormat.id
        }, wriRecipients);

        return StorySerializer.serialize(storyFormat);
    }

    static* getUser(id) {
        try {
            logger.debug('Doing request to /user');
            const result = yield ctRegisterMicroservice.requestToMicroservice({
                uri: `/user/${id}`,
                method: 'GET',
                json: true
            });

            return yield deserializer(result);
        } catch (e) {
            logger.error(e);
            return null;
        }
    }

    static* getStoryById(id, fields) {
        logger.debug('Searching in cache');
        let story = yield Story.findOne({ id });

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

        delete story.populatedUser;
        return StorySerializer.serialize(story, fields);
    }

    static formatStories(stories) {
        const newStories = [];

        if (stories) {
            for (let i = 0, { length } = stories; i < length; i++) {
                newStories.push(StoryService.formatStory(stories[i]));
            }
        }
        return newStories;
    }

    static* cacheAllStories(stories) {
        logger.debug('Removing cache');
        yield Story.remove({});
        logger.debug('Populating cache');
        for (let i = 0, { length } = stories; i < length; i++) {
            yield new Story(stories[i]).save();
        }
    }

    static* getStories(filters) {
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

    static* getStoriesByUser(userId, fields) {
        try {
            let stories = yield cartoDBService.getStoriesByUser(userId);
            stories = StoryService.formatStories(stories);
            return StorySerializer.serialize(stories, fields);
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }

    static* deleteStoryById(id, userId) {
        const story = yield Story.where({
            id,
            userId
        }).findOneAndRemove();

        yield cartoDBService.deleteStoryById(id);

        return StorySerializer.serialize(story);
    }

}

module.exports = StoryService;
