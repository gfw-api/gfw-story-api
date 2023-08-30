const chai = require('chai');
const chaiHttp = require('chai-http');
const config = require('config');
const { mockCloudWatchSetupRequestsSequence } = require('rw-api-microservice-node/dist/test-mocks');

let requester;
let createdServer;

chai.use(chaiHttp);

const createRequest = async (prefix, method) => {
    if (!createdServer) {
        const serverPromise = require('../../../src/app');
        const { server } = await serverPromise();
        createdServer = server;
    }
    const newRequest = chai.request(createdServer).keepOpen();
    const oldHandler = newRequest[method];

    newRequest[method] = (url = '') => oldHandler(prefix + url);

    return newRequest;
};

const getTestServer = async function getTestAgent() {
    if (requester) {
        return requester;
    }

    mockCloudWatchSetupRequestsSequence({
        awsRegion: process.env.AWS_REGION,
        logGroupName: process.env.CLOUDWATCH_LOG_GROUP_NAME,
        logStreamName: config.get('service.name').replace(/ /g, '_')
    });

    const serverPromise = require('../../../src/app');
    const { server } = await serverPromise();
    createdServer = server;
    requester = chai.request(server).keepOpen();

    return requester;
};

module.exports = { getTestServer, createRequest };
