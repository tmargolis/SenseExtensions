/* 
Branch Showcase using the Leap, Famo.us and Qlik Sense
Builds an "Inverse Bar Chart" from Qlik Sense data using Famo.us JS 
visualization library and a Leap Motion Controller for interaction

Gesture Mapping:
	Swipe Right: Flip entire graph to show back side
	Swipe Left: Flip entire graph to show front side
	Single-finger Circle: Start hand tracking
	Single-finger Tap: Stop hand tracking

Todd Margolis, Qlik Partner Engineering - 2014
*/


requirejs.config({
	shim : {
		"http://js.leapmotion.com/leap-plugins-0.1.8.min.js" : {
			"deps" : ["http://js.leapmotion.com/leap-0.6.3.min.js"]
		}
	}
});

/*globals define*/
define(["jquery", "text!./famous.css", "http://code.famo.us/famous/0.3/famous-global.min.js", "http://js.leapmotion.com/leap-plugins-0.1.8.min.js"], function($, cssContent, famous, LeapPlugin) {

    $("<style>").html(cssContent).appendTo("head");
	return {
        initialProperties: {
            version: 1.0,
            qHyperCubeDef: {
                qDimensions: [],
                qMeasures: [],
                qInitialDataFetch: [{
                    qWidth: 10,
                    qHeight: 50
                }]
            }
        },
        definition: {
            type: "items",
            component: "accordion",
            items: {
                dimensions: {
                    uses: "dimensions",
                    min: 1,
                    max: 2
                },
                measures: {
                    uses: "measures",
                    min: 1,
                    max: 20
                },
                sorting: {
                    uses: "sorting"
                },
                settings: {
                    uses: "settings"
                }
            }
        },
        snapshot: {
            canTakeSnapshot: true
        },
        paint: function ($element, layout) {
/*
        	// Get Sense Header Data
			var dims = layout.qHyperCube.qDimensionInfo;
			var msrs = layout.qHyperCube.qMeasureInfo;
			var numRows = layout.qHyperCube.qDataPages[0].qMatrix;
        	console.log("Dims", dims);
        	console.log("Msrs", msrs);
        	console.log("NumRows", numRows);
*/

			// Import Famo.us dependencies
			var Engine 			= famous.core.Engine;
			var Modifier 		= famous.core.Modifier;
			var StateModifier 	= famous.modifiers.StateModifier;
			var Transform 		= famous.core.Transform;
			var Surface 		= famous.core.Surface;
			var Easing			= famous.transitions.Easing;
			var Flipper 		= famous.views.Flipper;

          	// Create unique id for Famo.us root node context
            var id = "sb_" + layout.qInfo.qId;
			//if extension has already been loaded, empty it, if not attach unique id
            if (document.getElementById(id)) {
                $("#" + id).empty();
            } else {
                $element.append($('<div />').attr("id", id));
            }
            var destElement = document.getElementById(id);
			var mainContext = Engine.createContext(destElement);
			mainContext.setPerspective(900);

			// Slide everything over to the center
			var rootModifier = new Modifier({
				origin: [0.0, 0.0],
				align: [0.0, 0.0],
				transform : function () {
					return Transform.translate($element.width()/2, 0, 0);
				}
			});

			// Master transform
			// var initialTime = Date.now(); // For auto-spin
			var mainModifier = new Modifier({
				origin: [0.0, 0.0],
				align: [0.0, 0.0]
				// transform : function () {
				// 	return Transform.rotateY(.00002 * (Date.now() - initialTime));
				// }
			});
			var offsetContext = mainContext.add(rootModifier).add(mainModifier);

            // Setup Leap Helper Divs
      		$("#"+id).append($('<div />').attr("id", "LeapData"));
      		$("#"+id).append($('<div />').attr("id", "cursor"));
      		$("#LeapData").css('left',$element.width()/2);
      		$("#LeapData").css('top',$element.height()/2);
      		$("#cursor").css('left',$element.width()/2);
      		$("#cursor").css('top',$element.height()/2);

			// Setup Leap
			window.cursor = $('#cursor');
			var gestureDuration = 150000;
			var swipe = false, tracking = false, keyTap = false, screenTap = false;
			var flipped = false;

			Leap.loop({enableGestures: true, hand: function(hand){
				// Leap loop for pointer tracking

				var screenPosition = hand.screenPosition(hand.palmPosition);

				// Normalized Position for Leap/Screen Offset
				var np = [	screenPosition[0] - 500, 
							screenPosition[1] + 500, 
							screenPosition[2] - 500];

				// hide and show the cursor in order to get second-topmost element.
				cursor.hide();
				var el = document.elementFromPoint(
					hand.screenPosition()[0],
					hand.screenPosition()[1]
				);
				cursor.show();

				screenPosition[1] = screenPosition[1] + 1000;
				cursor.css({
					left: screenPosition[0] + 'px',
					top:  screenPosition[1] + 'px'
				});

				// Track Hand Position and move graph accordingly
				if(tracking){
					mainModifier.setTransform(Transform.translate(np[0], np[1], np[2]));
				}else{
					// Look for node under cursor
					var cl = cursor.position().left;
					var ct = cursor.position().top;
					$(".famous-surface").each(function(index){
						if(($( this ).position().left < cl) && ($( this ).position().left + $( this ).width() > cl)){
							if(($( this ).position().top < ct) && ($( this ).position().top + $( this ).height() > ct)){
								var classes = $(this).attr("class");
								var r = /\d+/;
								var nodeID = classes.match(r);
								if(nodeID){
									if(!flipping[nodeID]){
										// Flip node
										flippers[nodeID].flip({ duration : 1000, curve: Easing.outBounce }
											, function(){flipping[nodeID] = false;});
										flipping[nodeID] = true;
									}
								}
							}
						}
					});
				}
			}}, 
			// Leap loop for gesture recognition
			function(frame){
				// Are there gestures this frame?
				if(frame.valid && frame.gestures.length > 0){
					// Loop through all the gestures found
					frame.gestures.forEach(function(gesture){
						// Has the gesture completed?
						if(gesture.state == "stop"){
							switch (gesture.type){
								// Start hand tracking
								case "circle":
									console.log("Circle Gesture");
									tracking = true;
									break;
								// Stop hand tracking
								case "keyTap":
									console.log("Key Tap Gesture");
									tracking = false;
									break;
								// Not assigned for now
								case "screenTap":
									console.log("Screen Tap Gesture");
									break;
								// Flip graph
								case "swipe":
									if(!swipe && (gesture.duration > gestureDuration)){
										if(gesture.direction[0] > 0){
											mainModifier.setTransform(Transform.rotateY(Math.PI), 
												{duration : 1000, curve: Easing.inOutQuad},
												function(){ swipe = false;});
										} else {
											mainModifier.setTransform(Transform.rotateY(Math.PI*2), 
												{duration : 1000, curve: Easing.inOutQuad},
												function(){ swipe = false;});
										}
										console.log("Swipe Gesture");
										swipe = true;
									}
									break;
								}
							}
						});
					}
				})
			.use('screenPosition', {
				scale: 1
			});

            // Get Unique Values for 1st Dim (Graph Header)
            var parents = [];
            var data = layout.qHyperCube.qDataPages[0].qMatrix;
	        for(var h=0; h<data.length; h++){
				if(data[h][0].qText == undefined){
					data[h][0].qText = "?";
				}
				var exists = $.grep(parents, function(e){ return e.parent == data[h][0].qText; });
				if(exists.length == 0){
					parents.push({"parent": data[h][0].qText});
				}
			}

			// Setup look & feel parameters for graph
			var margin = 25;
			var nodeWidth = ($element.width() - parents.length * margin) / parents.length, 
				nodeHeight = 50, 
				nodeDepth = 100;
			var xOffset = 0, yOffset = 0, zOffset = 0;
			var frontHTML, backHTML;
			var nodes = [];
			var flippers = [], flipping = [];

			// Create header row
	        for(var p=0; p < parents.length; p++){
	        	var html = parents[p].parent;

				// Create Famo.us Header Object
				var headerObj = new Surface({
					size: [nodeWidth, nodeHeight],
					content: html,
					classes: ['double-sided', 'perp'],
					properties: {
						backgroundColor: 'rgb(240, 238, 233)',
						textAlign: 'center',
						overflow: 'hidden',
						padding: '3px',
						border: '2px solid rgb(210, 208, 203)',
						margin: '0px'
					}
				});

				xOffset = margin/2 + p * nodeWidth + margin * p;

				var offsetModifier = new StateModifier();
				offsetModifier.setTransform(
					Transform.translate(xOffset-$element.width()/2, 0, 0),
					{duration : 1000, curve: Easing.inOutBack}
				);

				// Add surface to scene graph
				offsetContext.add(offsetModifier).add(headerObj);
	        }

			// Cycle through each data row from Sense and create Famo.us surfaces
			this.backendApi.eachDataRow(function(rownum, row) {
				// Get Node Text
				if(row[1].qText == undefined){
					row[1].qText = "?";
				}
				frontHTML = row[1].qText;
				// backHTML = row[2].qText.slice(6);
				backHTML =  row[4].qText + "<BR><BR>";
				backHTML +=row[2].qText + "<BR>";
				backHTML += row[3].qText + "<BR>";

				var flip = new Flipper();

				// Set the content for the front surface of the node
				var front = new Surface({
					size: [nodeWidth, nodeHeight],
					content: frontHTML,
					classes: ['node'+rownum],
					properties: {
						backgroundColor: 'rgb(220, 248, 213)',
						textAlign: 'center',
						overflow: 'hidden',
						padding: '3px',
						border: '2px solid rgb(210, 208, 203)',
						margin: '0px'
					}
				});
				// Set the content for the back surface of the node
				var back = new Surface({
					// size: [nodeWidth*2, nodeHeight*3],
					size: [nodeWidth, nodeHeight],
					content: backHTML,
					classes: ['node'+rownum],
					properties: {
						fontSize: '8px',
						backgroundColor: 'rgb(200, 228, 203)',
						textAlign: 'center',
						overflow: 'hidden',
						padding: '3px',
						border: '2px solid rgb(210, 208, 203)',
						margin: '0px',
						zIndex: 10
					}
				});

				// Build the Flipper
				flip.setFront(front);
				flip.setBack(back);

				// Create Flipper callbacks for mouse interaction
				front.on('click', function(){
					flip.flip({ duration : 1400, curve: Easing.outBounce });
				});
				back.on('click', function(){
					this.setAttributes({zIndex: 1000});
					flip.flip({ duration : 1400, curve: Easing.outBounce });
				});

				// Assign child nodes to parents and define proper offsets
				var x = 0;
				for(var k=0; k < parents.length; k++){
					if(parents[k].parent == row[0].qText){
						xOffset = x;
						if(parents[k].children === undefined){
							parents[k].children = [];
						}
						parents[k].children.push(row[1].qText);
						yOffset = parents[k].children.length;
						break;
					}
					x++;
				}

				// Modifier for centering headers during flip
				var centerModifier = new StateModifier({
					align : [0.0,.0],
					origin : [0.5,.0]
				});

				// Modifier to move child nodes into correct starting positions
				nodeMod = new StateModifier();
				nodeMod.setTransform(
					Transform.translate(margin/2 + xOffset*nodeWidth + margin*x -$element.width()/2 + nodeWidth/2, 
						yOffset*(nodeHeight+margin), 
						zOffset*nodeDepth),
					{duration : 1000, curve: Easing.inOutBack}
				);

				offsetContext.add(nodeMod).add(centerModifier).add(flip);
				flippers.push(flip);
				flipping.push(false);
			});
		}
	};

} );

