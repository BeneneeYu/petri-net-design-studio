define([
  "js/Constants",
  "js/Utils/GMEConcepts",
  "js/NodePropertyNames",
], function (CONSTANTS, GMEConcepts, nodePropertyNames) {
  "use strict";
  function MyVizControl(options) {

    this._logger = options.logger.fork('Control');

    this._client = options.client;

    // Initialize core collections and variables
    this._widget = options.widget;
    this._widget._client = options.client;

    this._currentNodeId = null;
    this._currentNodeParentId = undefined;

    this._fireableEvents = null;
    this._networkRootLoaded = false;
    this._initWidgetEventHandlers();
    // we need to fix the context of this function as it will be called from the widget directly
    this.setFireableEvents = this.setFireableEvents.bind(this);
    this._logger.debug("ctor finished");
  }

  MyVizControl.prototype._initWidgetEventHandlers = function () {
    this._widget.onNodeClick = function (id) {
      // Change the current active object
      WebGMEGlobal.State.registerActiveObject(id);
    };
  };

  /* * * * * * * * Visualizer content update callbacks * * * * * * * */
  // One major concept here is with managing the territory. The territory
  // defines the parts of the project that the visualizer is interested in
  // (this allows the browser to then only load those relevant parts).
  MyVizControl.prototype.selectedObjectChanged = function (nodeId) {
    var self = this;

    self._logger.debug('activeObject nodeId \'' + nodeId + '\'');

    // Remove current territory patterns
    if (self._currentNodeId) {
      self._client.removeUI(self._territoryId);
      self._networkRootLoaded = false;
    }

    self._currentNodeId = nodeId;

    if (typeof self._currentNodeId === "string") {
      self._selfPatterns = {};
      self._selfPatterns[nodeId] = { children: 1 };

      self._territoryId = self._client.addUI(self, function (events) {
        self._eventCallback(events);
      });

      // Update the territory
      self._client.updateTerritory(self._territoryId, self._selfPatterns);
    }
  };

  /* * * * * * * * Node Event Handling * * * * * * * */
  MyVizControl.prototype._eventCallback = function (events) {
    const self = this;
    var i = events ? events.length : 0;
    var event;
    while (i--) {
      event = events[i];
      if (event.eid && event.eid === self._currentNodeId) {
        if (event.etype == "load" || event.etype == "update") {
          self._networkRootLoaded = true;
        } else {
          self.clearPetriNet();
          return;
        }
      }
    }
    if (events.length && events[0].etype === "complete" && self._networkRootLoaded) {
      self._initPetriNet();
    }
  };

  MyVizControl.prototype._stateActiveObjectChanged = function (model, activeObjectId
  ) {
    if (this._currentNodeId === activeObjectId) {
      // The same node selected as before - do not trigger
    } else {
      this.selectedObjectChanged(activeObjectId);
    }
  };

  /* reference: https://github.com/austinjhunt/petrinet-webgme-designstudio/blob/main/petri-net/src/visualizers/widgets/SimViz/SimVizWidget.js */
  MyVizControl.prototype._initPetriNet = function () {
    const raw = this._client.getAllMetaNodes();
    const self = this;
    const petriNetNode = this._client.getNode(this._currentNodeId);
    const elementIds = petriNetNode.getChildrenIds();
    let placeIds = getPlacesIds(this._client, elementIds);
    let transitionIds = getTransitionsIds(this._client, elementIds);
    let arcst2pstr = "TransToPlaceArc";
    let arcsp2tstr = "PlaceToTransArc";
    let arcst2p = getArcs(self._client, arcst2pstr, elementIds);
    let arcsp2t = getArcs(self._client, arcsp2tstr, elementIds);
    let place2TransInMap = getPlace2TransInMap(placeIds, transitionIds, arcst2p);
    let place2TransOutMap = getPlace2TransOutMap(placeIds, transitionIds, arcsp2t);
    let startingPlaceId = getStartingPlaceId(place2TransInMap);
    let petriNet = this.initPetriNet(isNetInDeadLock, startingPlaceId, arcsp2t, arcst2p, place2TransInMap, place2TransOutMap);
    const META = this.initMETA(raw);

    this.initElements(elementIds, self._client, arcsp2t, arcst2p, META, place2TransInMap, place2TransOutMap, petriNet)

    petriNet.setFireableEvents = this.setFireableEvents;
    self._widget.initNet(petriNet);
  };


  MyVizControl.prototype.initPlace = function (elementId, _name, _marking, _nextPlaceIds, _outTransitions, _inTransitions, _outArcs, _position) {
    let _place = {
      id: elementId,
      name: _name,
      marking: _marking,
      nextPlaceIds: _nextPlaceIds,
      outTransitions: _outTransitions,
      inTransitions: _inTransitions,
      outArcs: _outArcs,
      position: _position,
    };
    return _place;
  };

  MyVizControl.prototype.initMETA = function (_raw) {
    const META = {};
    for (let node of _raw) {
      META[node.getAttribute("name")] = node.getId();
    }
    return META;
  }
  MyVizControl.prototype.initTrans = function (elementId, _name, _placesTo, _placesFrom, _outArcs, _position) {
    let _trans = {
      id: elementId,
      name: _name,
      outPlaces: _placesTo,
      inPlaces: _placesFrom,
      outArcs: _outArcs,
      position: _position,
    };
    return _trans;
  };

  MyVizControl.prototype.initPetriNet = function (_deadLock, _startingPlaceId, _PlaceToTransArc, _TransToPlaceArc, _place2TransInMap, _place2TransOutMap) {
    let _petriNet =
    {
      deadlockActive: _deadLock,
      startingPlace: _startingPlaceId,
      places: {},
      transitions: {},
      place2TransInMap: _place2TransInMap,
      place2TransOutMap: _place2TransOutMap,
      PlaceToTransArc: _PlaceToTransArc,
      TransToPlaceArc: _TransToPlaceArc,
    };
    return _petriNet;
  }

  MyVizControl.prototype.initElements = function (elementIds, _client, _PlaceToTransArc, _TransToPlaceArc, _META, _place2TransInMap, _place2TransOutMap, _petriNet) {
    for (let elementId of elementIds) {
      const node = _client.getNode(elementId);
      let _name = node.getAttribute("name");
      let _position = node.getRegistry("position");
      if (node.isTypeOf(_META["Place"])) {
        let _marking = parseInt(node.getAttribute("marking"));
        let _nextPlaceIds = getPlacesConnectedToPlace(
          elementId,
          _PlaceToTransArc,
          _TransToPlaceArc
        );
        let _outTransitions = getTransitionsPlaceIsDst(elementId, _place2TransOutMap);
        let _inTransitions = getTransitionsPlaceIsSrc(elementId, _place2TransInMap);
        let _outArcs = _PlaceToTransArc.filter((arc) => arc.src === elementId);
        let _place = this.initPlace(elementId, _name, _marking, _nextPlaceIds, _outTransitions, _inTransitions, _outArcs, _position);
        _petriNet.places[elementId] = _place;
      } else if (isTypeOf(node, _META, "Transition")) {
        let _outPlaces = getPlacesTransitionIsTo(elementId, _place2TransInMap);
        let _inPlaces = getPlacesTransitionIsFrom(elementId, _place2TransOutMap);
        let _outArcs = _TransToPlaceArc.filter((arc) => arc.src === elementId);
        let _transition = this.initTrans(elementId, _name, _outPlaces, _inPlaces, _outArcs, _position);
        _petriNet.transitions[elementId] = _transition;
      }
    }
  }



  MyVizControl.prototype.clearPetriNet = function () {
    this._networkRootLoaded = false;
    this._widget.destroyNet();
  };

  MyVizControl.prototype.setFireableEvents = function (_transitionEnabledArray) {
    this._fireableEvents = _transitionEnabledArray;
    if (!_transitionEnabledArray) return;
    if (_transitionEnabledArray.length === 0) {
      this._fireableEvents = null;
    } else if (_transitionEnabledArray.length >= 1) {
      this.$btnEventSelector.clear();
      _transitionEnabledArray.forEach((transition) => {
        this.$btnEventSelector.addButton(this.getFireButton(transition));
      });
    }
    this._displayToolbarItems();
  };

  MyVizControl.prototype.getFireButton = function (_transition) {
    let _button = {
      text: `Fire transition: ${_transition.name}`,
      title: `Fire transition: ${_transition.name}`,
      data: { event: _transition },
      clickFn: (data) => {
        this._widget.fireEvent(data.event);
      },
    }
    return _button;
  }

  /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
  MyVizControl.prototype.destroy = function () {
    this._detachClientEventListeners();
    this._removeToolbarItems();
  };

  MyVizControl.prototype._attachClientEventListeners = function () {
    this._detachClientEventListeners();
    WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged, this);
  };

  MyVizControl.prototype._detachClientEventListeners = function () {
    WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged);
  };

  MyVizControl.prototype.onActivate = function () {
    this._attachClientEventListeners();
    this._displayToolbarItems();

    if (typeof this._currentNodeId === "string") {
      WebGMEGlobal.State.registerActiveObject(this._currentNodeId, {
        suppressVisualizerFromNode: true,
      });
    }
  };

  MyVizControl.prototype.onDeactivate = function () {
    this._detachClientEventListeners();
    this._hideToolbarItems();
  };

  /* * * * * * * * * * Updating the toolbar * * * * * * * * * */
  MyVizControl.prototype._displayToolbarItems = function () {
    if (this._toolbarInitialized === true) {
      this.$btnResetNet.show();
      if (this._fireableEvents === null || this._fireableEvents.length == 0) {
        this.$btnEventSelector.hide();
        this.$deadlockLabel.show();
      } else {
        this.$btnEventSelector.show();
        this.$deadlockLabel.hide();
      }
    } else {
      this._initializeToolbar();
    }
  };

  MyVizControl.prototype._hideToolbarItems = function () {
    if (this._toolbarInitialized === true) {
      for (var i = this._toolbarItems.length; i--;) {
        this._toolbarItems[i].hide();
      }
    }
  };

  MyVizControl.prototype._removeToolbarItems = function () {
    if (this._toolbarInitialized === true) {
      for (var i = this._toolbarItems.length; i--;) {
        this._toolbarItems[i].destroy();
      }
    }
  };

  // interpreter on the top, initially, there are classifier, reset button and transition firer
  MyVizControl.prototype._initializeToolbar = function () {
    var toolBar = WebGMEGlobal.Toolbar;
    const self = this;
    self._toolbarItems = [];
    self._toolbarItems.push(toolBar.addSeparator());
    self.$btnPetriNetClassifier = toolBar.addButton(this.generateButton(self, "PetriNetClassifier"));
    self.$btnResetNet = toolBar.addButton(this.generateButton(self, "ResetButton"));
    self.$btnEventSelector = toolBar.addDropDownButton(this.generateButton(self, "TransitionFirer"));

    self.$deadlockLabel = toolBar.addLabel();
    self.$deadlockLabel.text("Meet the DeadLock");
    self._toolbarItems.push(self.$btnEventSelector);
    self._toolbarItems.push(self.$btnResetNet);
    self._toolbarItems.push(self.$btnPetriNetClassifier);
    self._toolbarItems.push(self.$deadlockLabel);
    self.$btnEventSelector.hide();
    self.$deadlockLabel.hide();
    self._toolbarInitialized = true;
  };

  MyVizControl.prototype.generateButton = function (self, type) {
    let _button = null;
    if (type === "PetriNetClassifier") {
      _button = {
        text: "Try classification ",
        title: "Try classification",
        icon: "glyphicon glyphicon-search",
        clickFn: function () {
          const context = self._client.getCurrentPluginContext(
            "PetriNetClassifier",
            self._currentNodeId,
            []
          );
          context.pluginConfig = {};
          self._client.runServerPlugin(
            "PetriNetClassifier",
            context,
            function (err, result) {
              console.log("plugin err:", err);
              console.log("plugin result:", result);
            }
          );
        },
      }
    } else if (type === "ResetButton") {
      _button = {
        title: "Reset simulator",
        text: "Reset simulator  ",
        icon: "glyphicon glyphicon-refresh",
        clickFn: function () {
          self._widget.resetNet();
        },
      }
    } else if (type === "TransitionFirer") {
      _button = {
        text: "Fire single transition ",
        title: "Fire single transition",
        icon: "glyphicon glyphicon glyphicon-forward",
      }
    }
    return _button;
  }
  return MyVizControl;
});

