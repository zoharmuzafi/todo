var app = angular.module('todoApp', ['ngRoute', 'ngResource', 'satellizer']);

//routes
app.config(['$routeProvider', '$locationProvider',
  function ($routeProvider, $locationProvider) {
    $routeProvider
    	.when('/', {
        templateUrl: 'templates/landingpage/index.html',
        controller: 'HomeCtrl'
    	})
    	.when('/profile', {
    		templateUrl: 'templates/profile/profile.html',
        controller: 'ProfileCtrl'
    	})
      .when('/login', {
        templateUrl: 'templates/landingpage/login.html',
        controller: 'AuthCtrl'
      })
      .when('/signup', {
        templateUrl: 'templates/landingpage/signup.html',
        controller: 'AuthCtrl'
      })
      .when('/tasks/:id', {
        templateUrl: 'templates/task/show.html',
        controller: 'TasksShowCtrl'
      })
      .when('/edit/:id', {
        templateUrl: 'templates/profile/edit.html',
        controller: 'UsersEditCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });

    $locationProvider.html5Mode({
      enabled: true,
      requireBase: false
    });
  }
]);

//resource for task api calls
app.factory('Task', ['$resource', function($resource) {
  return $resource("/api/tasks/:id", {id: "@_id"}, {
    query: {
      isArray: true
    },
    update: {
      method: "PUT"
    }
  });
}]);

//resource for subtasks api calls
app.factory('Subtask', ['$resource', function($resource) {
  return $resource("/api/tasks/:taskId/subtasks/:id", {taskId: "@_id" , id: "@_id"}, {
    query: {
      isArray: true
    },
    update: {
      method: "PUT"
    }
  });
}]);

//resource for user api calls
app.factory('User', ['$resource', function($resource) {
  return $resource("/api/users/:id", {id: "@_id"}, {
    query: {
      isArray: true
    },
    update: {
      method: "PUT"
    }
  });
}]);

//websocket
app.factory('socket', function ($rootScope) {
  var socket = io.connect();
  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      });
    }
  };
});

//controllers


//main controller for all the app
app.controller('MainCtrl', ['$scope', '$auth', '$location', '$http', 'Task', function ($scope, $auth, $location, $http, Task) {
  //add the current user to the scope after login/signup
  $scope.isAuthenticated = function() {
    // send GET request to the api
    $http.get('/api/me').then(function(response){
      $scope.currentUser = response.data;
    }, function(err){
      console.log(err);
      $auth.removeToken();
    });
  };
  $scope.isAuthenticated();
  //logou- remove the token and the current user from the scope
  $scope.logout = function(){
    $auth.removeToken();
    $scope.currentUser = null;
    $location.path('/login');
  };

}]);

//auth controller for login and signup
app.controller('AuthCtrl', ['$scope', '$auth', '$location', 'Task', function ($scope, $auth, $location, Task) {
  if ($scope.currentUser) {
      $location.path('/profile');
      $scope.user = {};
    }

  //signup
  $scope.signup = function() {
    $auth.signup($scope.user)
    .then(function(response) {
      // set token 
      $auth.setToken(response.data.token);
      // excute isAuthenticated to set currentUser to the scope
      $scope.isAuthenticated();
      // clear signup form
      $scope.user = {};
      // redirect to '/profile'
      $location.path('/profile');
      }, function(err) {
        console.log(err);
    });
  };

  //login 
   $scope.login = function() {
    // login (https://github.com/sahat/satellizer#authloginuser-options)
    $auth.login($scope.user)
      .then(function(response){
      // set token (https://github.com/sahat/satellizer#authsettokentoken)
        $auth.setToken(response.data.token);
      // call $scope.isAuthenticated to set $scope.currentUser
        $scope.isAuthenticated();
      // clear sign up form
        $scope.user = {};
      // redirect to '/profile'
        $location.path('/profile');
      }, function(err){
        console.log(err);
      });
    };
}]);

//home controller for homepage (include login and sign up)
app.controller('HomeCtrl', ['$scope', '$auth', '$location', 'Task', function ($scope, $auth, $location, Task) {
  
}]);

//profile controller
app.controller('ProfileCtrl', ['$scope', 'socket', '$auth', '$location', 'Task', function ($scope, socket, $auth, $location, Task) {
  
  //get all the tasks for a user
  $scope.tasks = Task.query();
  
  //add new task
  $scope.newTask = function(){
    Task.save($scope.task, function(data){
      $scope.task={};
      $scope.tasks.push(data);
      console.log(data);
      $location.path('/tasks/' + data._id);
    }, function(err){
      console.log(err);
    }); 
  };

   socket.on('addTask', function(task){
    console.log("added");
    for(var i=0; i<task.users.length; i++){
      if (task.users[i]._id === $scope.currentUser._id){
        $scope.tasks.push(task);
      }
    }
  });

   socket.on('deletedTask', function(deletedTask){
    var indexOfDeletedTask = $scope.tasks.indexOf(deletedTask);
    console.log(indexOfDeletedTask);
    $scope.tasks.splice(indexOfDeletedTask,1);
  });

  //emit the client if task edited
  socket.on('editedTask', function(editedTask){
    for(var i=0; i < $scope.tasks.length; i++){
      if($scope.tasks[i]._id === editedTask._id){
        $scope.tasks[i] = editedTask;
        return;
      }
    }
  });

}]);

