'use strict';

/* Controllers */

function LoginCtrl($scope, AuthorizationService) {
    $scope.login = function() {
        AuthorizationService.authorize($scope.username, $scope.password, $scope);
    }
}

function MyDemosCtrl($stateParams, $scope, GithubService, AuthorizationService, HyperMediaService, $state, $location) {
    $scope.isSelected = function(repository) {
        var uri = HyperMediaService.findData(repository, 'name'); // name is uri in github. We can change it once published
        return $location.path().indexOf(uri) != -1;
    };
    $scope.hasDemoLink = function(repository) {
        return HyperMediaService.hasLink(repository, 'demo');
    };
    $scope.showDemo = function(repository) {
        var demo = HyperMediaService.findData(repository, 'name');
        $state.go('public-demos.demo', {
            demo : demo
        });
    };
    $scope.getDemoLink = function(repository) {
        return HyperMediaService.getLink(repository, 'demo');
    }
    AuthorizationService.init();
    $scope.repositories = GithubService.getRepositories($stateParams.username);
    
}

function MyDemoCtrl(GithubService, HyperMediaService, $scope, $stateParams, AuthorizationService, $state, ErrorService) {
    var publishing = false;
    GithubService.getRepository($stateParams.username, $stateParams.demo).$promise.then(function(r) {
        $scope.repository = r.collection.items[0];
        $scope.readMe = GithubService.getReadMe($scope.repository);
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
}

function PublicDemosCtrl($location, $scope, AuthorizationService, $state, DemoService, HyperMediaService) {
    $scope.filterOff = function() {
        $location.path($location.path()).search({search:null});
    };
    $scope.isSelected = function(demo) {
        return $location.path().indexOf(HyperMediaService.findData(demo, 'name')) != -1;
    }
    $scope.isFiltered = function() {
        return $state.params.search;
    }
    $scope.filter = function() {
        return $state.params.label;
    }
    AuthorizationService.init();
    if ($state.params.search) {
        $scope.demos = DemoService.search($state.params.search);
    } else {
        DemoService.getDemos().$promise.then(function(d) {
            $scope.demos = d;
        });
    }
}

function PublicDemoCtrl(DemoService, HyperMediaService, $scope, $stateParams, AuthorizationService, $state, $rootScope) {
    DemoService.getDemo($stateParams.demo).$promise.then(function(d) {
        $scope.demo = d.collection.items[0];
        $scope.tags = HyperMediaService.filterLinks($scope.demo, 'demo-search');
        $scope.readMe = DemoService.getReadMe($scope.demo);
        $scope.loadConfig(HyperMediaService.findLink($scope.demo, 'mule-config').href);
    });

    $scope.truncatedConfigName = function(name) {
        if (name.length <= 8) {
            return name + '.xml';
        } else {
            return name.substring(0, 7) + '...';
        }
    };
    $scope.loadConfig = function(href) {
        DemoService.getConfig(href).$promise.then(function(conf) {
            $scope.currentConfig = HyperMediaService.findData(conf.collection.items[0], 'config');
        });
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
}

function SearchCtrl($scope, AuthorizationService, $stateParams, $state) {
    $scope.tagMode = true;
//    $scope.tags = Restangular
//        .all('tags')
//        .getList({ q : '.*', limit : 0})
//        .get('tags');
//    $scope.verticals = Restangular
//        .all('taxonomies')
//        .getList({ q: '.*', limit: 10000});

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
