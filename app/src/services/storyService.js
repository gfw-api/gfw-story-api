const logger = require('logger');
const JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
const cartoDBService = require('services/cartoDBService');
const Story = require('models/story.model');
const StorySerializer = require('serializers/storySerializer');
const mailService = require('services/mailService');
const config = require('config');
const { RWAPIMicroservice } = require('rw-api-microservice-node');

const deserializer = async (obj) => new JSONAPIDeserializer({ keyForAttribute: 'camelCase' }).deserialize(obj);

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

    static async updateStory(id, data) {
        if (data.loggedUser) {
            data.userId = data.loggedUser.id;
            if (data.hideUser === true) {
                logger.info('Hide User. Removing name and email');
                data.name = '';
                data.email = '';
            }
        }
        const story = await cartoDBService.updateStory(id, data);
        await Story.where({
            id,
            userId: data.loggedUser.id
        }).findOneAndRemove();
        const storyFormat = StoryService.formatStory(story);
        await new Story(storyFormat).save();
        return StorySerializer.serialize(storyFormat);
    }

    static async createStory(data) {
        // if user is logged. this param is add by api-gateway
        if (data.loggedUser) {
            data.userId = data.loggedUser.id;
            if (data.hideUser === true) {
                logger.info('Hide User. Removing name and email');
                data.name = '';
                data.email = '';
            }
        }

        const story = await cartoDBService.createStory(data);
        logger.debug('Saving new story in cache', story);
        const storyFormat = StoryService.formatStory(story);
        await new Story(storyFormat).save();
        logger.debug('Checking if email is defined to send email');
        if (data.loggedUser) {
            let language = 'en';
            let user = null;
            if (data.loggedUser) {
                logger.info('Obtaining user', `/user/${data.loggedUser.id}`);
                try {
                    const result = await RWAPIMicroservice.requestToMicroservice({
                        uri: `/v1/user/${data.loggedUser.id}`,
                        method: 'GET',
                        json: true
                    });

                    user = await deserializer(result);
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

    static async getUser(id) {
        try {
            logger.debug('Doing request to /user');
            const result = await RWAPIMicroservice.requestToMicroservice({
                uri: `/v1/user/${id}`,
                method: 'GET',
                json: true
            });

            return await deserializer(result);
        } catch (e) {
            logger.error(e);
            return null;
        }
    }

    static async getStoryById(id, fields) {
        logger.debug('Searching in cache');
        let story = await Story.findOne({ id });

        if (!story) {
            logger.debug('Not find in cache. Obtaining of cartodb');
            story = await cartoDBService.getStoryById(id);
            if (!story) {
                return null;
            }
            story = StoryService.formatStory(story);
            story = await new Story(story).save();

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

    static async cacheAllStories(stories) {
        logger.debug('Removing cache');
        await Story.remove({});
        logger.debug('Populating cache');
        for (let i = 0, { length } = stories; i < length; i++) {
            await new Story(stories[i]).save();
        }
    }

    static async getStories(filters) {
        try {
            let stories = await cartoDBService.getStories(filters);
            stories = StoryService.formatStories(stories);
            await StoryService.cacheAllStories(stories);
            return StorySerializer.serialize(stories, filters.fields);
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }

    static async getStoriesByUser(userId, fields) {
        try {
            let stories = await cartoDBService.getStoriesByUser(userId);
            stories = StoryService.formatStories(stories);
            return StorySerializer.serialize(stories, fields);
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }

    static async deleteStoryById(id, userId) {
        const story = await Story.where({
            id,
            userId
        }).findOneAndRemove();

        await cartoDBService.deleteStoryById(id);

        return StorySerializer.serialize(story);
    }

    static async deleteByUserId(userId) {
        logger.debug(`[StoryService]: Delete stories for user with id:  ${userId}`);
        const userStories = await Story.find({ userId: { $eq: userId } }).exec();

        if (userStories) {
            for (let i = 0; i < userStories.length; i++) {
                const currentStory = userStories[i];
                const currentStoryId = currentStory.toObject()._id.toString();

                logger.debug('[StoryService]: Deleting story from CartoDB service');
                await cartoDBService.deleteStoryById(currentStoryId);
                logger.info(`[DBACCESS-DELETE]: story.id: ${currentStoryId}`);
                await currentStory.remove();
            }
        }

        return StorySerializer.serialize(userStories);
    }

}

module.exports = StoryService;
