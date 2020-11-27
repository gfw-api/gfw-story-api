const Router = require('koa-router');
const logger = require('logger');
const StoryValidator = require('validators/storyValidator');
const StoryService = require('services/storyService');

const router = new Router({
    prefix: '/story'
});

class StoryRouter {

    static async createStory(ctx) {
        logger.info('Creating story with body', ctx.request.body);
        try {
            ctx.body = await StoryService.createStory(ctx.request.body);

        } catch (err) {
            logger.error(err);
            throw err;
        }
    }

    static async getStories(ctx) {
        logger.info('Obtaining stories');
        ctx.body = await StoryService.getStories(ctx.request.query);
    }

    static async getStoriesByUser(ctx) {
        logger.info('Obtaining stories for user with ID', ctx.request.params.user_id);
        ctx.body = await StoryService.getStoriesByUser(ctx.request.params.user_id, ctx.request.query.fields);
    }

    static async getStoryById(ctx) {
        logger.info('Obtaining stories by id %s', ctx.request.params.id);
        ctx.assert(ctx.request.params.id, 400, 'Id param required');
        const story = await StoryService.getStoryById(ctx.request.params.id, ctx.request.query.fields);
        if (!story) {
            ctx.throw(404, 'Story not found');
            return;
        }
        ctx.body = story;
    }

    static async deleteStory(ctx) {
        logger.info('Deleting story by id %s', ctx.request.params.id);
        try {
            const story = await StoryService.deleteStoryById(
                ctx.request.params.id, JSON.parse(ctx.request.query.loggedUser).id
            );

            if (!story) {
                logger.error('Story not found');
                ctx.throw(404, 'Story not found');
                return;
            }

            ctx.body = story;
        } catch (err) {
            logger.error(err);
            throw err;
        }
    }

    static async updateStory(ctx) {
        logger.info('Updating story by id %s', ctx.request.params.id);
        try {
            const story = await StoryService.updateStory(
                ctx.request.params.id, ctx.request.body
            );

            if (!story) {
                logger.error('Story not found');
                ctx.throw(404, 'Story not found');
                return;
            }

            ctx.body = story;
        } catch (err) {
            logger.error(err);
            throw err;
        }
    }

}

router.get('/', StoryRouter.getStories);
router.get('/user/:user_id', StoryRouter.getStoriesByUser);
router.get('/:id', StoryValidator.getStoryById, StoryRouter.getStoryById);
router.delete('/:id', StoryValidator.getStoryById, StoryRouter.deleteStory);
router.put('/:id', StoryValidator.getStoryById, StoryRouter.updateStory);
router.post('/', StoryRouter.createStory);


module.exports = router;
