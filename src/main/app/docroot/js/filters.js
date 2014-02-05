'use strict';

/* Filters */

app.filter('data', function(CJService) {
    return function(entity, fieldName ) {
      if (entity) {
          return CJService.getData(entity, fieldName);
      }
    };
  });

app.filter('links', function(CJService) {
    return function(entity, rel ) {
      if (entity) {
          return CJService.getLinks(entity, rel);
      }
    };
  });
