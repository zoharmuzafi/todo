var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var Subtask = require("./subtask");
var User = require("./user");


var TaskSchema = new Schema({

	name:{type: String, required: true}, 
	completed: Boolean, 
	subtasks: [Subtask.schema],
	
});

var Task = mongoose.model("Task", TaskSchema);
module.exports = Task;