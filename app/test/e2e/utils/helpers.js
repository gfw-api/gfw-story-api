const nock = require('nock');

const getRandomInRange = (to, from, fixed) => (Math.random() * (to - from) + from).toFixed(fixed) * 1;

const mockGetUserFromToken = (userProfile) => {
    nock(process.env.GATEWAY_URL, { reqheaders: { authorization: 'Bearer abcd' } })
        .get('/auth/user/me')
        .reply(200, userProfile);
};

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

module.exports = {
    mockGetUserFromToken,
    createStory,
};
