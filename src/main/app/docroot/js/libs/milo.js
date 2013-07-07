/**
    @namespace Milo
    @module milo
    @extends {Ember.Namespace}
*/
window.Milo = Em.Namespace.create({
    revision: 1
});


Milo.A = Em.A;
Milo.isArray = Em.isArray;
Milo.Object = Em.Object;
Milo.Map = Em.Map;
Milo.get = Em.get;
Milo.Namespace = Em.Namespace;
Milo.Mixin = Em.Mixin;
Milo.ArrayProxy = Em.ArrayProxy;
Milo.computed = Em.computed;

Milo.assert = function (desc, test) {
    if (!test) throw new Error("assertion failed: " + desc);
};

Milo.Helpers = {};

Milo.isUndefined = function (param) {
    return 'undefined' === typeof param;
};

Milo.isEmpty = function (param) {
    return param === '';
};

Milo.isString = function (param) {
    return 'string' === typeof param;
};

Milo.isNumber = function (param) {
    return 'number' === typeof param;
};

Milo.isBoolean = function (param) {
    return 'boolean' === typeof param;
};

Milo.isObject = function (param) {
    return 'object' === typeof param;
};

Milo.isFunction = function (param) {
    return 'function' === typeof param;
};

Milo.isUndefinedOrEmpty = function (param) {
    return Milo.isUndefined(param) || Milo.isEmpty(param);
};

Milo.apiFromModelClass = function (modelClass) {
    var modelClassName = modelClass.toString();
    return Milo.get(modelClassName.substring(0, modelClassName.indexOf('.')));
};

Milo.stringStartsWith = function (string, pattern) {
    return string.lastIndexOf(pattern, 0) === 0;
};

Milo.computedPropery = function () {
    return Milo.computed(function (key, value, oldValue) {
        var temp = this.get('data').findProperty('key', key);

        if (!temp) {
            temp = this.get('data').pushObject(Milo.Object.create({
                key: key,
                value: value
            }));
        } else {
            temp.value = value;
        }

        if (!Milo.isUndefined(oldValue)) {
            this.set('isDirty', true);
        }

        return temp.value;
    });
};

Milo.validateNumber = function (count) {
    if (!Milo.isNumber(count) || count < 0) {
        throw 'Invalid index "' + count + '"';
    }
};

Milo.validateString = function (fieldName) {
    if (!Milo.isString(fieldName) || Milo.isEmpty(fieldName)) {
        throw 'Ordering field must be a valid string';
    }
};

Milo.baseUrlValidation = function (value) {
    var validScheme = ['http://', 'https://'].map(function (e) {
            if (value) {
                return value.indexOf(e) === 0;
            }
            return false;
        }).reduce(function (x,y) {
            return x || y;
        }, false);

    if (value && Milo.isString(value) && (value.substring(0, 1) === '/' || validScheme)) {
        return value;
    }

    throw 'Protocol "' + value + '" not supported.';
};

Milo.mapProperty = function (property, key, value) {
    if (Milo.isUndefined(key)) {
        return this.get(property);
    } else if (Milo.isUndefined(value) && Milo.isString(key)) {
        return this.get(property)[key];
    } else if (Milo.isUndefined(value) && Milo.isObject(key)) {
        if (key.baseUrl) {
            Milo.baseUrlValidation(key.baseUrl);
        }
        this.set(property, $.extend({}, this.get(property), key));
    } else {
        if ('baseUrl' === key) {
            Milo.baseUrlValidation(value);
        }
        this.get(property)[key] = value;
        return value;
    }
};

Milo.propertyWrapper = function (property, value) {
    if (Milo.isUndefined(value)) {
        return this.get(property);
    } else {
      this.set(property, value);
      return value;
    }
};

Milo.defaultSerializer = {
    serialize: function (value) {
        return value;
    },

    deserialize: function (value) {
        return value;
    }
};

Milo.booleanSerializer = {
    serialize: function (value) {
        return value ? true : false;
    },

    deserialize: function (value) {
        return value ? true : false;
    }
};


Milo.numberSerializer = {
    serialize: function (value) {
        var numeric = parseFloat(value);
        return isNaN(numeric) ? 0 : numeric;
    },

    deserialize: function (value) {
        var numeric = parseFloat(value);
        return isNaN(numeric) ? 0 : numeric;
    }
};

Milo.clone = function(obj) {
    return JSON.parse(JSON.stringify(obj));
};


