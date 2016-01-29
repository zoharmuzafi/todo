var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var SubtaskSchema = new Schema({
	name:{type: String, required: true},
	completed: Boolean
});

var Subtask = mongoose.model('Subtask', SubtaskSchema);
module.exports = Subtask;