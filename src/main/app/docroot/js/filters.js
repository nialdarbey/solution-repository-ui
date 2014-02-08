'use strict';

/* Filters */

app.filter('data', function(HyperMediaService) {
    return function(entity, fieldName ) {
      if (entity) {
          return HyperMediaService.findData(entity, fieldName);
      }
    };
  });

app.filter('links', function(HyperMediaService) {
    return function(entity, rel ) {
      if (entity) {
          return HyperMediaService.filterLinks(entity, rel);
      }
    };
  });

app.filter('link', function(HyperMediaService) {
    return function(entity, rel ) {
      if (entity) {
          return HyperMediaService.findLink(entity, rel);
      }
    };
  });
