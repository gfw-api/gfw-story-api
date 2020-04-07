const config = require('config');
const AsyncClient = require('vizz.async-client');

const CHANNEL = config.get('apiGateway.queueName');

class MailService {

    constructor() {
        this.asynClient = new AsyncClient(AsyncClient.REDIS, {
            url: config.get('apiGateway.queueUrl')
        });
        this.asynClient = this.asynClient.toChannel(CHANNEL);
    }

    sendMail(template, data, recipients) {
        this.asynClient.emit(JSON.stringify({
            template,
            data,
            recipients
        }));
    }

}

module.exports = new MailService();
