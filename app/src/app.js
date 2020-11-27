const config = require('config');
const logger = require('logger');
const Koa = require('koa');
const koaQs = require('koa-qs');
const koaBody = require('koa-body');
const koaLogger = require('koa-logger');
const loader = require('loader');
const sleep = require('sleep');
const koaValidate = require('koa-validate');
const mongoose = require('mongoose');
const ErrorSerializer = require('serializers/errorSerializer');
const koaSimpleHealthCheck = require('koa-simple-healthcheck');
const ctRegisterMicroservice = require('ct-register-microservice-node');

const mongoUri = process.env.MONGO_URI || `mongodb://${config.get('mongodb.host')}:${config.get('mongodb.port')}/${config.get('mongodb.database')}`;

let retries = 10;

async function init() {
    return new Promise((resolve, reject) => {
        async function onDbReady(err) {
            if (err) {
                if (retries >= 0) {
                    retries--;
                    logger.error(`Failed to connect to MongoDB uri ${mongoUri}, retrying...`);
                    sleep.sleep(5);
                    mongoose.connect(mongoUri, onDbReady);
                } else {
                    logger.error('MongoURI', mongoUri);
                    logger.error(err);
                    reject(new Error(err));
                }

                return;
            }

            // instance of koa
            const app = new Koa();

            // if environment is dev then load koa-logger
            if (process.env.NODE_ENV === 'dev') {
                app.use(koaLogger());
            }

            koaQs(app, 'extended');
            app.use(koaBody({
                multipart: true,
                jsonLimit: '50mb',
                formLimit: '50mb',
                textLimit: '50mb'
            }));

            app.use(koaSimpleHealthCheck());

            // catch errors and send in jsonapi standard. Always return vnd.api+json
            app.use(async (ctx, next) => {
                try {
                    await next();
                } catch (inErr) {
                    let error = inErr;
                    try {
                        error = JSON.parse(inErr);
                    } catch (e) {
                        logger.debug('Could not parse error message - is it JSON?: ', inErr);
                        error = inErr;
                    }
                    ctx.status = error.status || ctx.status || 500;
                    if (ctx.status >= 500) {
                        logger.error(error);
                    } else {
                        logger.info(error);
                    }

                    ctx.body = ErrorSerializer.serializeError(ctx.status, error.message);
                    if (process.env.NODE_ENV === 'prod' && ctx.status === 500) {
                        ctx.body = 'Unexpected error';
                    }
                    ctx.response.type = 'application/vnd.api+json';
                }
            });

            // load custom validator
            koaValidate(app);

            // load routes
            loader.loadRoutes(app);

            const port = process.env.PORT || config.get('service.port');

            const server = app.listen(port, () => {
                ctRegisterMicroservice.register({
                    info: require('../microservice/register.json'),
                    swagger: require('../microservice/public-swagger.json'),
                    mode: (process.env.CT_REGISTER_MODE && process.env.CT_REGISTER_MODE === 'auto') ? ctRegisterMicroservice.MODE_AUTOREGISTER : ctRegisterMicroservice.MODE_NORMAL,
                    framework: ctRegisterMicroservice.KOA1,
                    app,
                    logger,
                    name: config.get('service.name'),
                    ctUrl: process.env.CT_URL,
                    url: process.env.LOCAL_URL,
                    token: process.env.CT_TOKEN,
                    active: true,
                }).then(() => {
                    logger.info('Server started in ', process.env.PORT);
                    resolve({ app, server });
                }, (error) => {
                    logger.error(error);
                    process.exit(1);
                });
            });

            logger.info(`Connecting to MongoDB URL ${mongoUri}`);
        }

        let dbOptions = {};
        if (mongoUri.indexOf('replicaSet') > -1) {
            dbOptions = {
                db: { native_parser: true },
                replset: {
                    auto_reconnect: false,
                    poolSize: 10,
                    socketOptions: {
                        keepAlive: 1000,
                        connectTimeoutMS: 30000
                    }
                },
                server: {
                    poolSize: 5,
                    socketOptions: {
                        keepAlive: 1000,
                        connectTimeoutMS: 30000
                    }
                }
            };
        }
        mongoose.connect(mongoUri, dbOptions, onDbReady);


    });
}

module.exports = init;