/**
    @namespace Milo
    @module milo-dsl
    @class property
*/
Milo.property = function (type, options) {
    options = options || {};
    options.occurrences = "one";
    options.embedded = true;
    options.type = type || 'string';
    options.defaultValue = Milo.isUndefined(options.defaultValue) ? null : options.defaultValue;
    options.operations = Milo.isUndefined(options.operations) ? ['put', 'post'] : options.operations;
    options.validationRules = Milo.isUndefined(options.validationRules) ? {} : options.validationRules;

    return Milo.computedPropery().property().meta(options);
};
/**
    @namespace Milo
    @module milo-dsl
    @class linkedCollection
*/
Milo.linkedCollection = function (type) {
    options = {};
    options.embedded = false;
    options.occurrences = "many";
    options.type = type || 'string';
    options.operations = [];

    return Milo.computed(function (key, value, oldValue) {
        var parentName = this.constructor.toString(),
            param = '%@Id'.fmt(parentName.substring(parentName.indexOf('.') + 1, parentName.length)).camelize(),
            findParams = Milo.clone(this.get('anyClause') || {}),
            queryable, uriTemplate;

        findParams[param] = findParams.id || this.get('id');
        delete findParams.id;

        type = Milo.isString(type) ? Milo.get(type) : type;
        queryable = type.create();
        uriTemplate = queryable.get('uriTemplate');
        queryable.set('uriTemplate', this.get('uriTemplate').replace(':id', ':' + param) + uriTemplate);

        return queryable.where(findParams);
    }).property().volatile().meta(options);
};
/**
    @namespace Milo
    @module milo-dsl
    @class collection
*/
Milo.collection = function (type, options) {
    options = options || {};
    options.embedded = true;
    options.type = type || 'string';
    options.defaultValue = Milo.isUndefined(options.defaultValue) ? null : options.defaultValue;
    options.operations = Milo.isUndefined(options.operations) ? ['put', 'post'] : options.operations;
    options.validationRules = Milo.isUndefined(options.validationRules) ? {} : options.validationRules;

    return Milo.computedPropery().property().meta(options);
};
/**
    @namespace Milo
    @module milo-core
    @class Deferred
    @extends {Ember.Mixin}
*/
Milo.Deferred = Milo.Mixin.create({
    /**
    This method will be called when the ajax request has successfully finished

    @method done
    @return {Milo.Deferred}
    */
    done: function (callback) {
        this.get('_deferred').done(callback);
        return this;
    },

    /**
    This method will be called when the ajax request fails

    @method fail
    @return {Milo.Deferred}
    */
    fail: function (callback) {
        this.get('_deferred').fail(callback);
        return this;
    },

    /**
    This method will be called once after the ajax request was sent to the server.

    @method progress
    @return {Milo.Deferred}
    */
    progress: function (callback) {
        this.get('_deferred').progress(callback);
        return this;
    },

    /**
    This method will be called always. Whether the ajax request fails or not.

    @method then
    @return {Milo.Deferred}
    */
    then: function (callback) {
        this.get('_deferred').then(callback);
        return this;
    }
});

