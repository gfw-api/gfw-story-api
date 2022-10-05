const nock = require('nock');
const chai = require('chai');
const config = require('config');
const Story = require('models/story.model');
const { getTestServer } = require('./utils/test-server');

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

    it('Get story by id (happy case)', async () => {
        nock(`https://${config.get('cartoDB.user')}.cartodb.com`, { encodedQueryParams: true })
            .get('/api/v2/sql')
            .query({
                q: 'SELECT%20ST_Y%28the_geom%29%20AS%20lat%2C%20ST_X%28the_geom%29%20AS%20lng%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20details%2C%20email%2C%20created_at%2C%20name%2C%20title%2C%20visible%2C%20date%2C%20location%2C%20cartodb_id%20as%20id%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20media%2C%20user_id%2C%20hide_user%20FROM%20gfw_stories_staging%20%20%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20WHERE%20cartodb_id%20%3D%20131%20%20%20ORDER%20BY%20date%20ASC',
                api_key: config.get('cartoDB.apiKey'),
                format: 'json'
            })
            .reply(200, {
                rows: [{
                    lat: 42.80887151387517,
                    lng: -1.6471939086914222,
                    details: 'One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin.\n\nHe lay on his armour-like back, and if he lifted his head a little he could see his brown belly, slightly domed and divided by arches into stiff sections.\n\nThe bedding was hardly able to cover it and seemed ready to slide off any moment. His many legs, pitifully thin compared with the size of the rest of him, waved about helplessly as he looked.\n\n"What\'s happened to me? " he thought. It wasn\'t a dream. His room, a proper human room although a little too small, lay peacefully between its four familiar walls.\n\nA collection of textile samples lay spread out on the table - Samsa was a travelling salesman - and above it there hung a picture that he had recently cut out of an illustrated magazine and housed in a nice, gilded frame.\n\nIt showed a lady fitted out with a fur hat and fur boa who sat upright, raising a heavy fur muff that covered the whole of her lower arm towards the viewer. Gregor then turned to look out the window at the dull weather. Drops',
                    email: null,
                    created_at: '2016-08-25T11:43:57Z',
                    name: null,
                    title: 'Testing story from Pamplona and the user hide',
                    visible: true,
                    date: '2016-08-25T00:00:00Z',
                    location: 'Pamplona, Municipio de Navarra',
                    id: 131,
                    media: '[{"previewUrl":"14721253102146a8c7ea386c528d2e90193f3f69d8e29nature_4.jpg","order":0},{"previewUrl":"147212530713536f9f59b55ca98097ed3a3e2c220220cnature_3.jpg","order":2},{"previewUrl":"14721253134877fd92494f7a0630ba37651dbc8c4bcf1nature_1.jpg","order":3},{"embedUrl":"youtube.com/watch?v=RtcrS7dmhcI","order":1}]',
                    user_id: '57ab390ad1d5fb2f00b20e11',
                    hide_user: true
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
            .get('/api/v1/story/131');

        response.status.should.equal(200);
        response.body.data.should.be.an('object').and.deep.equal({
            type: 'story',
            id: '131',
            attributes: {
                name: null,
                title: 'Testing story from Pamplona and the user hide',
                createdAt: '2016-08-25T11:43:57.000Z',
                visible: true,
                details: 'One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin.\n\nHe lay on his armour-like back, and if he lifted his head a little he could see his brown belly, slightly domed and divided by arches into stiff sections.\n\nThe bedding was hardly able to cover it and seemed ready to slide off any moment. His many legs, pitifully thin compared with the size of the rest of him, waved about helplessly as he looked.\n\n"What\'s happened to me? " he thought. It wasn\'t a dream. His room, a proper human room although a little too small, lay peacefully between its four familiar walls.\n\nA collection of textile samples lay spread out on the table - Samsa was a travelling salesman - and above it there hung a picture that he had recently cut out of an illustrated magazine and housed in a nice, gilded frame.\n\nIt showed a lady fitted out with a fur hat and fur boa who sat upright, raising a heavy fur muff that covered the whole of her lower arm towards the viewer. Gregor then turned to look out the window at the dull weather. Drops',
                date: '2016-08-25T00:00:00.000Z',
                email: null,
                location: 'Pamplona, Municipio de Navarra',
                media: [
                    {
                        previewUrl: '14721253102146a8c7ea386c528d2e90193f3f69d8e29nature_4.jpg',
                        order: 0
                    },
                    {
                        previewUrl: '147212530713536f9f59b55ca98097ed3a3e2c220220cnature_3.jpg',
                        order: 2
                    },
                    {
                        previewUrl: '14721253134877fd92494f7a0630ba37651dbc8c4bcf1nature_1.jpg',
                        order: 3
                    },
                    {
                        embedUrl: 'youtube.com/watch?v=RtcrS7dmhcI',
                        order: 1
                    }
                ],
                lat: 42.80887151387517,
                lng: -1.6471939086914222,
                hideUser: true
            }
        });
    });

    afterEach(async () => {
        await Story.remove({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
