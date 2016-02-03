var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    bcrypt = require('bcryptjs');
    Task = require("./task");


var userSchema = new Schema({
  created: { type: Date },
  updated: { type: Date },
  email: { type: String, unique: true, lowercase: true, match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/]},
  password: { type: String, select: false, minLength: 6, maxLength: 10 },
  displayName: {type: String, minLength: 4, maxLength: 20},
  tasks: [{type: Schema.Types.ObjectId, ref: "Task"}]
});

userSchema.pre('save', function (next) {
  // set created and updated
  now = new Date();
  this.updated = now;
  if (!this.created) {
    this.created = now;
  }

  // encrypt password
  var user = this;
  if (!user.isModified('password')) {
    return next();
  }
  bcrypt.genSalt(10, function (err, salt) {
    bcrypt.hash(user.password, salt, function (err, hash) {
      user.password = hash;
      next();
    });
  });
});

userSchema.methods.comparePassword = function (password, done) {
  bcrypt.compare(password, this.password, function (err, isMatch) {
    done(err, isMatch);
  });
};

var User = mongoose.model('User', userSchema);
module.exports = User;