/**
    @namespace Milo
    @module milo-core
    @class ArrayProxy
    @extends {Ember.ArrayProxy}
    @uses {Milo.Deferred}
*/
Milo.ModelArray = Milo.ArrayProxy.extend(Milo.Deferred, {
    /**
        Indicates if the entity is in the 'loading' state

        @attribute isLoaded
        @default false
        @type boolean
    */
    isLoaded: true,

    /**
        Indicates if the entity has errors

        @attribute isError
        @default false
        @type boolean
    */
    isError: false,

    /**
        @private
        @attribute errors
        @default null
        @type Array
    */
    errors: null,

    /**
        @attribute query
        @default null
        @type Queryable
    */
    query: null,

    /**
        @attribute modelClass
        @default null
        @type Milo.Model
    */
    modelClass: null,

    reload: function () {
        var queryable = this.get('query');

        return queryable.findMany({ into: this });
    }
});
/**
    @namespace Milo
    @module milo-adapters
    @class DefaultAdapter
    @extends {Ember.Object}
*/
Milo.DefaultAdapter = Milo.Object.extend({
    /**
        @method query
        @param {String} modelClass
        @param {Array} params
    */
    query: function (modelClass, params, queryable, result) {
        var api = Milo.apiFromModelClass(modelClass),
            uriTemplate = queryable.get('uriTemplate'),
            urlAndQueryParams = this._splitUrlAndDataParams(modelClass, params, uriTemplate),
            resourceUrl = this._buildResourceUrl(modelClass, urlAndQueryParams.urlParams, uriTemplate),
            url = api.options('baseUrl') + resourceUrl,
            queryParams = $.param($.extend({}, urlAndQueryParams.dataParams, api.queryParams())),
            method = 'GET',
            deferred = $.Deferred(),
            rootElement = queryable.get('rootElement'),
            that = this;

        if (queryParams) {
            url = this._buildQueryString(url, queryParams);
        }

        (function (deferred, url, modelClass, rootElement, urlAndQueryParams, queryable) {
            that._ajax(api, method, url)
                .done(function (data) {
                    var root = data[rootElement],
                        deserialized;

                    if (root && Em.isArray(root)) {
                        deserialized = Em.A(root.map(function (dataRow) {
                            var model;

                            dataRow = Milo.isObject(dataRow) ? dataRow : { element: dataRow };
                            model = that._deserialize(modelClass, $.extend({}, urlAndQueryParams.urlParams, { id: dataRow.id }, dataRow));
                            model.cloneQueryParamsFrom(queryable);
                            if (model.get('id')) {
                                model.where({ id: model.get('id') });
                            }

                            return model;
                        }));
                    } else {
                        deserialized = that._deserialize(modelClass, $.extend({}, urlAndQueryParams.urlParams, { id: data.id }, data), result);
                    }

                    deferred.resolve(deserialized, data);
                })
                .fail(function (jqXHR) {
                    deferred.reject(that._extractErrors(jqXHR));
                });

        })(deferred, url, modelClass, rootElement, urlAndQueryParams, queryable);

        return deferred.promise();
    },

    /**
        @method save
        @param {String} modelClass
        @param {Array} params
    */
    save: function (modelClass, model) {
        var api = Milo.apiFromModelClass(modelClass),
            urlAndQueryParams = this._splitUrlAndDataParams(modelClass, model.getAllProperties()),
            resourceUrl = this._buildResourceUrl(modelClass, urlAndQueryParams.urlParams, undefined, model),
            url = api.options('baseUrl') + resourceUrl,
            queryParams = $.param(api.queryParams()),
            method = model.get('isNew') ? 'post' : 'put',
            deferred = $.Deferred(),
            that = this,
            serialized;

        model.set('isSaving', true);
        deferred.notify();
        serialized = this._serialize(modelClass, model, method);

        this._ajax(api, method, this._buildQueryString(url, queryParams), serialized)
            .done(function (data) {
                model.set('isDirty', false);
                model.set('isNew', false);
                model.set('isSaving', false);
                deferred.resolve(model);
            })
            .fail(function (jqXHR) {
                model.set('isSaving', false);
                deferred.reject(that._extractErrors(jqXHR));
            });

        return deferred.promise();
    },

    /**
        @method remove
        @param {String} modelClass
        @param {Array} params
    */
    remove: function (modelClass, model) {
        var api = Milo.apiFromModelClass(modelClass),
            urlAndQueryParams = this._splitUrlAndDataParams(modelClass, model.getAllProperties()),
            resourceUrl = this._buildResourceUrl(modelClass, urlAndQueryParams.urlParams, undefined, model),
            url = api.options('baseUrl') + resourceUrl,
            queryParams = $.param(api.queryParams()),
            method = 'delete',
            deferred = $.Deferred(),
            that = this;

        model.set('isDeleting', true);
        model.set('isSaving', true);
        deferred.notify();

        // If entity is new we won't delete it remotely
        if (model.get('isNew')) {
            // XXX Hack to make call async
            setTimeout(function () {
                model.set('isDirty', false);
                model.set('isDeleted', true);
                model.set('isDeleting', false);
                model.set('isSaving', false);
                deferred.resolve(model);
            }, 0);
        } else {
            this._ajax(api, method, this._buildQueryString(url, queryParams))
                .done(function (data) {
                    model.set('isDirty', false);
                    model.set('isDeleted', true);
                    model.set('isDeleting', false);
                    model.set('isSaving', false);
                    deferred.resolve(model);
                })
                .fail(function (jqXHR) {
                    model.set('isDeleting', false);
                    model.set('isSaving', false);
                    deferred.reject(that._extractErrors(jqXHR));
                });
        }

        return deferred.promise();
    },

    invoke: function (modelClass, model, actionClass, action) {
        var api = Milo.apiFromModelClass(modelClass),
            urlAndQueryParams = this._splitUrlAndDataParams(modelClass, model.getAllProperties()),
            actionUrlAndQueryParams = this._splitUrlAndDataParams(actionClass, model.getAllProperties()),
            resourceUrl = this._buildResourceUrl(modelClass, urlAndQueryParams.urlParams, undefined, model),
            actionUrl = this._buildResourceUrl(actionClass, actionUrlAndQueryParams.urlParams, undefined, actionClass),
            url = api.options('baseUrl') + resourceUrl + actionUrl,
            queryParams = $.param(api.queryParams()),
            method = (action.get('verb') || 'post').toLowerCase(),
            deferred = $.Deferred(),
            that = this,
            serialized;

        model.set('isSaving', true);
        deferred.notify();
        serialized = this._serialize(actionClass, action, method);

        this._ajax(api, method, this._buildQueryString(url, queryParams), serialized)
            .done(function (data) {
                model.set('isSaving', false);
                deferred.resolve(model);
            })
            .fail(function (jqXHR) {
                model.set('isSaving', false);
                deferred.reject(that._extractErrors(jqXHR));
            });

        return deferred.promise();
    },

    /**
        @method _buildQueryString
        @private
    */
    _buildQueryString: function (url, queryParams) {
        return url + (queryParams ? '?' : '') + queryParams;
    },

    /**
        @method _serialize
        @private
    */
    _serialize: function (modelClass, model, method) {
        var api = Milo.apiFromModelClass(modelClass),
            serializer = api.serializer().serializerFor(modelClass);

        return serializer.serialize(model, method);
    },

    /**
        @method _deserialize
        @private
    */
    _deserialize: function (modelClass, json, result) {
        var api = Milo.apiFromModelClass(modelClass),
            serializer = api.serializer().serializerFor(modelClass);

        return serializer.deserialize(json, result);
    },

    /**
        @method _buildResourceUrl
        @private
    */
    _buildResourceUrl: function (modelClass, urlParams, uriTemplate, model) {
        if (Milo.isUndefined(uriTemplate)) {
            uriTemplate = modelClass.create().get('uriTemplate');
        }

        if (!uriTemplate) {
            throw 'Mandatory parameter uriTemplate not set in model "' + modelClass.toString() + '"';
        }

        var urlTerms = uriTemplate.split('/');
        resourceUrl = uriTemplate;

        urlTerms.forEach(function (uriTerm) {
            var fieldName = uriTerm.replace(':', ''),
                value;

            if (fieldName) {
                value = urlParams[fieldName] || '';

                if (value === '' && !Milo.isUndefined(model)) {
                    value = (model.get ? model.get(fieldName) : model[fieldName]) || '';
                }

                if (uriTerm.indexOf(':') === 0) {
                    resourceUrl = resourceUrl.replace(uriTerm, value);
                }
            }
        });

        return resourceUrl.replace(/\/$/g, '');
    },

    /**
        @method _splitUrlAndDataParams
        @private
    */
    _splitUrlAndDataParams: function (modelClass, data, uriTemplate) {
        if (Milo.isUndefined(uriTemplate)) {
            uriTemplate = modelClass.create().get('uriTemplate');
        }

        if (!uriTemplate) {
            throw 'Mandatory parameter uriTemplate not set in model "%@"'.fmt(modelClass.toString());
        }

        var urlTerms = uriTemplate.split('/'),
            modelClassName = modelClass.toString(),
            modelIdField = modelClassName.substring(modelClassName.indexOf('.') + 1).camelize() + 'Id',
            urlParams = {},
            dataParams = data ? Milo.clone(data) : {};

        urlTerms.forEach(function (uriTerm) {
            var fieldName = uriTerm.replace(':', '');

            if (uriTerm.indexOf(':') === 0) {

                if (!Milo.isUndefined(dataParams[fieldName])) {
                    urlParams[fieldName] = dataParams[fieldName];
                    delete dataParams[fieldName];
                }

                if (fieldName === modelIdField && !Milo.isUndefined(dataParams.id)) {
                    urlParams[fieldName] = dataParams.id;
                    delete dataParams.id;
                }
            }
        });

        return {
            urlParams: urlParams,
            dataParams: dataParams
        };
    },

    _extractErrors: function (jqXHR) {
        var errors = Milo.A();

        errors.push(Milo.Object.create({
            jqXHR: jqXHR,
            message: jqXHR.responseText,
            status: jqXHR.status,
            statusText: jqXHR.statusText
        }));

        return errors;
    },

    /**
        @method _ajax
        @private
    */
    _ajax: function (api, method, url, data, cache) {
        method = method || 'GET';

        var cacheFlag = method === 'GET' ? cache : true,
            contentType = api.headers('Content-Type') || 'application/json',
            headers = api.headers(),
            dataType = method === 'GET' ? 'json' : 'text';

        return jQuery.ajax({
            contentType: contentType,
            type: method,
            dataType: dataType,
            data: data ? (dataType === 'text' ? JSON.stringify(data) : data) : '',
            url: url,
            headers: headers,
            cache: cacheFlag
        });
    }
});

