const mongoose = require('mongoose');

const { Schema } = mongoose;

const Story = new Schema({
    id: { type: Number },
    details: { type: String, trim: true },
    title: { type: String, trim: true }, // required: true
    visible: { type: Boolean },
    location: { type: String, trim: true },
    email: { type: String, trim: true }, // required: true,
    name: { type: String, trim: true },
    createdAt: { type: Date, expires: '24h' },
    updatedAt: { type: Date },
    date: { type: Date },
    media: Schema.Types.Mixed,
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    userId: { type: String, trim: true },
    hideUser: { type: Boolean, default: false },
    populatedUser: { type: Boolean, default: false }
});

module.exports = mongoose.model('Story', Story);
