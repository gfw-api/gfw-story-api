const { mockValidateRequest, mockCloudWatchLogRequest } = require('rw-api-microservice-node/dist/test-mocks');
const config = require('config');
const { USERS } = require('./test.constants');

const getRandomInRange = (to, from, fixed) => (Math.random() * (to - from) + from).toFixed(fixed) * 1;

const createStory = (additionalData = {}) => ({
    details: 'test story',
    title: 'Test Story',
    location: 'Test location',
    email: 'fakeEmail@potato.com',
    name: 'fake Name',
    lat: getRandomInRange(-90, 90, 2),
    lng: getRandomInRange(-180, 180, 2),
    ...additionalData
});

const APPLICATION = {
    data: {
        type: 'applications',
        id: '649c4b204967792f3a4e52c9',
        attributes: {
            name: 'grouchy-armpit',
            organization: null,
            user: null,
            apiKeyValue: 'a1a9e4c3-bdff-4b6b-b5ff-7a60a0454e13',
            createdAt: '2023-06-28T15:00:48.149Z',
            updatedAt: '2023-06-28T15:00:48.149Z'
        }
    }
};

const mockValidateRequestWithApiKey = ({
    apiKey = 'api-key-test',
    application = APPLICATION
}) => {
    mockValidateRequest({
        gatewayUrl: process.env.GATEWAY_URL,
        microserviceToken: process.env.MICROSERVICE_TOKEN,
        application,
        apiKey
    });
    mockCloudWatchLogRequest({
        application,
        awsRegion: process.env.AWS_REGION,
        logGroupName: process.env.CLOUDWATCH_LOG_GROUP_NAME,
        logStreamName: config.get('service.name')
    });
};

const mockValidateRequestWithApiKeyAndUserToken = ({
    apiKey = 'api-key-test',
    token = 'abcd',
    application = APPLICATION,
    user = USERS.USER
}) => {
    mockValidateRequest({
        gatewayUrl: process.env.GATEWAY_URL,
        microserviceToken: process.env.MICROSERVICE_TOKEN,
        user,
        application,
        token,
        apiKey
    });
    mockCloudWatchLogRequest({
        user,
        application,
        awsRegion: process.env.AWS_REGION,
        logGroupName: process.env.CLOUDWATCH_LOG_GROUP_NAME,
        logStreamName: config.get('service.name')
    });
};

module.exports = {
    createStory,
    mockValidateRequestWithApiKey,
    mockValidateRequestWithApiKeyAndUserToken
};
