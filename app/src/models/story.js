'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Story = new Schema({
    'cartodb_id': {type: Number, required: true},
    details: {type: String, trim: true},
    title: {type: String, required: true, trim: true},
    token: {type: String, trim: true},
    visible: {type: Boolean},
    location: {type: String, required: true, trim: true},
    email:{type: String, required: true, trim: true},
    name: {type: String, trim: true},
    'created_at': {type: Date, expires: '24h'},
    'updated_at': {type: Date},
    date: {type: Date},
    media: {type: String, trim: true},
});

module.exports = mongoose.model('Story', Story);
