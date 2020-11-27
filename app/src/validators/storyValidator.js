const logger = require('logger');
const ErrorSerializer = require('serializers/errorSerializer');

class StoryValidator {

    static async create(ctx, next) {
        logger.debug('Validate register story');
        ctx.checkBody('title').notEmpty();
        ctx.checkBody('the_geom').notEmpty();
        ctx.checkBody('email').notEmpty();

        if (ctx.errors) {
            logger.debug('errors ', ctx.errors);
            ctx.body = ErrorSerializer.serializeValidationBodyErrors(ctx.errors);
            ctx.status = 400;
            return;
        }
        await next();

    }

    static async getStoryById(ctx, next) {
        logger.debug('Validate get story by id');
        ctx.checkParams('id').notEmpty();
        if (ctx.errors) {
            logger.debug('errors ', ctx.errors);
            ctx.body = ErrorSerializer.serializeValidationBodyErrors(ctx.errors);
            ctx.status = 400;
            return;
        }
        await next();
    }

}

module.exports = StoryValidator;
