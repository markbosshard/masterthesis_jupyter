/**
 * Created by Mark Bosshard on 31.03.17.
 */

    var myDiagram;

   function initMe(pageType) {
        if (window.goSamples) goSamples();  // init for these samples -- you don't need to call this
        var $$ = go.GraphObject.make;  // for conciseness in defining templates

        myDiagram =
            $$(go.Diagram, "flowchartPane",  // must name or refer to the DIV HTML element
                {
                    initialContentAlignment: go.Spot.Center,
                    allowDrop: true,  // must be true to accept drops from the Palette
                    "LinkDrawn": showLinkLabel,  // this DiagramEvent listener is defined below
                    "LinkRelinked": showLinkLabel,
                    "animationManager.duration": 800, // slightly longer than default (600ms) animation
                    "undoManager.isEnabled": true,  // enable undo & redo
                    "resizingTool.maxSize": new go.Size(6000, 30), // we need these for the dragable milestone minimum (fix height)
                    "resizingTool.minSize": new go.Size(60, 30) // we need this for the draggable milestone max (fix height!)
                });

        // when the document is modified, add a "*" to the title and enable the "Save" button
        /*
         myDiagram.addDiagramListener("Modified", function(e) {
         var button = document.getElementById("SaveButton");
         if (button) button.disabled = !myDiagram.isModified;
         var idx = document.title.indexOf("*");
         if (myDiagram.isModified) {
         if (idx < 0) document.title += "*";
         } else {
         if (idx >= 0) document.title = document.title.substr(0, idx);
         }
         }); */

        // helper definitions for node templates

        function nodeStyle() {
            return [
                // The Node.location comes from the "loc" property of the node data,
                // converted by the Point.parse static method.
                // If the Node.location is changed, it updates the "loc" property of the node data,
                // converting back using the Point.stringify static method.
                new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
                {
                    // the Node.location is at the center of each node
                    locationSpot: go.Spot.Center,
                    //isShadowed: true,
                    //shadowColor: "#888",
                    // handle mouse enter/leave events to show/hide the ports
                    mouseEnter: function (e, obj) {
                        showPorts(obj.part, true);
                    },
                    mouseLeave: function (e, obj) {
                        showPorts(obj.part, false);
                    }
                }
            ];
        }

        // Define a function for creating a "port" that is normally transparent.
        // The "name" is used as the GraphObject.portId, the "spot" is used to control how links connect
        // and where the port is positioned on the node, and the boolean "output" and "input" arguments
        // control whether the user can draw links from or to the port.
        function makePort(name, spot, output, input) {
            // the port is basically just a small circle that has a white stroke when it is made visible
            return $$(go.Shape, "Circle",
                {
                    fill: "transparent",
                    stroke: null,  // this is changed to "white" in the showPorts function
                    desiredSize: new go.Size(8, 8),
                    alignment: spot, alignmentFocus: spot,  // align the port on the main Shape
                    portId: name,  // declare this object to be a "port"
                    fromSpot: spot, toSpot: spot,  // declare where links may connect at this port
                    fromLinkable: output, toLinkable: input,  // declare whether the user may draw links to/from here
                    cursor: "pointer"  // show a different cursor to indicate potential link point
                });
        }

        // define the Node templates for regular nodes

        var lightText = 'whitesmoke';

        myDiagram.nodeTemplateMap.add("",  // the default category
            $$(go.Node, "Spot", nodeStyle(),
                // the main object is a Panel that surrounds a TextBlock with a rectangular Shape
                $$(go.Panel, "Auto",
                    $$(go.Shape, "Rectangle",
                        {fill: "#f27935", stroke: null, name: "COLOR" },
                        new go.Binding("figure", "figure")),
                    $$(go.TextBlock,
                        {
                            font: "bold 11pt Helvetica, Arial, sans-serif",
                            stroke: lightText,
                            margin: 8,
                            maxSize: new go.Size(160, NaN),
                            wrap: go.TextBlock.WrapFit,
                            editable: true
                        },
                        new go.Binding("text").makeTwoWay())

                ),
                // four named ports, one on each side:
                //makePort("T", go.Spot.Top, false, true),
                makePort("L", go.Spot.Left, false, true),
                makePort("R", go.Spot.Right, true, false)
                //makePort("B", go.Spot.Bottom, true, false)
            ));

        myDiagram.nodeTemplateMap.add("Milestone",  // the default category
            $$(go.Node, "Spot", nodeStyle(), {resizable: true, resizeObjectName: "R", movable: true, maxLocation: new go.Point(Infinity, NaN), minLocation: new go.Point(-Infinity, NaN)},
                // the main object is a Panel that surrounds a TextBlock with a rectangular Shape
                $$(go.Panel, "Auto",
                    $$(go.Shape, "Rectangle",
                        {fill: "#dbe1e8", stroke: null, name: "SHAPE", click: shapeClicked,
                        },
                        new go.Binding("desiredSize", "Osize", go.Size.parse).makeTwoWay(go.Size.stringify),
                        new go.Binding("figure", "figure")),
                    $$(go.TextBlock,
                        {
                            font: "bold 11pt Helvetica, Arial, sans-serif",
                            stroke: "black",
                            margin: 8,
                            maxSize: new go.Size(160, NaN),
                            wrap: go.TextBlock.WrapFit,
                            editable: true
                        },
                        new go.Binding("text").makeTwoWay())
                )
            ));



        myDiagram.nodeTemplateMap.add("End",
            $$(go.Node, "Spot", nodeStyle(), {movable: true, maxLocation: new go.Point(Infinity, NaN), minLocation: new go.Point(-Infinity, NaN)},
                $$(go.Panel, "Auto",
                    $$(go.Shape, "Circle",
                        {minSize: new go.Size(40, 40), fill: "#DC3C00", stroke: null}),
                    $$(go.TextBlock, "End",
                        {font: "bold 11pt Helvetica, Arial, sans-serif", stroke: lightText},
                        new go.Binding("text"))
                ),
                // three named ports, one on each side except the bottom, all input only:
                makePort("L", go.Spot.Left, false, true)
            ));


        myDiagram.nodeTemplateMap.add("Start",
            $$(go.Node, "Spot", nodeStyle(), {movable: false},
                $$(go.Panel, "Auto",
                    $$(go.Shape, "Circle",
                        {minSize: new go.Size(40, 40), fill: "#79C900", stroke: null}),
                    $$(go.TextBlock, "Start",
                        {font: "bold 11pt Helvetica, Arial, sans-serif", stroke: lightText},
                        new go.Binding("text"))
                ),
                // three named ports, one on each side except the top, all output only:
                makePort("R", go.Spot.Right, true, false)
            ));


        // replace the default Link template in the linkTemplateMap
        myDiagram.linkTemplate =
            $$(go.Link,  // the whole link panel
                {
                    routing: go.Link.AvoidsNodes,
                    curve: go.Link.JumpOver,
                    corner: 5, toShortLength: 4,
                    relinkableFrom: true,
                    relinkableTo: true,
                    reshapable: true,
                    resegmentable: true,
                    // mouse-overs subtly highlight links:
                    mouseEnter: function (e, link) {
                        link.findObject("HIGHLIGHT").stroke = "rgba(30,144,255,0.2)";
                    },
                    mouseLeave: function (e, link) {
                        link.findObject("HIGHLIGHT").stroke = "transparent";
                    }
                },
                new go.Binding("points").makeTwoWay(),
                $$(go.Shape,  // the highlight shape, normally transparent
                    {isPanelMain: true, strokeWidth: 8, stroke: "transparent", name: "HIGHLIGHT"}),
                $$(go.Shape,  // the link path shape
                    {isPanelMain: true, stroke: "gray", strokeWidth: 2}),
                $$(go.Shape,  // the arrowhead
                    {toArrow: "standard", stroke: null, fill: "gray"}),
                $$(go.Panel, "Auto",  // the link label, normally not visible
                    {visible: false, name: "LABEL", segmentIndex: 2, segmentFraction: 0.5},
                    new go.Binding("visible", "visible").makeTwoWay(),
                    $$(go.Shape, "RoundedRectangle",  // the label shape
                        {fill: "#F8F8F8", stroke: null}),
                    $$(go.TextBlock, "Yes",  // the label
                        {
                            textAlign: "center",
                            font: "10pt helvetica, arial, sans-serif",
                            stroke: "#333333",
                            editable: true
                        },
                        new go.Binding("text").makeTwoWay())
                )
            );

        // Make link labels visible if coming out of a "conditional" node.
        // This listener is called by the "LinkDrawn" and "LinkRelinked" DiagramEvents.
        function showLinkLabel(e) {
            var label = e.subject.findObject("LABEL");
            if (label !== null) label.visible = (e.subject.fromNode.data.figure === "Diamond");
        }

        // temporary links used by LinkingTool and RelinkingTool are also orthogonal:
        myDiagram.toolManager.linkingTool.temporaryLink.routing = go.Link.Orthogonal;
        myDiagram.toolManager.relinkingTool.temporaryLink.routing = go.Link.Orthogonal;


        // initialize the Palette that is on the left side of the page
        myPalette =
            $$(go.Palette, "flowchartSelector",  // must name or refer to the DIV HTML element
                {
                    "animationManager.duration": 800, // slightly longer than default (600ms) animation
                    nodeTemplateMap: myDiagram.nodeTemplateMap,  // share the templates used by myDiagram
                    model: new go.GraphLinksModel([  // specify the contents of the Palette
                        /*{ category: "Start", text: "Start" },*/
                        {text: "New Assignment"} /*,
                         /*{ text: "???", figure: "Diamond" },
                         { category: "End", text: "End" },
                         { category: "Comment", text: "Comment" }*/
                    ])
                });

        // The following code overrides GoJS focus to stop the browser from scrolling
        // the page when either the Diagram or Palette are clicked or dragged onto.
        function customFocus() {
            var x = window.scrollX || window.pageXOffset;
            var y = window.scrollY || window.pageYOffset;
            go.Diagram.prototype.doFocus.call(this);
            window.scrollTo(x, y);
        }

        // let the user only select one thing at a time
        myDiagram.maxSelectionCount = 1;

        // connect to the jQuery environment "builder" in order to load the right assignment pane there
        require([
        'nbextensions/ma/client/common/js/helper_jqbuilder.js'
        ], function(
         builder
        ) {
            var assignmentDetails = new Array();

            myDiagram.addDiagramListener("ObjectSingleClicked",
                function (e) {
                    var part = e.subject.part;

                    //find the active element & hide it when  arrow or start/end clicked
                    if ((part instanceof go.Link) || (part.data.key > 10000) || (part.data.text == "Start") || (part.data.text == "End")) {
                        builder.deactivateAssignmentDetail();
                    }

                    // when a part is clicked: 1) deactivate any active assignment
                    // 2) create a new assignment or just show the old assignment depending on whether we created it before
                    if (!(part instanceof go.Link) && !(part.data.key > 10000) && !(part.data.text == "Start") && !(part.data.text == "End"))  {
                        builder.deactivateAssignmentDetail();
                        builder.activateAssignmentDetail(part.data.key+100);
                    }
                });

            //find the active element & hide it when background clicked
            myDiagram.addDiagramListener("BackgroundSingleClicked",
                function (e) {
                    builder.deactivateAssignmentDetail();
                });

            myDiagram.addDiagramListener("SelectionDeleting",
                function (e) {
                    // find out key of new assignment
                    for (var it = e.diagram.selection.iterator; it.next(); ) {
                        var node = it.value; // part is now a Node or a Group or a Link or maybe a simple Part
                        console.log(node.data.color);
                        var keyOfNewAssignment = node.data.key;
                    }
                    console.log(keyOfNewAssignment);

                    builder.deleteAssignmentDetail(keyOfNewAssignment+100);
            });

            // save the node in palette, in order to deselect it later when dropped
            var nodeTemp;
            myPalette.addDiagramListener("ChangedSelection",
                function (e) {
                    // find the selected key, unselect it
                    for (var it = e.diagram.selection.iterator; it.next(); ) {
                        var node = it.value; // part is now a Node or a Group or a Link or maybe a simple Part
                    }
                    nodeTemp = node;
            });

            // when a new object is dropped onto the diagram, create the object
            myDiagram.addDiagramListener("ExternalObjectsDropped",
                function (e) {
                    // hide any previously activated objects
                    builder.deactivateAssignmentDetail();

                    // find out key of new assignment
                    for (var it = e.diagram.selection.iterator; it.next(); ) {
                        var node = it.value; // part is now a Node or a Group or a Link or maybe a simple Part
                        var keyOfNewAssignment = node.data.key;
                    }
                    // instantiate the new object
                    builder.createNewAssignmentDetail(keyOfNewAssignment+100);
                    assignmentDetails.push(keyOfNewAssignment+100);

                    // deselect the node in the palette, that we saved as temp before
                    nodeTemp.isSelected = false;

                    // for later use: that's how to change an object's color:
                    //var shape = node.findObject("COLOR");
                    //shape.fill = "#1fbba6";

            });

            myDiagram.addDiagramListener("TextEdited",
                function (e) {
                    var part = e.subject.part;
                    if (part.data.key < 10000) { // otherwise it's a milestone
                        builder.changeAssignmentText(part.data.key + 100, part.data.text);
                    } else {
                        // for milestones don't allow line breaks in the text
                        part.data.text = part.data.text.replace(/(\r\n|\n|\r)/gm,"");
                    }
            });

        });

        myDiagram.doFocus = customFocus;
        myPalette.doFocus = customFocus;

        var div = myDiagram.div;
        div.style.overflow = "hidden";
        div.style.width = '700px';
        div.style.height = '180px'
        myDiagram.requestUpdate(); // Needed!

       // no "New assignment" needed on pagetype = master
       if (pageType == "wizard") {
           var div2 = myPalette.div;
           div2.style.overflow = "hidden";
           div2.style.width = '150px';
           div2.style.height = '42px'
           myPalette.requestUpdate(); // Needed!
       } else {
           myDiagram.isReadOnly = true;
       }

        //determineDepnendencyLevels();
    }  // end init

