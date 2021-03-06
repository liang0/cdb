/**
 * @constructor
 */

wd.cdb.TypeAlreadySetException = function(){};
wd.cdb.Query = function (label, group, type, guid, definition) {
  "use strict";
  var myself = this,
      _label = label,
      _group = group,
      _groupName,
      _query = definition,
      _type = type,
      _id,
      _guid = guid || wd.ctools.utils.createGUID();



  var updateBackend = function(callback) {
    /* We only want to notify the backend of changes
     * to queries it already knows about, and the id
     * is the only way of knowing that's the case.
     */
    if (_id) {
      wd.ctools.persistence.saveObject(null, "Query", myself, callback);
    }
  }

  var copyBackend = function(newGuid) {
    /* We only want to notify the backend of changes
     * to queries it already knows about, and the id
     * is the only way of knowing that's the case.
     */
    if (_id) {
      cdbFunctions.copyBackend(myself, newGuid);
    }
  }

  this.getDefinition = function() {
    return _query;
  };

  this.setDefinition = function(query) {
    _query = query;
  };

  this.getLabel = function() {
    return _label;
  };
  this.setLabel = function(label,callback){
    _label = label;
    updateBackend(callback);
  };
  this.getType = function() {
    return _type;
  };
  this.setType = function(type){
      if(_type) throw new wd.cdb.TypeAlreadySetException; 
    _type = type;
  };
  this.toJSON = function() {
    return JSON.stringify({name: _label, group: _group, groupName: _groupName, type: _type, definition: _query, guid: _guid});
  };

  this.getGroup = function() {
    return _group;
  };

  this.getGroupName = function() {
    return _groupName;
  };


  this.setGroupName = function(groupName) {
    _groupName = groupName;
  };


  this.setGroup = function(group, groupName) {
    _group = group;
    _groupName = groupName;
    wd.cdb.QueryManager.newGroup(group, groupName);
    wd.cdb.QueryManager.getGroup(group).addQuery(this);
    updateBackend();
  };

  this.getGUID = function () {
    return _guid
  };

  this.getKey = function() {
    return _id;
  };
  this.setKey = function(key) {
    _id = key;
  };

  this.duplicate = function(newGroup, newGroupName) {
    var that = new wd.cdb.Query(this.getLabel() + " (Copy)", newGroup, this.getType(),wd.ctools.utils.createGUID(),this.getDefinition());
    that.setGroupName(newGroupName);
    wd.ctools.persistence.saveObject(null,"Query",that);
    copyBackend(that.getGUID());
    return that;
  };

  this.deleteSelf = function() {
    /* We should only request deletion for queries that have actually been added server-side */
    if (!this.getKey()) {
      return;
    }
    cdbFunctions.deleteSelf(this);
  }

  if(group){
    wd.cdb.QueryManager.getGroup(group).addQuery(this);
  }
}

/**
 * @constructor
 */
wd.cdb.QueryGroup = function(label, description) {
  var _label = label,
	  _description = description,
      _queries = {};

  this.getLabel = function() {
      return _label;
  };
  
  this.setLabel = function(label){
    _label = label;
  };

  this.getDescription = function() {
  	  if (_description)
	      return _description;
	  else
		return _label;
  };
  
  this.setDescription = function(description){
    _description = description;
  for (q in _queries) if (_queries.hasOwnProperty(q)) {
    query = _queries[q];
	query.setGroupName(description);
  }
    
  };

  this.addQuery = function(dataAccess) {
      _queries[dataAccess.getGUID()] = dataAccess;
  };

  this.getQuery = function(guid) {
      return _queries[guid];
  }

  this.listQueries = function() {
      return _queries;
  };

  this.toJSON = function() {
      return JSON.stringify({label: _label, description: _description, queries: _queries.map(function(e){return {guid: e.getGUID, label: e.getLabel()};})});
  };

  this.save = function() {
    cdbFunctions.saveQuery(_queries, _label);
  };

  this.deleteQuery = function(queryGuid) {
    var query = this.getQuery(queryGuid);

    delete _queries[queryGuid];
    query.deleteSelf();
  }

	this.deleteQueryByObj = function(queryObj) {
		delete _queries[queryObj.getGUID()];
		queryObj.deleteSelf();	
	}


  this.deleteSelf = function() {
    var query;
    for (q in _queries) if (_queries.hasOwnProperty(q)) {
      query = _queries[q];
      query.deleteSelf();
    }
  }
}

wd.cdb.QueryManager = (function() {
    var myself = {};
    var _groups = {};

    myself.newGroup = function(label, description) {
      if (!myself.getGroup(label)) {
        myself.addGroup(new wd.cdb.QueryGroup(label, description));
      }
      return myself.getGroup(label);
    };

    myself.getGroup = function(label) {
      return _groups[label];
    };

    myself.addGroup = function(group) {
        _groups[group.getLabel()] = group;
    };

    myself.loadGroup = function(group,callback) {
      cdbFunctions.loadGroup(myself, group, callback);
    };

    myself.deleteGroup = function(label) {
      var group = myself.getGroup(label);
      if (group) group.deleteSelf();
    };
    
    myself.listGroups = function(){
      return _groups;
    };
    
    myself.loadGroupList = function(callback) {
      cdbFunctions.loadGroupList(myself, callback);
    }
    
    return myself;
}());
