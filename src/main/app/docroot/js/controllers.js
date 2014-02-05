'use strict';

/* Controllers */

function LoginCtrl($scope, AuthorizationService) {
    $scope.login = function() {
        AuthorizationService.authorize($scope.username, $scope.password, $scope);
    }
}

function RepositoriesCtrl($stateParams, $scope, RepositoryService, AuthorizationService, CJService, $state, $location) {
    $scope.isSelected = function(repository) {
        return $location.path().indexOf(CJService.getData(repository, 'name')) != -1;
    };
    $scope.hasDemoLink = function(repository) {
        return CJService.hasLink(repository, 'demo');
    };
    $scope.showDemo = function(repository) {
        var demo = CJService.getData(repository, 'name');
        $state.go('demos.demo', {
            demo : demo
        });
    };
    AuthorizationService.init();
    $scope.repositories = RepositoryService.getRepositories($stateParams.username);
    
}

function RepositoryCtrl(RepositoryService, CJService, $scope, $stateParams, AuthorizationService, $state, ErrorService) {
    var publishing = false;
    RepositoryService.getRepository($stateParams.username, $stateParams.repository).$promise.then(function(r) {
        $scope.repository = r.collection.items[0];
        RepositoryService.getReadMe($scope.repository).$promise.then(function(readMe) {
            $scope.readMe = readMe;
        });
    });
    $scope.master = { name: $stateParams.repository, major: 3, minor: 4, revision: 0, verticals: [] };
//    $scope.availableVerticals = Restangular.all('taxonomies').getList({ q: '.*', limit: 10000});
    $scope.demo = angular.copy($scope.master);
    
    $scope.isPublishing = function() {
        return publishing;
    };
    $scope.publish = function(demo) {
        publishing = true;
        $scope.repository.then(function(repository) {
            var summary = repository.description.replace(/\n/g, '\\n').substring(0, 96);
            summary = (summary === '') ? 'x' : summary;
            var verticals = [];
            for (var i = 0; i < demo.verticals.length; i++) {
                verticals.push({
                    taxonomy: demo.verticals[i].taxonomy,
                    path: demo.verticals[i].path,
                    id: demo.verticals[i].id
                });
            }
            var newDemo = {
                    name : demo.name.replace(/[^A-Za-z 0-9]/g, '-'),
                    repository : $stateParams.repository,
                    description : repository.readMe.replace(/\n/g, '\\n').substring(0, 2048),
                    summary : summary,
                    githubOwner : AuthorizationService.getUser().githubUsername,
                    releaseNotes : repository.readMe.replace(/\n/g, '\\n').substring(0, 8192),
                    githubLink : repository.cloneUrl,
                    amazonLink : demo.amazonLink || 'http://localhost:8080/not/filled/' + $stateParams.repository,
                    version : demo.major + '.' + demo.minor + '.' + demo.revision,
                    author : AuthorizationService.getUser().username,
                    verticals: verticals
            };
//            Restangular.all('demos').post(newDemo).then(function(response) {
//                //DemoCorrelationService.store($stateParams.repository, response.location);
//            }, function(response) {
//                ErrorService.setError(response.data);
//            });
        });
    };
    $scope.published = function() {
        return true;//DemoCorrelationService.published($stateParams.repository);
    }
    $scope.reset = function() {
        publishing = false;
      $scope.demo = angular.copy($scope.master);
    };
    $scope.isUnchanged = function(demo) {
      return angular.equals(demo, $scope.master);
    };

    $scope.$on('event:loginRequired', function() {
        $state.go('login');
    });

    AuthorizationService.init();
//    $scope.repository.then(function(repository) {
//        $scope.master.name = repository.name;
//    });
}