//task show controller
app.controller('TasksShowCtrl', ['$scope', 'socket', '$auth', '$location', '$routeParams', 'Task', 'Subtask', '$http', function ($scope, socket, $auth, $location, $routeParams, Task, Subtask, $http) {
  taskId = $routeParams.id;
  $scope.singleTask = Task.get({id: taskId});

  //delete task 
  $scope.deleteTask = function(){
    Task.delete({id:taskId}, function(data){
      $location.path('/profile');
    }); 
  };

  //update a task
  $scope.updateTask = function(){
    Task.update({id:taskId}, $scope.editTask, function(data){
      $scope.singleTask.name = data.name;
      $scope.editTask = {};
    });
  };



  //add subtask to a task
  $scope.addSubTask = function(){
    Subtask.save({taskId: taskId}, $scope.subTask, function(data){
      $scope.subTask = {};
         }, function(err){
        console.log(err);
    });
  };

  //delete subtask
  $scope.deleteSubTask = function(subtask){
    Subtask.delete({taskId: taskId, id: subtask._id}, function(data){
      // $scope.singleTask=data;
      console.log(data);
    });
  };

  //update subtask
  $scope.editSubTask = function(subtask){
    indexSubtask = $scope.singleTask.subtasks.indexOf(subtask);
    Subtask.update({taskId: taskId, id: subtask._id}, subtask.subTaskEdit, function(data){
      subtask.subTaskEdit = {};
      // $scope.singleTask.subtasks[indexSubtask].name = data.name;
      subtask[$scope.showForm] = false;
    });
  };

  //mark subtask as completed 
  $scope.completeSubTask = function(subtask){
    indexSubtask = $scope.singleTask.subtasks.indexOf(subtask);
    if(subtask.completed === true){
      subtask.completed = false;
    }
    else{
      subtask.completed = true;
    } 
    Subtask.update({taskId: taskId, id: subtask._id}, subtask, function(data){ 
      $scope.singleTask.subtasks[indexSubtask].completed = subtask.completed;
    });
  };

  //find a user (share function)
  $scope.search = function(){
    $scope.results = false;
    $scope.noResults = false;
    userEmail = $scope.searchUser;
    $http.get('api/users/email/' + userEmail).then(function(response){
      console.log(response);
      if(!response.data){
        $scope.foundUser = "user not found";
        $scope.noResults = true;
      }
      else{
        $scope.foundUser = response.data;
        $scope.results = true; 
      }
    }, function(err){
      console.log(err);
    });
  };

  //share task with a user
  $scope.share = function(user){
    console.log(user._id);
    $http.put('api/users/' + user._id +'/task/' + taskId).then(function(data){
      console.log("data: " + data);
    });
  };

  $scope.editSubtaskForm = function(subtask){
    if(subtask[$scope.showForm] === false){
      subtask[$scope.showForm] = true;
    }
    else{
      subtask[$scope.showForm] = false;
    }
  };
  $scope.editTaskForm = function(){
    if($scope.showEditTaskForm === false){
      $scope.showEditTaskForm = true;
    }
    else{
      $scope.showEditTaskForm = false;
    }
  };

  //emit the client if added a new subtask
  socket.on('addSubTask', function(task){
    if($scope.singleTask._id === task._id){
      $scope.singleTask.subtasks.push(task.subtasks[task.subtasks.length-1]);
    }
  });

  //emit the client if subtask deleted
  socket.on('deletedSubTask', function(deleteSubTask){
    var indexOfDeletedSubTask = $scope.singleTask.subtasks.indexOf(deleteSubTask);
    console.log(indexOfDeletedSubTask);
    $scope.singleTask.subtasks.splice(indexOfDeletedSubTask,1);
  });

  //emit the client if subtask edited
  socket.on('editSubTask', function(updatedTask){
     if($scope.singleTask._id === updatedTask._id){
      $scope.singleTask.subtasks = updatedTask.subtasks;
    }
  });

  //emit the client if task deleted
  socket.on('deletedTask', function(deletedTask){
    console.log(deletedTask);
    if($scope.singleTask._id === deletedTask._id){
      $location.path('/profile');
     }
  });

  //emit the client if task edited
  socket.on('editedTask', function(editedTask){
    console.log(editedTask);
    if($scope.singleTask._id === editedTask._id){
      $scope.singleTask = editedTask;
     }
  });

}]);

//edit profile controller
app.controller('UsersEditCtrl', ['$scope', '$auth', '$location', 'Task', 'User', function ($scope, $auth, $location, Task, User) {

  //update user
  $scope.updateUser = function(){
    User.update({id:$scope.currentUser._id}, $scope.edituser, function(data){
      console.log(data);
      $scope.currentUser.displayName = data.displayName;
      $scope.currentUser.email = data.email;
      $location.path('/profile');
    });  
  };

  //delete user
  $scope.deletUser = function(){
    User.delete({id:$scope.currentUser._id}, function(data){
      console.log(data);
      $scope.isAuthenticated();
      $location.path('/');
    });
  };
  
  

}]);