/* From this line to the end of file, reference: https://github.com/austinjhunt/petrinet-webgme-designstudio/blob/main/petri-net/src/visualizers/panels/SimViz/Util.js */
let getMetaName = (client, node) => {
  let metaTypeId = node.getMetaTypeId();
  return client.getNode(metaTypeId).getAttribute("name");
};

let getArcs = (client, metaName, elementIds) => {
  let arcs = [];
  elementIds.forEach((id, i) => {
    let node = client.getNode(id);
    if (getMetaName(client, node) === metaName) {
      arcs.push({
        id: id,
        name: node.getAttribute("name"),
        src: getArcPointerNodeId(node, "src"),
        dst: getArcPointerNodeId(node, "dst"),
      });
    }
  });
  return arcs;
};

// judge if the net is in a deadlock (:= every transition is unable to fire)
let isNetInDeadLock = (petriNet) => {
  let _transitions = Object.keys(petriNet.transitions);
  a: for (transId of _transitions) {
    let _inPlaces = getPlacesTransitionIsFrom(transId, petriNet.place2TransOutMap);
    b: for (IdOfInPlace of _inPlaces) {
      if (parseInt(petriNet.places[IdOfInPlace].marking) <= 0) {
        continue a;
      }
    }
    return false;
  }
  return true;
}