/**
    @namespace Milo
    @module milo-adapters
    @class DefaultSerializer
    @extends {Ember.Object}
*/
Milo.DefaultSerializer = Milo.Object.extend({
    serializerCache: null,

    init: function () {
        var cache = Milo.Map.create();

        cache.set('string', Milo.defaultSerializer);
        cache.set('object', Milo.defaultSerializer);
        cache.set('boolean', Milo.booleanSerializer);
        cache.set('array', Milo.defaultSerializer);
        cache.set('number', Milo.numberSerializer);

        this.set('serializerCache', cache);
    },

    registerSerializer: function (key, serializer) {
        this.get('serializerCache').set(key, serializer);
    },

    /**
        @method serializeFor
        @param {String} modelClass
    */
    serializerFor: function (modelClass) {
        var cache = this.get('serializerCache'),
            serializer = cache.get(modelClass);

        if (!serializer) {
            modelClass = (Milo.isString(modelClass)) ? Milo.get(modelClass) : modelClass;
            serializer = this._buildSerializer(modelClass);
            cache.set(modelClass, serializer);
        }

        return serializer;
    },

    /**
        @method _buildSerializer
        @private
    */
    _buildSerializer: function (modelClass) {
        var properties = [],
            propertyNamesForPost = [],
            propertyNamesForPut = [],
            propertyNames = [],
            serializer = {},
            that = this;

        modelClass.eachComputedProperty(function (propertyName) {
            var propertyMetadata = modelClass.metaForProperty(propertyName),
                // Model properties cannot be named any of these names
                ignoredProperties = ['_data', '_snapshot', 'anyClause', 'orderByClause', 'takeClause', 'skipClause'];

            if (!ignoredProperties.contains(propertyName) && propertyMetadata.type && propertyMetadata.embedded) {
                properties.push($.extend({
                    name: propertyName
                }, propertyMetadata));
            }
        });

        properties.forEach(function (property) {
            if (property.operations.contains('post')) {
                propertyNamesForPost.push(property.name);
            }

            if (property.operations.contains('put')) {
                propertyNamesForPut.push(property.name);
            }

            propertyNames.push(property.name);
        });

        serializer.serialize = modelClass.serialize || function (model, method) {
            var propertiesToSerialize, serialized;

            if (!model) {
                return model;
            }

            if (!(model && (model.constructor === modelClass ||
                (model.constructor && model.constructor.toString &&
                model.constructor.toString() === modelClass.toString())))) {
                throw new Error('Error serializing instance: model is not an instance of %@'.fmt(modelClass));
            }

            method = (method || 'none').toLowerCase();

            switch (method) {
                case 'put':
                    propertiesToSerialize = propertyNamesForPut;
                    break;

                case 'post':
                    propertiesToSerialize = propertyNamesForPost;
                    break;

                case 'none':
                    propertiesToSerialize = propertyNames;
                    break;
            }

            serialized = model.getProperties(propertiesToSerialize);

            properties
                .filter(function (property) {
                    return propertiesToSerialize.contains(property.name);
                })
                .forEach(function (property) {
                    if (Milo.isUndefined(serialized[property.name])) {
                        serialized[property.name] = property.defaultValue;
                    } else if (property.occurrences === "one") {
                            serialized[property.name] = that.serializerFor(property.type).serialize(model.get(property.name), method);
                    } else {
                        serialized[property.name] = Milo.A();
                        (model.get(property.name) || []).forEach(function (item) {
                            serialized[property.name].pushObject(that.serializerFor(property.type).serialize(item, method));
                        });
                    }
                });

            return serialized;
        };

        serializer.deserialize = modelClass.deserialize || function (raw, result) {
            var extendedProperties = Milo.clone(raw),
                model;

            if(result && result.constructor === modelClass){
                model = result;
            } else {
                model = modelClass.create({
                    isNew: false,
                    isLoaded: true
                });
            }

            properties
                .forEach(function (property) {
                    if (Milo.isUndefined(raw[property.name])) {
                        model.set(property.name, Milo.isArray(property.defaultValue) ? Milo.clone(property.defaultValue) : property.defaultValue);
                    } else if (property.occurrences === 'one') {
                        model.set(property.name, that.serializerFor(property.type).deserialize(raw[property.name]));
                    } else {
                        model.set(property.name, Milo.A());
                        var collection = raw[property.name] || [];
                        if (!collection.forEach) {
                            throw 'Error: "' + property.name + '" is not a collection';
                        }
                        collection.forEach(function (item) {
                            model.get(property.name).pushObject(that.serializerFor(property.type).deserialize(item));
                        });
                    }

                    extendedProperties[property.name] = undefined;
                });

            model.setProperties(Milo.clone(extendedProperties));
            model.set('_snapshot', raw);

            return model;
        };

        serializer.applyDefaultValues = modelClass.applyDefaultValues || function (json) {
            properties
                .forEach(function (property) {
                    if (Milo.isUndefined(json[property.name])) {
                        json[property.name] = Milo.isArray(property.defaultValue) ? Milo.clone(property.defaultValue) : property.defaultValue;
                    }
                });
        };

        return serializer;
    }
});

