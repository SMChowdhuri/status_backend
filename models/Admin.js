const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function(v) {
                return v.endsWith('@service.admin.com');
            },
            message: props => `${props.value} is not a valid admin email!`
        }
    },
    passwordHash: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Admin', adminSchema);