function DemosCtrl($location, $scope, AuthorizationService, $state, DemoService) {
    $scope.filterOff = function() {
        $location.path($location.path()).search({verticals:null, tags: null});
    };
    $scope.isSelected = function(demo) {
        return $location.path().indexOf(demo.id) != -1;
    }
    $scope.isFiltered = function() {
        return $state.params.verticals || $state.params.tags;
    }
    $scope.filter = function() {
        return ($state.params.verticals || $state.params.tags);
    }
    AuthorizationService.init();
    if ($state.params.tags) {
        /*$scope.demos = Restangular
            .one('demos')
            .get({ q : $state.params.tags, limit : 0, offset : 0})
            .get('demos');*/
    } else if ($state.params.verticals) {
        /*$scope.demos = Restangular
            .one('taxonomies')
            .one('verticals')
            .one('nodes', $state.params.verticals)
            .one('demos')
            .get();*/
    } else {
        /*$scope.demos = Restangular
            .one('demos')
            .get({ limit : 0, offset : 0 })
            .get('demos');*/
        DemoService.getDemos().$promise.then(function(d) {
            $scope.demos = d;
        });
    }
}

function SearchCtrl($scope, AuthorizationService, Restangular, $stateParams, $state) {
    $scope.tagMode = true;
    $scope.tags = Restangular
        .all('tags')
        .getList({ q : '.*', limit : 0})
        .get('tags');
    $scope.verticals = Restangular
        .all('taxonomies')
        .getList({ q: '.*', limit: 10000});

    $scope.search = function() {
        if ($scope.tagMode) {
            $state.go('demos.search', { tags: $scope.tag});
        } else {
            $state.go('demos.search', { verticals: $scope.vertical.name})
        }
    };
    $scope.focusVertical = function() {
        $scope.tagMode = false;
    };
    $scope.focusTag = function() {
        $scope.tagMode = true;
    };
    $scope.searchButtonDisabled = function() {
        return $scope.tagMode ? $scope.tag === undefined : false;
    }

    $scope.$on('event:loginRequired', function() {
        $state.go('login');
    });
    
    AuthorizationService.init();
    $scope.vertical = $scope
        .verticals
        .then(function(v) {
                return v[0];
            });
}

function DemoCtrl(DemoService, $scope, $stateParams, AuthorizationService, $state, DemoCorrelationService, $rootScope) {
    DemoService.getDemo($stateParams.demo).$promise.then(function(d) {
        $scope.demo = d.collection.items[0];
    });

    $scope.truncatedConfigName = function(name) {
        if (name.length <= 8) {
            return name + '.xml';
        } else {
            return name.substring(0, 7) + '...';
        }
    };
    $scope.chooseConfig = function(name) {
        $scope.currentConfig = $scope.configs.get('configs').get(name);
    }
    $scope.taxonomyLabel = function(node) {
        return node.path[node.path.length - 1];
    }

    $scope.chooseVersion = function(version) {
        var versionResource = Restangular.one('demos', $stateParams.demo).one('vers', version);
        $scope.version = versionResource.get(); 
        $scope.links = versionResource.all('links').getList();
        $scope.versionLabel = version;
    }
    $scope.amazonAMIAssigned = function(link) {
        if (link) {
            return link.indexOf('/not/filled') == -1;
        }
    }
    
    AuthorizationService.init();
    /*demoPromise.then(function(response) {
        $scope.configs = Restangular.one('repositories', response.githubName).one('configs').get({
            owner : response.githubOwner
        });
        $scope.configs.then(function(conf) {
           $scope.currentConfig = conf.configs[Object.keys(conf.configs)[0]];
        });
    });*/
    /*Restangular
        .one('demos', $stateParams.demo)
        .all('vers')
        .getList()
        .then(function(vs) {
            $scope.versions = [];
            var v = vs.versions;
            for ( var i = 0; i < v.length; i++) {
                $scope.versions.push(v[i].major + '.' + v[i].minor + '.' + v[i].revision);
            }
            $scope.chooseVersion($scope.versions[0]);
        });*/
}