/**
Some details about milo-adapters

@module milo-core
*/

/**
    Some details about Milo.Queryable

    @namespace Milo
    @module milo-core
    @class Queryable
    @extends {Ember.Mixin}
*/
Milo.Queryable = Milo.Mixin.create({

    init: function () {
        this.set('anyClause', {});
    },

    /**
        Adds 'asc' param to the request url
        @method orderBy
        @param {String} fieldname
        @chainable
        @return {Milo.Queryable}
        @example
            Hollywood.Actor.orderBy('name').toArray();
    */
    orderBy: function (field) {
        Milo.validateString(field);
        this.set('orderByClause', {
            orderBy: field,
            order: 'asc'
        });

        return this;
    },

    /**
        Adds 'desc' param to the request url

        @method orderByDescending
        @param {String} fieldname
        @chainable
        @return {Milo.Queryable}
        @example
            Hollywood.Actor.orderByDescending('name').toArray();
    */
    orderByDescending: function (field) {
        Milo.validateString(field);
        this.set('orderByClause', {
            orderBy: field,
            order: 'desc'
        });

        return this;
    },

    /**
        Adds 'limit' param to the request url

        @method take
        @param {Number} count
        @chainable
        @return {Milo.Queryable}
        @example
            Hollywood.Actor.take(3).toArray();
    */
    take: function (count) {
        Milo.validateNumber(count);
        this.set('takeClause', {
            limit: count
        });

        return this;
    },

    /**
        Adds 'offset' param to the request url

        @method skip
        @param {Number} count
        @chainable
        @return {Milo.Queryable}
        @example
            Hollywood.Actor.skip(3).toArray();
    */
    skip: function (count) {
        Milo.validateNumber(count);
        this.set('skipClause', {
            offset: count
        });

        return this;
    },

    /**
        Adds the filter params to the request url

        @method find
        @param {Object} [clause]
        @chainable
        @return {Milo.Queryable}
        @example
            Hollywood.Actor.find({name: 'Robert De Niro'}).single();
        @example
            Hollywood.Actor.find().toArray();
    */
    where: function (clause) {
        this.set('anyClause', $.extend({}, this.get('anyClause'), clause));

        return this;
    },

    /**
        Executes a query expecting to get a single element as a result, if not it will throw an exception

        @method single
        @return {Milo.Queryable}
        @example
            Hollywood.Actor.findOne();
    */
    findOne: function (options) {
        return this._materialize(function (modelClass, queryable) {
            var result = (options && options.into && modelClass.detectInstance(options.into)) ? options.into : modelClass.create();
            result.setProperties({
                isLoaded: false,
                isNew: false,
                errors: null
            });

            return result;
        }, function (result, deserialized, queryable) {
            var model = Milo.isArray(deserialized) ? deserialized[0] : deserialized;
            result.cloneQueryParamsFrom(queryable);

            if(!result.get('id')) {
                result.setProperties(model.getAllProperties());
            }

            result.set('_snapshot', model.get('_snapshot'));
        });
    },

    /**
        Executes a query expecting to get an array of element as a result

        @method toArray
        @return {Milo.Queryable}
        @example
            Hollywood.Actor.find().toArray();
    */
    findMany: function (options) {
        return this._materialize(function (modelClass, queryable) {
            var result = (options && options.into && Milo.ModelArray.detectInstance(options.into)) ? options.into : Milo.ModelArray.create();
            result.setProperties({
                isLoaded: false,
                errors: null,
                modelClass: modelClass,
                query: queryable
            });

            return result;
        }, function (result, deserialized) {
            result.set('content', Milo.isArray(deserialized) ? deserialized : Milo.A([deserialized]));
        });
    },

    paginate: function (params) {
        var plugin = this._intializePaginationPlugin();

        plugin.paginate(params, this);
        return this;
    },

    cloneQueryParamsFrom: function (queryable) {
        if (queryable) {
            this.set('anyClause', queryable.get('anyClause'));
            this.set('orderByClause', queryable.get('orderByClause'));
            this.set('takeClause', queryable.get('takeClause'));
            this.set('skipClause', queryable.get('skipClause'));
        }

        return this;
    },

    _intializePaginationPlugin: function () {
        var options = this._getAPI(this).options('pagination'),
            plugin = this.get('paginationPlugin');

        if (plugin) {
            return plugin;
        }

        if (!options) {
            throw 'Pagination is not configured';
        }

        options.plugin = options.plugin || Milo.DefaultPaginationPlugin;

        if (!Milo.isFunction(options.plugin.create)) {
            throw 'Pagination plugin should be an Ember class';
        }

        plugin = options.plugin.create({
            config: options.config
        });

        if (!Milo.PaginationPlugin.detectInstance(plugin)) {
            throw 'Pagination plugin should extend Milo.PaginationPlugin';
        }

        this.set('paginationPlugin', plugin);

        return plugin;
    },

    _getModelClass: function () {
        // XXX Hack that assumes that this is a Model Class
        return this._getAPI(this);
    },

    /**
    @method _extractParameters
    @private
    */
    _extractParameters: function () {
        var params = [];

        // TODO Fail earlier if Model Class is invalid
        if (!this._getModelClass() || !this._getModelClass().options) {
            throw 'Entity was created from a Milo.API instance not registered as a global';
        }

        params.push(this.get('anyClause'));
        params.push(this.get('orderByClause'));
        params.push(this.get('takeClause'));
        params.push(this.get('skipClause'));
        //params.push(this._getModelClass().options('auth'));

        return $.extend.apply(null, [{}].concat(params));
    },

    /**
    @method _materialize
    @private
    */
    _materialize: function (createResultObject, populateResult) {
        var that = this;

        return (function (that) {
            var apiFromModelClass, modelClass, params, id, deferred, result;

            apiFromModelClass = that._getModelClass();
            modelClass = that.constructor;
            params = that._extractParameters();
            id = params.id;
            deferred = $.Deferred();
            result = createResultObject(modelClass, that);

            result.set('_deferred', deferred);
            if (!Milo.isUndefined(id)) {
                result.set('id', id);
            }

            deferred.notify();

            apiFromModelClass.adapter().query(modelClass, params, that, result)
                .fail(function (errors) {
                    result.set('errors', errors);
                    result.set('isError', true);
                    result.set('isLoaded', true);
                    deferred.reject(errors);
                })
                .done(function (deserialized, raw) {
                    populateResult(result, deserialized, that);
                    that._processPlugins(result, raw);
                    result.set('isLoaded', true);

                    if (!result.get('id') && !Milo.isUndefined(id)) {
                        result.set('id', id);
                    }

                    deferred.resolve(result);
                });

            return result;
        })(this);
    },

    _processPlugins: function (result, raw) {
        var paginationPlugin = this.get('paginationPlugin');

        if (!paginationPlugin) {
            return;
        }

        paginationPlugin.processResponse(result, raw);
    }
});

