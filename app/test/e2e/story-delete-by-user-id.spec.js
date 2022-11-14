const nock = require('nock');
const chai = require('chai');
const config = require('config');
const Story = require('models/story.model');
const { USERS } = require('./utils/test.constants');
const { getTestServer } = require('./utils/test-server');
const { mockGetUserFromToken, createStory } = require('./utils/helpers');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Delete stories by user id', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    beforeEach(async () => {
        await Story.remove({}).exec();
    });

    it('Deleting a story by user Id without being logged should return a 401 Unauthorized', async () => {
        const response = await requester
            .delete(`/api/v1/story/by-user/${USERS.USER.id}`);

        response.status.should.equal(401);
    });

    it('Deleting a story by user Id without being logged should return a 403 Forbidden', async () => {
        mockGetUserFromToken(USERS.MANAGER);

        const response = await requester
            .delete(`/api/v1/story/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`);

        response.status.should.equal(403);
    });

    it('Delete story by userId as ADMIN should return all stories deleted and a 200 status', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        const fakeStoryOne = await (new Story(createStory({ userId: USERS.USER.id }))).save();
        const fakeStoryTwo = await (new Story(createStory({ userId: USERS.USER.id }))).save();
        const fakeStoryFromAdmin = await (new Story(createStory({ userId: USERS.ADMIN.id }))).save();
        const fakeStoryFromManager = await (new Story(createStory({ userId: USERS.MANAGER.id }))).save();

        nock(`https://${config.get('cartoDB.user')}.cartodb.com`, { encodedQueryParams: true })
            .post('/api/v2/sql', {
                q: `DELETE FROM ${config.get('cartoDB.table')} WHERE cartodb_id = ${fakeStoryOne.toObject()._id.toString()}`,
                api_key: config.get('cartoDB.apiKey'),
                format: 'json'
            })
            .reply(200, {
                rows: [{
                    ...fakeStoryOne.toObject(),
                }],
                time: 0.003,
                fields: {
                    lat: { type: 'number', pgtype: 'float8' },
                    lng: { type: 'number', pgtype: 'float8' },
                    details: { type: 'string', pgtype: 'text' },
                    email: { type: 'string', pgtype: 'text' },
                    created_at: { type: 'date', pgtype: 'timestamptz' },
                    name: { type: 'string', pgtype: 'text' },
                    title: { type: 'string', pgtype: 'text' },
                    visible: { type: 'boolean', pgtype: 'bool' },
                    date: { type: 'date', pgtype: 'timestamptz' },
                    location: { type: 'string', pgtype: 'text' },
                    id: { type: 'number', pgtype: 'int4' },
                    media: { type: 'string', pgtype: 'text' },
                    user_id: { type: 'string', pgtype: 'text' },
                    hide_user: { type: 'boolean', pgtype: 'bool' }
                },
                total_rows: 1
            });
        nock(`https://${config.get('cartoDB.user')}.cartodb.com`, { encodedQueryParams: true })
            .post('/api/v2/sql', {
                q: `DELETE FROM ${config.get('cartoDB.table')} WHERE cartodb_id = ${fakeStoryTwo.toObject()._id.toString()}`,
                api_key: config.get('cartoDB.apiKey'),
                format: 'json'
            })
            .reply(200, {
                rows: [{
                    ...fakeStoryTwo.toObject(),
                }],
                time: 0.003,
                fields: {
                    lat: { type: 'number', pgtype: 'float8' },
                    lng: { type: 'number', pgtype: 'float8' },
                    details: { type: 'string', pgtype: 'text' },
                    email: { type: 'string', pgtype: 'text' },
                    created_at: { type: 'date', pgtype: 'timestamptz' },
                    name: { type: 'string', pgtype: 'text' },
                    title: { type: 'string', pgtype: 'text' },
                    visible: { type: 'boolean', pgtype: 'bool' },
                    date: { type: 'date', pgtype: 'timestamptz' },
                    location: { type: 'string', pgtype: 'text' },
                    id: { type: 'number', pgtype: 'int4' },
                    media: { type: 'string', pgtype: 'text' },
                    user_id: { type: 'string', pgtype: 'text' },
                    hide_user: { type: 'boolean', pgtype: 'bool' }
                },
                total_rows: 1
            });

        const response = await requester
            .delete(`/api/v1/story/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`);
        response.status.should.equal(200);
        response.body.data.should.have.lengthOf(2);
        response.body.data.map((elem) => elem.attributes.lat).sort().should.deep.equal([fakeStoryOne.toObject().lat, fakeStoryTwo.toObject().lat].sort());

        const findStoriesByUser = await Story.find({ userId: { $eq: USERS.USER.id } }).exec();
        findStoriesByUser.should.be.an('array').with.lengthOf(0);

        const findAllStories = await Story.find({}).lean().exec();
        findAllStories.should.be.an('array').with.lengthOf(2);

        const storyResourceTypes = findAllStories.map((story) => story._id.toString());
        storyResourceTypes.should.contain(fakeStoryFromManager._id.toString());
        storyResourceTypes.should.contain(fakeStoryFromAdmin._id.toString());
    });

    it('Delete story by userId as microservice should return all stories deleted and a 200 status', async () => {
        mockGetUserFromToken(USERS.MICROSERVICE);
        const fakeStoryOne = await (new Story(createStory({ userId: USERS.USER.id }))).save();
        const fakeStoryTwo = await (new Story(createStory({ userId: USERS.USER.id }))).save();
        const fakeStoryFromAdmin = await (new Story(createStory({ userId: USERS.ADMIN.id }))).save();
        const fakeStoryFromManager = await (new Story(createStory({ userId: USERS.MANAGER.id }))).save();

        nock(`https://${config.get('cartoDB.user')}.cartodb.com`, { encodedQueryParams: true })
            .post('/api/v2/sql', {
                q: `DELETE FROM ${config.get('cartoDB.table')} WHERE cartodb_id = ${fakeStoryOne.toObject()._id.toString()}`,
                api_key: config.get('cartoDB.apiKey'),
                format: 'json'
            })
            .reply(200, {
                rows: [{
                    ...fakeStoryOne.toObject(),
                }],
                time: 0.003,
                fields: {
                    lat: { type: 'number', pgtype: 'float8' },
                    lng: { type: 'number', pgtype: 'float8' },
                    details: { type: 'string', pgtype: 'text' },
                    email: { type: 'string', pgtype: 'text' },
                    created_at: { type: 'date', pgtype: 'timestamptz' },
                    name: { type: 'string', pgtype: 'text' },
                    title: { type: 'string', pgtype: 'text' },
                    visible: { type: 'boolean', pgtype: 'bool' },
                    date: { type: 'date', pgtype: 'timestamptz' },
                    location: { type: 'string', pgtype: 'text' },
                    id: { type: 'number', pgtype: 'int4' },
                    media: { type: 'string', pgtype: 'text' },
                    user_id: { type: 'string', pgtype: 'text' },
                    hide_user: { type: 'boolean', pgtype: 'bool' }
                },
                total_rows: 1
            });
        nock(`https://${config.get('cartoDB.user')}.cartodb.com`, { encodedQueryParams: true })
            .post('/api/v2/sql', {
                q: `DELETE FROM ${config.get('cartoDB.table')} WHERE cartodb_id = ${fakeStoryTwo.toObject()._id.toString()}`,
                api_key: config.get('cartoDB.apiKey'),
                format: 'json'
            })
            .reply(200, {
                rows: [{
                    ...fakeStoryTwo.toObject(),
                }],
                time: 0.003,
                fields: {
                    lat: { type: 'number', pgtype: 'float8' },
                    lng: { type: 'number', pgtype: 'float8' },
                    details: { type: 'string', pgtype: 'text' },
                    email: { type: 'string', pgtype: 'text' },
                    created_at: { type: 'date', pgtype: 'timestamptz' },
                    name: { type: 'string', pgtype: 'text' },
                    title: { type: 'string', pgtype: 'text' },
                    visible: { type: 'boolean', pgtype: 'bool' },
                    date: { type: 'date', pgtype: 'timestamptz' },
                    location: { type: 'string', pgtype: 'text' },
                    id: { type: 'number', pgtype: 'int4' },
                    media: { type: 'string', pgtype: 'text' },
                    user_id: { type: 'string', pgtype: 'text' },
                    hide_user: { type: 'boolean', pgtype: 'bool' }
                },
                total_rows: 1
            });

        const response = await requester
            .delete(`/api/v1/story/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`);
        response.status.should.equal(200);
        response.body.data.should.have.lengthOf(2);
        response.body.data.map((elem) => elem.attributes.lat).sort().should.deep.equal([fakeStoryOne.toObject().lat, fakeStoryTwo.toObject().lat].sort());

        const findStoriesByUser = await Story.find({ userId: { $eq: USERS.USER.id } }).exec();
        findStoriesByUser.should.be.an('array').with.lengthOf(0);

        const findAllStories = await Story.find({}).lean().exec();
        findAllStories.should.be.an('array').with.lengthOf(2);

        const storyResourceTypes = findAllStories.map((story) => story._id.toString());
        storyResourceTypes.should.contain(fakeStoryFromManager._id.toString());
        storyResourceTypes.should.contain(fakeStoryFromAdmin._id.toString());
    });

    it('Delete story by userId as the same user should return all stories deleted and a 200 status', async () => {
        mockGetUserFromToken(USERS.USER);
        const fakeStoryOne = await (new Story(createStory({ userId: USERS.USER.id }))).save();
        const fakeStoryTwo = await (new Story(createStory({ userId: USERS.USER.id }))).save();
        const fakeStoryFromAdmin = await (new Story(createStory({ userId: USERS.ADMIN.id }))).save();
        const fakeStoryFromManager = await (new Story(createStory({ userId: USERS.MANAGER.id }))).save();

        nock(`https://${config.get('cartoDB.user')}.cartodb.com`, { encodedQueryParams: true })
            .post('/api/v2/sql', {
                q: `DELETE FROM ${config.get('cartoDB.table')} WHERE cartodb_id = ${fakeStoryOne.toObject()._id.toString()}`,
                api_key: config.get('cartoDB.apiKey'),
                format: 'json'
            })
            .reply(200, {
                rows: [{
                    ...fakeStoryOne.toObject(),
                }],
                time: 0.003,
                fields: {
                    lat: { type: 'number', pgtype: 'float8' },
                    lng: { type: 'number', pgtype: 'float8' },
                    details: { type: 'string', pgtype: 'text' },
                    email: { type: 'string', pgtype: 'text' },
                    created_at: { type: 'date', pgtype: 'timestamptz' },
                    name: { type: 'string', pgtype: 'text' },
                    title: { type: 'string', pgtype: 'text' },
                    visible: { type: 'boolean', pgtype: 'bool' },
                    date: { type: 'date', pgtype: 'timestamptz' },
                    location: { type: 'string', pgtype: 'text' },
                    id: { type: 'number', pgtype: 'int4' },
                    media: { type: 'string', pgtype: 'text' },
                    user_id: { type: 'string', pgtype: 'text' },
                    hide_user: { type: 'boolean', pgtype: 'bool' }
                },
                total_rows: 1
            });
        nock(`https://${config.get('cartoDB.user')}.cartodb.com`, { encodedQueryParams: true })
            .post('/api/v2/sql', {
                q: `DELETE FROM ${config.get('cartoDB.table')} WHERE cartodb_id = ${fakeStoryTwo.toObject()._id.toString()}`,
                api_key: config.get('cartoDB.apiKey'),
                format: 'json'
            })
            .reply(200, {
                rows: [{
                    ...fakeStoryTwo.toObject(),
                }],
                time: 0.003,
                fields: {
                    lat: { type: 'number', pgtype: 'float8' },
                    lng: { type: 'number', pgtype: 'float8' },
                    details: { type: 'string', pgtype: 'text' },
                    email: { type: 'string', pgtype: 'text' },
                    created_at: { type: 'date', pgtype: 'timestamptz' },
                    name: { type: 'string', pgtype: 'text' },
                    title: { type: 'string', pgtype: 'text' },
                    visible: { type: 'boolean', pgtype: 'bool' },
                    date: { type: 'date', pgtype: 'timestamptz' },
                    location: { type: 'string', pgtype: 'text' },
                    id: { type: 'number', pgtype: 'int4' },
                    media: { type: 'string', pgtype: 'text' },
                    user_id: { type: 'string', pgtype: 'text' },
                    hide_user: { type: 'boolean', pgtype: 'bool' }
                },
                total_rows: 1
            });

        const response = await requester
            .delete(`/api/v1/story/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`);
        response.status.should.equal(200);
        response.body.data.should.have.lengthOf(2);
        response.body.data.map((elem) => elem.attributes.lat).sort().should.deep.equal([fakeStoryOne.toObject().lat, fakeStoryTwo.toObject().lat].sort());

        const findStoriesByUser = await Story.find({ userId: { $eq: USERS.USER.id } }).exec();
        findStoriesByUser.should.be.an('array').with.lengthOf(0);

        const findAllStories = await Story.find({}).lean().exec();
        findAllStories.should.be.an('array').with.lengthOf(2);

        const storyResourceTypes = findAllStories.map((story) => story._id.toString());
        storyResourceTypes.should.contain(fakeStoryFromManager._id.toString());
        storyResourceTypes.should.contain(fakeStoryFromAdmin._id.toString());
    });

    it('Deleting stories from a user should delete them completely from a database (large number of stories)', async () => {
        mockGetUserFromToken(USERS.USER);

        await Promise.all([...Array(25)].map(async () => {
            const createdStory = await new Story(createStory({
                userId: USERS.USER.id
            })).save();

            nock(`https://${config.get('cartoDB.user')}.cartodb.com`, { encodedQueryParams: true })
                .post('/api/v2/sql', {
                    q: `DELETE FROM ${config.get('cartoDB.table')} WHERE cartodb_id = ${createdStory.toObject()._id.toString()}`,
                    api_key: config.get('cartoDB.apiKey'),
                    format: 'json'
                })
                .reply(200, {
                    rows: [{
                        ...createdStory.toObject(),
                    }],
                    time: 0.003,
                    fields: {
                        lat: { type: 'number', pgtype: 'float8' },
                        lng: { type: 'number', pgtype: 'float8' },
                        details: { type: 'string', pgtype: 'text' },
                        email: { type: 'string', pgtype: 'text' },
                        created_at: { type: 'date', pgtype: 'timestamptz' },
                        name: { type: 'string', pgtype: 'text' },
                        title: { type: 'string', pgtype: 'text' },
                        visible: { type: 'boolean', pgtype: 'bool' },
                        date: { type: 'date', pgtype: 'timestamptz' },
                        location: { type: 'string', pgtype: 'text' },
                        id: { type: 'number', pgtype: 'int4' },
                        media: { type: 'string', pgtype: 'text' },
                        user_id: { type: 'string', pgtype: 'text' },
                        hide_user: { type: 'boolean', pgtype: 'bool' }
                    },
                    total_rows: 1
                });
        }));

        const deleteResponse = await requester
            .delete(`/api/v1/story/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();

        deleteResponse.status.should.equal(200);
        deleteResponse.body.should.have.property('data').with.lengthOf(25);

        const findStoryByUser = await Story.find({ userId: { $eq: USERS.USER.id } }).exec();
        findStoryByUser.should.be.an('array').with.lengthOf(0);
    });

    it('Deleting all stories of an user while being authenticated as USER should return a 200 and all stories deleted - no stories in the db', async () => {
        mockGetUserFromToken(USERS.USER);

        const response = await requester
            .delete(`/api/v1/story/by-user/${USERS.USER.id}`)
            .set('Authorization', 'Bearer abcd')
            .send();

        response.status.should.equal(200);
        response.body.data.should.be.an('array').with.lengthOf(0);
    });

    afterEach(async () => {
        await Story.remove({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
