const { RWAPIMicroservice } = require('rw-api-microservice-node');

class UserService {

    static async getUserById(userId) {
        const body = await RWAPIMicroservice.requestToMicroservice({
            uri: `/auth/user/${userId}`,
            method: 'GET',
            json: true,
            version: false
        });
        return body.data;
    }

}

module.exports = UserService;