/**
    @namespace Milo
    @module milo
    @class Model
    @extends {Ember.Object}
    @uses {Milo.Queryable}
*/
Milo.Model = Milo.Object.extend(Milo.Queryable, Milo.Deferred, {
    isNew: true,

    //meta: Milo.property('object', { operations: [] }),

    /**
        @method data
    */
    data: function () {
        if (!this.get('_data')) {
            this.set('_data', Milo.A());
        }

        return this.get('_data');
    }.property(),

    /**
        @method rollback
    */
    snapshot: function () {
        var api = this._getAPI(),
            modelClass = this.constructor,
            serializer = api.serializer().serializerFor(modelClass);

        this.set('_snapshot', serializer.serialize(this));
    },

    /**
        @method rollback
    */
    rollback: function () {
        var api = this._getAPI(),
            modelClass = this.constructor,
            serializer = api.serializer().serializerFor(modelClass),
            snapshot = serializer.deserialize(this.get('_snapshot') || {});

        this.setProperties(snapshot.getAllProperties());
        this.set('isDirty', false);
    },

    /**
        @method save
    */
    save: function () {
        var modelClass = this.constructor,
            that = this;

        return Milo.apiFromModelClass(modelClass).adapter()
            .save(modelClass, this)
                .done(function () {
                    that.snapshot();
                })
                .fail(function (errors) {
                    that.set('errors', errors);
                });
    },

    /**
        @method remove
    */
    remove: function () {
        var modelClass = this.constructor,
            that = this;

        return Milo.apiFromModelClass(modelClass).adapter()
            .remove(modelClass, this)
                .fail(function (errors) {
                    that.set('errors', errors);
                });
    },

    invoke: function (action) {
        var modelClass = this.constructor,
            actionClass = action.constructor,
            that = this;

        return Milo.apiFromModelClass(modelClass).adapter()
            .invoke(modelClass, this, actionClass, action)
                .fail(function (errors) {
                    that.set('errors', errors);
                });
    },

    reload: function () {
        var queryable = this;

        return queryable.findOne({ into: this });
    },

    /**
        @method getAllProperties
    */
    getAllProperties: function () {
        var properties = {},
            modelClass = this.constructor,
            that = this;

        modelClass.eachComputedProperty(function (propertyName) {
            var propertyMetadata = modelClass.metaForProperty(propertyName),
                // Model properties cannot be named any of these names
                forbiddenProperties = ['meta', '_data'];

            if (!forbiddenProperties.contains(propertyName) && propertyMetadata.type && propertyMetadata.embedded) {
                properties[propertyName] = that.get(propertyName);
            }
        });

        return properties;
    },

    _getAPI: function () {
        return Milo.apiFromModelClass(this.constructor);
    }
});

