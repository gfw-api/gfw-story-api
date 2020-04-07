/* eslint-disable import/no-extraneous-dependencies */
const chai = require('chai');
const chaiHttp = require('chai-http');
const nock = require('nock');

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

    nock(`${process.env.CT_URL}`)
        .post(`/api/v1/microservice`)
        .reply(200);

    const serverPromise = require('../../../src/app');
    const { server } = await serverPromise();
    createdServer = server;
    requester = chai.request(server).keepOpen();

    return requester;
};

module.exports = { getTestServer, createRequest };
