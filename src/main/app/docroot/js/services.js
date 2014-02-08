'use strict';

/* Services */

app.factory('HttpInterceptorService', ['$q', '$rootScope', 'ErrorService', function($q, $rootScope, ErrorService) {
  return function(promise) {
    var success = function(response) {
      return response;
    };
    var error = function(response) {
      var message = null;
      if (response.status === 403) {
        message = 'Please sign in!';
        sessionStorage.removeItem('token.dr');
        sessionStorage.removeItem('token.asr');
        sessionStorage.removeItem('user');
        $rootScope.$broadcast('LoginRequired');
      } else {
        message = response.data;
      }
      ErrorService.setError(message);
      return $q.reject(response);
    };
    return promise.then(success, error);
  }
} ]);

app.factory('ErrorService', function() {
  return {
    errorMessage : null,
    setError : function(msg) {
      this.errorMessage = msg;
    },
    clear : function() {
      this.errorMessage = null;
    }
  }
});


app.factory('GithubService', ['HyperMediaService', 'AuthorizationService', '$resource', function(HyperMediaService, AuthorizationService, $resource) {
    var Repositories = $resource(baseUrl + 'api/users/:userId/all/demos');
    var Repository = $resource(baseUrl + 'api/users/:userId/all/demos/:name');
    return {
        getRepositories : function(username) {
            var token = AuthorizationService.getToken();
            return Repositories.get({userId : username, access_token: token});
        },
        getRepository : function(username, name) {
            var token = AuthorizationService.getToken();
            return Repository.get({userId : username, access_token: token, name : name});
        },
        getReadMe : function(repository) {
            var href = HyperMediaService.findLink(repository, 'read-me').href;
            return $resource(baseUrl + 'api' + href).get();
        }
    }
}]);

app.factory('DemoService', ['HyperMediaService', 'AuthorizationService', '$resource', function(HyperMediaService, AuthorizationService, $resource) {
    var Demos = $resource(baseUrl + 'api/demos');
    var Demo = $resource(baseUrl + 'api/demos/:name');
    return {
        getDemos : function() {
            var token = AuthorizationService.getToken();
            return Demos.get({ access_token: token});
        },
        getDemo : function(name) {
            var token = AuthorizationService.getToken();
            return Demo.get({access_token: token, name : name});
        },
        getTags : function(demo) {
            var token = AuthorizationService.getToken();
            return $resource(baseUrl + 'api').get({ access_token: token});
        },
        search : function(href) {
            var token = AuthorizationService.getToken();
            return $resource(baseUrl + 'api' + href).get({ access_token: token});
        },
        getReadMe : function(demo) {
            var token = AuthorizationService.getToken();
            var url = HyperMediaService.findLink(demo, 'read-me').href;
            return $resource(baseUrl + 'api' + url).get({ access_token: token});
        },
        getConfig : function(url) {
            var token = AuthorizationService.getToken();
            return $resource(baseUrl + 'api' + url).get({ access_token: token});
        }
    }
}]);


app.factory('UserService', ['$resource', function($resource) {
   var Users = $resource(baseUrl + '/api/users/:userId', {port: ':8082'})
   return {
       getUser : function(token,username, callback) {
           Users.get({userId : username, access_token: token}, callback);
       }
   } 
}]);


app.factory('HyperMediaService', ['$log', function($log) {
    return {
        findData : function(entity, key) {
            if (entity && entity.data) {
                var data = _.findWhere(entity.data, { 'name': key });
                if (data) {
                    return data.value;
                } else {
                    $log.debug(data);
                }
            }
        },
        findLink : function(entity, key) {
            if (entity && entity.links) {
                return _.findWhere(entity.links, { 'rel': key });
            }
        },
        filterLinks : function(entity, key) {
            if (entity && entity.links) {
                return _.filter(entity.links, function(link) {
                    return link.rel === key;
                });
            }
        },
        hasLink : function(entity, key) {
            if (entity && entity.links) {
                return typeof (_.findWhere(entity.links, { 'rel': key })) != 'undefined';
            }
        }
    }
}]);

app.factory('AuthorizationService', [ 'HyperMediaService', 'UserService', '$resource', '$http', '$rootScope', '$state', 'ErrorService', function(HyperMediaService, UserService, $resource, $http, $rootScope, $state, ErrorService) {
  var author = false;
  var userNotRegistered = function(username, response) {
    ErrorService.setError('Sorry, ' + username + ', but you are not registered yet!');
  };
  var authorizeFail = function(response) {
    ErrorService.setError('Invalid Credentials');
  };

  var proceedToSignIn = function(drToken, user, username) {
      /*Restangular.setDefaultRequestParams({
        access_token : drToken.access_token
      });*/
      sessionStorage.setItem('token.dr', drToken.access_token);
      sessionStorage.setItem('user', JSON.stringify(user));
      $rootScope.$broadcast('SignIn');
      $state.go('my-demos.index', { username : username });
    };
  var authorizeSuccess = function(drToken, scope, self) {
      UserService.getUser(drToken.access_token, scope.username, function(user) {
          proceedToSignIn(drToken, user.collection.items[0], scope.username);
      });
  };

  return {
    isEditor : function() {
        return HyperMediaService.findData(this.getUser(), 'role') === 'Editor';
    },
    getToken : function() {
        return sessionStorage.getItem('token.dr');
    },
    getUser : function() {
        return JSON.parse(sessionStorage.getItem('user'));
    },
    isAuthor : function() {
      return self.author;//JSON.parse(sessionStorage.getItem('user')).githubUsername != undefined;
    },
    errorMessage : null,
    prepared : false,
    hasToken : function() {
      return sessionStorage.getItem('token.dr') != null;
    },
    authorize : function(usename, password, scope) {
          var self = this;
          var params = $.param({
              grant_type : 'password',
              username : scope.username,
              password : scope.password,
              client_id : 'web-ui',
              scope : 'READ%20WRITE'
            });
          var headers = {
                  'Content-Type' : 'application/x-www-form-urlencoded;utf-8',
                  'Accept' : 'application/json'
          };
          $http.post(baseUrl + 'access', params, {headers: headers }).success(function(token) {
              authorizeSuccess(token, scope, self);
          }).error(function() {
              authorizeFail();
          });
    },
    logout : function() {
      sessionStorage.removeItem('token.dr');
      sessionStorage.removeItem('user');
    },
    demandToken : function() {
      if ( ! this.hasToken()) {
        ErrorService.setError('Please sign in!');
        $state.go('login');
      } 
    },
    init: function() {
      var tokenDr = sessionStorage.getItem('token.dr');
      /*Restangular.setDefaultRequestParams({
        access_token : tokenDr,
        asrToken : tokenAsr
      });*/
    }
  }
} ]);