Milo.Model.reopenClass({
    /**
        @method where
        @static
    */
    where: function (clause) {
        return this.create().where(clause);
    },

    /**
        @method findOne
        @static
    */
    findOne: function () {
        return this.create().findOne();
    },

    /**
        @method findMany
        @static
    */
    findMany: function () {
        return this.create().findMany();
    },

    create: function () {
        var params = {},
            applyDefaults = false,
            defaultValues = {};

        if (arguments.length) {
            params = Milo.isObject(arguments[0]) ? arguments[0] : {};
            applyDefaults = Milo.isBoolean(arguments[0]) ? arguments[0] : (Milo.isBoolean(arguments[1]) ? arguments[1] : false);
        }

        if (applyDefaults) {
            Milo.apiFromModelClass(this).serializer().serializerFor(this).applyDefaultValues(defaultValues);
            return this._super.call(this, $.extend({}, defaultValues, params));
        } else {
            return this._super.call(this, params);
        }
    }
});

/**
    @namespace Milo
    @module milo-dsl
    @class Action
*/
Milo.Action = Milo.Model.extend({
    verb: 'POST',
    uriTemplate: null
});

Milo.action = function (type) {
    return (function (params) {
        var actionClass, action;

        actionClass = Milo.get(type);
        Milo.assert(type + ' is not defined', actionClass);

        action = actionClass.create(params || {});
        Milo.assert(type + ' is not a Milo.Action class', Milo.Action.detectInstance(action));

        return this.invoke(action);
    });
};
/**
    @namespace Milo
    @module milo-core
    @class API
    @extends {Ember.Namespace}
*/
Milo.API = Milo.Namespace.extend({
    _options: null,
    _headers: null,
    _queryParams: null,
    _adapter: null,
    _serializer: null,

    init: function () {
        this._super();
        this.set('_options', {});
        this.set('_headers', {});
        this.set('_queryParams', {});
        this.set('_adapter', Milo.DefaultAdapter.create());
        this.set('_serializer', Milo.DefaultSerializer.create());
    },

    /**
        @method options
        @param {String} key
        @param {String} value
    */
    options: function (key, value) {
        if (arguments.length === 0) {
            return Milo.mapProperty.bind(this)('_options', undefined, undefined);
        } else if (arguments.length === 1) {
            return Milo.mapProperty.bind(this)('_options', key, undefined);
        } else {
            if (Milo.isUndefined(value)) {
                throw '"' + key + '" cannot be set to undefined';
            }
            return Milo.mapProperty.bind(this)('_options', key, value);
        }
    },

    /**
        @method headers
        @param {String} key
        @param {String} value
    */
    headers: function (key, value) {
        return Milo.mapProperty.bind(this)('_headers', key, value);
    },

    /**
        @method queryParams
        @param {String} key
        @param {String} value
    */
    queryParams: function (key, value) {
        return Milo.mapProperty.bind(this)('_queryParams', key, value);
    },

    /**
        @method adapter
        @param {String} value
    */
    adapter: function (value) {
        return Milo.propertyWrapper.bind(this)('_adapter', value);
    },

    /**
        @method serializer
        @param {String} value
    */
    serializer: function (value) {
        return Milo.propertyWrapper.bind(this)('_serializer', value);
    }
});

