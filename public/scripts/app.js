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
app.controller('ProfileCtrl', ['$scope', '$auth', '$location', 'Task', function ($scope, $auth, $location, Task) {
  
  //get all the tasks for a user
  $scope.tasks = Task.query();
  //add new task
  $scope.newTask = function(){
    Task.save($scope.task, function(data){
      $scope.task={};
      $scope.tasks.push(data);
    }, function(err){
      console.log(err);
    }); 
  };
}]);

//task show controller
app.controller('TasksShowCtrl', ['$scope', '$auth', '$location', '$routeParams', 'Task', 'Subtask', '$http', function ($scope, $auth, $location, $routeParams, Task, Subtask, $http) {
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
      $scope.singleTask.subtasks.push(data.subtasks[data.subtasks.length-1]);
      }, function(err){
        console.log(err);
    });
  };

  //delete subtask
  $scope.deleteSubTask = function(subtask){
    Subtask.delete({taskId: taskId, id: subtask._id}, function(data){
      $scope.singleTask=data;
    });
  };

  //update subtask
  $scope.editSubTask = function(subtask){
    indexSubtask = $scope.singleTask.subtasks.indexOf(subtask);
    Subtask.update({taskId: taskId, id: subtask._id}, subtask.subTaskEdit, function(data){
      subtask.subTaskEdit = {};
      $scope.singleTask.subtasks[indexSubtask].name = data.name;
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
    userEmail = $scope.searchUser;
    $http.get('api/users/email/' + userEmail).then(function(response){
      $scope.foundUser = response.data;
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



