'use strict';

var config = require('config');
var logger = require('logger');
var AsyncClient = require('vizz.async-client');
const CHANNEL = config.get('apiGateway.queueName');

class MailService {
    constructor(){
        logger.debug('Initializing queue with provider %s ', config.get('apiGateway.queueProvider'));
        switch (config.get('apiGateway.queueProvider').toLowerCase()) {
            case AsyncClient.REDIS:
                this.asynClient = new AsyncClient(AsyncClient.REDIS, {
                    url: config.get('apiGateway.queueUrl')
                });
                break;
            default:
        }
        this.asynClient = this.asynClient.toChannel(CHANNEL);
    }

    sendMail(template, data, recipients){
        this.asynClient.emit(JSON.stringify({
            template: template,
            data: data,
            recipients: recipients
        }));
    }
}

module.exports = new MailService();