let getPlacesIds = (client, elementIds) => {
  return getTypeNodeIds(client, elementIds, "Place");
};

let getTransitionsIds = (client, elementIds) => {
  return getTypeNodeIds(client, elementIds, "Transition");
};

// want to get all the nodes of a specific type
let getTypeNodeIds = (client, elementIds, typeName) => {
  let _res = [];
  for (let _ele of elementIds) {
    let _node = client.getNode(_ele);
    if (getMetaName(client, _node) === typeName) {
      _res.push(_ele);
    }
  }
  return _res;
}

let getPlace2TransOutMap = (placeIds, transitionIds, PlaceToTransArc) => {
  let place2TransOutMap = {};
  for (let _place of placeIds) {
    place2TransOutMap[_place] = {};
    for (let _transition of transitionIds) {
      place2TransOutMap[_place][_transition] = isThereExistsPlaceToTrans(_place, _transition, PlaceToTransArc);
    }
  }
  return place2TransOutMap;
};

let getPlace2TransInMap = (placeIds, transitionIds, TransToPlaceArc) => {
  let place2TransInMap = {};
  for (let _place of placeIds) {
    place2TransInMap[_place] = {};
    for (let _trans in transitionIds) {
      place2TransInMap[_place][_trans] = isThereExistsTransToPlace(_place, _trans, TransToPlaceArc);
    }
  }
  return place2TransInMap;
};

