const Router = require('koa-router');
const logger = require('logger');
const StoryValidator = require('validators/storyValidator');
const StoryService = require('services/storyService');
const UserService = require('services/userService');

const router = new Router({
    prefix: '/story'
});

class StoryRouter {

    static async createStory(ctx) {
        logger.info('Creating story with body', ctx.request.body);
        try {
            ctx.body = await StoryService.createStory(ctx.request.body, ctx.request.headers['x-api-key']);

        } catch (err) {
            logger.error(err);
            throw err;
        }
    }

    static async getStories(ctx) {
        logger.info('Obtaining stories');
        ctx.body = await StoryService.getStories(ctx.request.query, ctx.request.headers['x-api-key']);
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

    static async deleteByUserId(ctx) {
        const userIdToDelete = ctx.params.userId;

        try {
            await UserService.getUserById(userIdToDelete, ctx.request.headers['x-api-key']);
        } catch (error) {
            ctx.throw(404, `User ${userIdToDelete} does not exist`);
        }

        logger.info(`[StoryRouter] Deleting all stories for user with id: ${userIdToDelete}`);
        try {
            ctx.body = await StoryService.deleteByUserId(userIdToDelete);
        } catch (err) {
            logger.error(`Error deleting stories from user ${userIdToDelete}`, err);
            ctx.throw(500, `Error deleting stories from user ${userIdToDelete}`);
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

const isAuthenticatedMiddleware = async (ctx, next) => {
    logger.info(`Verifying if user is authenticated`);
    const { query, body } = ctx.request;

    const user = { ...(query.loggedUser ? JSON.parse(query.loggedUser) : {}), ...body.loggedUser };

    if (!user || !user.id) {
        ctx.throw(401, 'Unauthorized');
        return;
    }
    await next();
};

const deleteResourceAuthorizationMiddleware = async (ctx, next) => {
    logger.info(`[StoryRouter] Checking delete by user authorization`);
    const { query, body } = ctx.request;

    const user = { ...(query.loggedUser ? JSON.parse(query.loggedUser) : {}), ...body.loggedUser };
    const userFromParam = ctx.params.userId;

    if (user.id === 'microservice' || user.role === 'ADMIN') {
        await next();
        return;
    }

    if (userFromParam === user.id) {
        await next();
        return;
    }
    ctx.throw(403, 'Forbidden');
};

router.get('/', StoryRouter.getStories);
router.get('/user/:user_id', StoryRouter.getStoriesByUser);
router.get('/:id', StoryValidator.getStoryById, StoryRouter.getStoryById);
router.delete('/:id', isAuthenticatedMiddleware, StoryValidator.getStoryById, StoryRouter.deleteStory);
router.delete('/by-user/:userId', isAuthenticatedMiddleware, deleteResourceAuthorizationMiddleware, StoryRouter.deleteByUserId);
router.put('/:id', isAuthenticatedMiddleware, StoryValidator.getStoryById, StoryRouter.updateStory);
router.post('/', isAuthenticatedMiddleware, StoryRouter.createStory);

module.exports = router;