// function needed for milestones resizing
    function shapeClicked(e, obj) {
      var node = obj.part;
      if (!node.isSelected) return;
      e.diagram.startTransaction("change resizeObjectName");
      node.resizeObjectName = obj.name;
      node.removeAdornment("Resizing");
      node.updateAdornments();
      e.diagram.commitTransaction("change resizeObjectName");
    }

// ToDo: Also check for: all nodes MUST HAVE CHILDREN apart from endnode
// http://gojs.net/latest/api/symbols/Node.html#findTreeParentNode
    function checkDiagramCompleteness() {
       for (var it = myDiagram.nodes; it.next();) {
                var node = it.value;
                if(node.data.key < 10000) { // exclude milestone elements
                    console.log(node.findTreeRoot().data.text);
                    if (!(node.findTreeRoot().data.text == "Start")) {
                        return false;
                    }
                }
        }
        return true;
    }

    /* unused development stuff
    var depLevelByKey;
    function determineDepnendencyLevels() {
        depLevelByKey = new Array();
       parentNodes = new Array();
       nodesByKey = new Array();
       for (var it = myDiagram.nodes; it.next();) {
           // add all nodes into one array
           nodesByKey[it.value.data.key+100] = it.value;

           // add the start node's dependency level
           if (it.value.data.text == "Start") {
               var startNodeKey = it.value.data.key+100;
               parentNodes[0] = it.value;
           }
        }

        findAllChildrenFromManyParents(parentNodes);

        //childNodes = find all children
           //parentChain = find the childrens parent chain
           //if parentChain contains childNodes.node, remove these nodes!
           //label the children
           //do again starting from all children!
    }


    function findAllChildrenFromManyParents(parentNodes) {
        var treeChildrenNodes = new Array();

        // get a vector with all child nodes
       for (var it = parentNodes.findNodesConnected("r"); it.next();) {
            treeChildrenNodes.push(it.value.data.key);
       }

       // in that vector take away children that are contained in the parent chain
       for (var it = parentNodes.findNodesConnected("r")); it.next();) {
           for (var it2 = it.value.findTreeParentChain(); it.next();) {
               if (treeChildrenNodes.indexof(it2.value.key) >= 0) {
                   treeChildrenNodes.remove(it2.value.key);
               }
           }
       }

       console.log(treeChildrenNodes);
    } */

    // Make all ports on a node visible when the mouse is over the node
    function showPorts(node, show) {
        var diagram = node.diagram;
        if (!diagram || diagram.isReadOnly || !diagram.allowLink) return;
        node.ports.each(function (port) {
            port.stroke = (show ? "white" : null);
        });
    }


    // Show the diagram's model in JSON format that the user may edit
    /**function save() {
    document.getElementById("mySavedModel").value = myDiagram.model.toJson();
    myDiagram.isModified = false;
  } **/

    function loadInitial() {
        // get the standard json we use for a newly created flowchart (saved in wizard.html)
        myDiagram.model = go.Model.fromJson(document.getElementById("mySavedModel").value);
    }

    function loadExisting(modelJSON) {
         myDiagram.model = go.Model.fromJson(modelJSON);
    }

    function exportDiagramJSON() {
        return myDiagram.model.toJson();
    }