let getArcPointerNodeId = (arc, pointerName) => {
  // return id of node being pointed at where pointerName is either 'src' or 'dst'
  return arc.getPointerId(pointerName);
};

let isThereExistsPlaceToTrans = (placeId, transitionId, PlaceToTransArc) => {
  for (let _p2t of PlaceToTransArc) {
    if (_p2t.src === placeId && _p2t.dst === transitionId) {
      return true;
    }
  }
  return false;
};

//
let isThereExistsTransToPlace = (placeId, transitionId, TransToPlaceArc) => {
  for (let _t2p of TransToPlaceArc) {
    if (_t2p.src === transitionId && _t2p.dst === placeId) {
      return true;
    }
  }
  return false;
};


let isTypeOf = (node, META, typeString) => {
  return node.isTypeOf(META[typeString])
}

let getStartingPlaceId = (place2TransInMap) => {
  for (const placeId in place2TransInMap) {
    if (Object.entries(place2TransInMap[placeId]).every((arr) => {
      return !arr[1];
    })) {
      return placeId;
    } 
  }
  for (const placeId in place2TransInMap) {
    return placeId;
  }
};

// Find transitions connected to a place, and get the dst places of every transition
let getPlacesConnectedToPlace = (placeId, PlaceToTransArc, TransToPlaceArc) => {
  let nextPlaces = [];
  let _p2tArcs = [];
  for (let _p2t of PlaceToTransArc) {
    if (_p2t.src == placeId) {
      _p2tArcs.push(_p2t);
    }
  }
  for (let _myp2t of _p2tArcs) {
    for (let _t2p of TransToPlaceArc) {
      if (_myp2t.dst === _t2p.src) {
        nextPlaces.push(_t2p.dst);
      }
    }
  }
  return nextPlaces;
};

let getTransitionsPlaceIsDst = (placeId, place2TransOutMap) => {
  // get a transition id list, every element of which is the out of place[placeId]
  let _trans = Object.keys(place2TransOutMap[placeId]);
  let _res = [];
  for (let _tran of _trans) {
    if (place2TransOutMap[placeId][_tran]) {
      _res.push(_tran);
    }
  }
  return _res;
};

let getTransitionsPlaceIsSrc = (placeId, place2TransInMap) => {
  // get a transition id list, every element of which is to place[placeId]
  let _trans = Object.keys(place2TransInMap[placeId]);
  let _res = [];
  for (let _tran of _trans) {
    if (place2TransInMap[placeId][_tran]) {
      _res.push(_tran);
    }
  }
  return _res;
};

let getPlacesTransitionIsFrom = (transId, place2TransOutMap) => {
  let _places = Object.keys(place2TransOutMap);
  let _res = [];
  for (let _place of _places) {
    if (place2TransOutMap[_place][transId]) {
      _res.push(_place);
    }
  }
  return _res;
};

let getPlacesTransitionIsTo = (transId, place2TransInMap) => {
  let _places = Object.keys(place2TransInMap);
  let _res = [];
  for (let _place of _places) {
    if (place2TransInMap[_place][transId]) {
      _res.push(_place);
    }
  }
  return _res;
};