Milo.PaginationPlugin = Milo.Object.extend({
    config: null,
    params: null,

    paginate: function (params, queryable) {
        var config = this.get('config'),
            currentParams = this.get('params'),
            pluginParams = $.extend({}, currentParams, params);

        this.validate(pluginParams, config);
        this.set('params', pluginParams);
        this.includePaginationParams(pluginParams, queryable, config);
    },
    processResponse: function (response, raw) {
        this.parseTotalRecordCount(this.get('params'), raw, response, this.get('config'));
    },
    includePaginationParams: function (params, queryable, config) {
        throw 'Not implemented';
    },
    parseTotalRecordCount: function (params, raw, response, config) {
        throw 'Not implemented';
    },
    validate: function (params, config) {
    }
});
Milo.DefaultPaginationPlugin = Milo.PaginationPlugin.extend({
    includePaginationParams: function (params, queryable, config) {
        var limit, offset;

        params.page = (params.action && params.action === 'nextPage') ? params.page + 1 : params.page;
        params.page = (params.action && params.action === 'previousPage') ? params.page - 1 : params.page;

        limit = params.pageSize || config.pageSize || 1,
        offset = params.page ? (params.page - 1) * limit : 0;

        queryable.where({ limit: limit, offset: offset });
    },
    parseTotalRecordCount: function (params, raw, response, config) {
        var pageSize = params.pageSize || config.pageSize || 1,
            pageCount = raw.count ? Math.ceil(raw.count / pageSize) : 0,
            totalRecords = raw.count,
            showRecords = raw.count - raw.offset > pageSize ? pageSize : raw.count - raw.offset;

        response.set('pageCount', pageCount);
        response.set('totalRecords', totalRecords);
        response.set('showRecords', showRecords);
        response.set('currentPage', params.page);
    },
    validate: function (params, config) {
        Milo.assert('You must send the page parameter', params.page);
        Milo.assert('The page parameter must be positive', params.page > 0);
        Milo.assert('You must set up pageSize parameter either in the plugin config or in the paginate() method call', params.pageSize || config.pageSize);
        Milo.assert('The pageSize parameter must be positive', (params.pageSize || config.pageSize) > 0);
    }
});