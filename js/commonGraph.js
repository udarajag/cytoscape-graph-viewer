var glayout = 'cose-bilkent';
$(document).ready(function () {
    initialize();
    //To set different layouts
    $("[id^='layoutBtn_']").click(function () {
        glayout = $(this).attr('id').split("_")[1];
        initialize();
    });
});
function searchByQuery(query) {
    var data = {
        "statements": [{
                statement: query,
                resultDataContents: ["graph"]
            }]
    };
    sendAjax("POST", "http://localhost:7474/db/data/transaction/commit", data, intiGraphCy, null);
}

var demConceptCount = {};
var lastSelectedNodes = [];
function intiGraphCy(returnData) {
    $('#cy').hide();
    demConceptCount = {};
    var elements = [];
    var elementObjs = returnData.results[0].data;

    var parents = {};

    $.each(elementObjs, function (index, value) {
        $.each(value.graph.nodes, function (index1, nodeObj) {
            if (getNodeType(nodeObj) === "DC") {
                if (demConceptCount[nodeObj.id] === undefined) {
                    demConceptCount[nodeObj.id] = 0;
                }
            }
        });

        $.each(value.graph.relationships, function (index2, relationObj) {
            if (demConceptCount[relationObj.endNode] >= 0) {
                demConceptCount[relationObj.endNode] = demConceptCount[relationObj.endNode] + 1;
            }
            var relationship = {data: {source: relationObj.startNode
                    , target: relationObj.endNode
                    , name: relationObj.type
                    , edgeColor: getEdgeColor(relationObj)}};
            elements.push(relationship);
        });
    });
    //Iterate nodes again to identify dem concepts connected to more than 1 data record
    $.each(elementObjs, function (index, value) {
        $.each(value.graph.nodes, function (index1, nodeObj) {
            //var nodeType = getNodeType(nodeObj.labels);
            elements.push(getNodeByType(nodeObj));
        });
    });
    // console.log(elements.length);

    var cy = cytoscape({

        container: $('#cy'), // container to render in

        elements: elements,

        style: [
            {
                selector: 'node',
                style: {
                    'width': '80px',
                    'height': '80px',
                    'shape': 'data(nodeShape)',
                    'background-color': 'data(nodeColor)',
                    'label': 'data(name)',
                    'border-style': 'solid',
                    'border-color': '#008B8B',
                    'border-width': '1px',
                    //'caption-side': 'bottom',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'content': 'data(name)',
                    'color': 'black',
                    'text-outline-width': 0,
                    'background-opacity': 0.9
                }
            },

            {
                selector: 'edge',
                style: {
                    'curve-style': 'bezier',
                    'target-arrow-shape': 'triangle',
                    'label': 'data(name)',
                    'text-rotation': 'autorotate',
                    'line-color': 'data(edgeColor)',
                    'text-margin-x': -15
                }
            },

            {
                selector: ':selected',
                style: {
                    'background-opacity': 1,
                    //'background-color': 'black',
                    'line-color': 'black',
                    'target-arrow-color': 'black',
                    'source-arrow-color': 'black',
                    'text-outline-color': 'black',
                    'width': '130px',
                    'height': '130px',
                    'border-width': '3px',
                    'font-size': '1.3em',
                    'font-weight': 'bold'
                }
            },
            {
                selector: '.faded',
                style: {
                    'opacity': 0.25,
                    'text-opacity': 0.75
                }
            },
            {
                selector: ':common',
                style: {
                    'background-color': 'RED'
                }
            }
        ],
        layout: {

            name: glayout,
            animate: 'end',
            animationEasing: 'ease-out',
            animationDuration: 2000,
            randomize: true
        }

    });

//    var selectAllOfTheSameType = function (ele) {
//        cy.elements().unselect();
//        if (ele.isNode()) {
//            cy.nodes().select();
//        } else if (ele.isEdge()) {
//            cy.edges().select();
//        }
//    };
    cy.cxtmenu({
        selector: 'node',
        commands: [
            {
                content: 'ICPSR',
                select: function (ele) {
                    var nodeType = ele.data('nodeType');
                    try {
                        var uri = "";
                        if (nodeType === "DR" | nodeType === "PB") {
                            uri = this.data('uri');
                            window.open(uri);
                        }
                    } catch (e) {
                        window.location.href = this.data('uri');
                    }
                }
            },
            {
                content: 'Data',
                select: function (ele) {
                    console.log(ele.data('name'));
                }
            }
        ]
    });
  
    cy.on('tap', 'node', function (e) {
        var node = e.target;
        $.each(lastSelectedNodes, function (index, lastSelectedNode) {
        if (!lastSelectedNode.successors().contains(node)) {
            
            lastSelectedNode.successors().remove();
            $(this).remove(lastSelectedNode);
        }
    });

        var nodeType = this.data('nodeType');
        lastSelectedNodes.push(node);
        var childNodeTypes = [];
        var edgeTypes = [];
        if (page === 'dem') {
            if (nodeType === 'DR') {
                childNodeTypes = ["DCI"];
                edgeTypes = ["hasVariable"];
                restoreChildren(node, childNodeTypes, edgeTypes);
            } else if (nodeType === "DCI") {
                childNodeTypes = ["DC"];
                edgeTypes= ["instanceOf"];
                restoreChildren(node, childNodeTypes, edgeTypes);
            }
        } else if (page === 'conc') {
            if (nodeType === 'PB') {
                childNodeTypes = ["RQ"];
                edgeTypes = ["researchQuestion"];
                restoreChildren(node, childNodeTypes, edgeTypes);
            }
            else if (nodeType === 'RQ') {
                childNodeTypes = ["CRC","CI"];
                edgeTypes = ["CRC", "ofInstance"];
                restoreChildren(node, childNodeTypes, edgeTypes);
            }
        }
        var neighborhood = node.neighborhood().add(node);
        var others = cy.elements().not(neighborhood);

        others.addClass('faded');
        neighborhood.removeClass('faded');
        //neighborhood.center();
        cy.layout();
    });
    cy.on('tap', function (e) {
        if (e.cyTarget === cy) {
            cy.elements().removeClass('faded');
        }
    });
    document.getElementById("layoutButton").addEventListener("click", function () {
        var layout = cy.layout({
            name: 'cose-bilkent',
            animate: 'end',
            animationEasing: 'ease-out',
            animationDuration: 2000,
            randomize: true
        });
        cy.center();
        layout.run();
    });

    //Qtip
    cy.elements('node').qtip({
        content: function (event, api) {
            var content = getToolTipContent(this);
            return content === null ? api.tooltip.hide() : content;

        },
        position: {
            my: 'top center',
            at: 'bottom center'
        },
        show: {event: 'mouseover'},
        hide: {event: 'mouseout'},
        style: {
            classes: 'qtip-rounded qtip-shadow qtip-blue',
            tip: {
                width: 16,
                height: 8
            }
        }
    });

    if (page === 'dem') {
        $.each(cy.elements("node[nodeType='DR']"), function (index, element) {
            getChildren(element);
                element.scratch({
                    restData: element.successors()

                });
        });
        $.each(cy.elements("node[nodeType='DR']"), function (index, element) {
            element.scratch().restData.remove();
        });
    }
    else if (page === 'conc') {
        $.each(cy.elements("node[nodeType='PB']"), function (index, element) {
            getChildren(element);
                element.scratch({
                    restData: element.successors()

                });
        });
        $.each(cy.elements("node[nodeType='PB']"), function (index, element) {
            element.scratch().restData.remove();
        });
    }
    $('#cy').show();
}

function getChildren(node) {
    var children = node.successors().targets();
    $.each(children, function (index, element) {
        if (element.data("name") === "EducationLevel") {
            element.scratch({
                restData: element.successors()
            });
        } else {
            element.scratch({
                restData: element.successors()
            });
        }
    });


}

function restoreChildren(node, childNodeTypes, edgeTypes) {
    var nodes = [];
    var edges = [];
    $.each(node.scratch().restData, function (index, element) {
        if ($.inArray(element.data("nodeType"), childNodeTypes) >=0) {
            nodes.push(element);
        } else if ($.inArray(element.data("name"), edgeTypes) >= 0) {
            edges.push(element);
        }
    });
    $.each(nodes, function (index, node) {
        node.restore();
    });
    $.each(edges, function (index, edge) {
        edge.restore();
    });
}

//var fadeNeighborhood = function(node,depth){
//    var neighborhood = node.neighborhood();
//    neighborhood.removeClass('faded');
//    depth = depth -1;
//    if(depth > 0){
//      neighborhood.forEach(function(element){
//          fadeNeighborhood(element,depth-1);
//      });  
//    }
//    neighborhood.add(node).removeClass('faded');
//};


function getNodeType(node) {
    var nodeLabel = node.labels[0];
    if (nodeLabel === "DataRecord") {
        return "DR";
    } else if (nodeLabel === "DemConceptInstance") {
        return "DCI";
    } else if (nodeLabel === "DemVal") {
        return "DV";
    } else if (nodeLabel === "DemConcept") {
        return "DC";
    } else if (nodeLabel === "Publication") {
        return "PB";
    } else if (nodeLabel === "ResearchQuestion") {
        return "RQ";
    } else if (nodeLabel === "ConceptInstance") {
        return "CI";
    } else if (nodeLabel === "CRC") {
        return "CRC";
    } else if (nodeLabel === "Class") {
        return "OC";
    } else if (nodeLabel === "Variable") {
        return "VAR";
    } else if (nodeLabel === "Value") {
        return "VAL";
    } else {
        return "UN";
    }
}

function getNodeNameCy(nodeType, node) {
    if (nodeType === "DR") {
        var res = node.properties.uri.split("/");
        var label = res[res.length - 1].replace(".v1", "");
        return label;
    } else if (nodeType === "DCI") {
        return node.properties.varLabel;
    } else if (nodeType === "DV") {
        return "";
    } else if (nodeType === "DC") {
        return node.properties.name;
    } else if (nodeType === "PB") {
        var res = node.properties.doi.split("/");
        return res[res.length - 1];
    } else if (nodeType === "RQ") {
        return node.properties.researchQuestionNo;
    } else if (nodeType === "CI") {
        return node.properties.name;
    } else if (nodeType === "CRC") { // non-dem_V2.E#CRC
        return node.properties.relation;
    } else if (nodeType === "OC") {
        return node.properties.name;
    } else if (nodeType === "VAR") {
        return node.properties.varLabel;
    } else if (nodeType === "VAL") {
        return node.properties.valLabel;
    } else {
        return "Unknown node";
    }
}

function getNodeShape(nodeType) {
    if (nodeType === "DCI") {
        return 'triangle';
    }else{
        return 'polygon';
    }
}

function getNodeColor(nodeType, nodeId) {
    if (nodeType === "DR") {
        return "#f7b738";
    } else if (nodeType === "DCI") {
        return "#d17fcb";
    } else if (nodeType === "DV") {
        return "#86dce8";
    } else if (nodeType === "DC") {
        if(demConceptCount[nodeId] > 1){
            return "#006400";
        }
        return "#8ced80";
    } else if (nodeType === "PB") {
        return "#d17fcb";
    } else if (nodeType === "RQ") {
        return "#86dce8";
    } else if (nodeType === "CI") {
        return "#d17fcb";
    } else if (nodeType === "CRC") {
        return "#ff80df";
    } else if (nodeType === "OC") {
        return "#5c00e6";
    } else if (nodeType === "VAR") {
        return "#996633";
    } else if (nodeType === "VAL") {
        return "#40bf40";
    } else {
        return "#40E0D0";
    }
}

function getToolTipContent(node){
    if(node.data('nodeType') === 'DCI'){
        return node.data('question');
    }else if(node.data('nodeType') === 'RQ'){
        return node.data('sentence');
    }else if(node.data('nodeType') === 'VAR'){
        return node.data('question');
    }else{
        return null;
    }
}

function getEdgeColor(edge) {
//alert(edge);
    var relType = edge.type;
    if (relType == "ofDemConcInst") {
        return "#7c1655";
    } else {
        return "#0f0009";
    }
}

function getNodeByType(nodeObj) {
    var nodeType = getNodeType(nodeObj);
    var nodeName = getNodeNameCy(nodeType, nodeObj);
    var nodeId = nodeObj.id;
    var node = {data: {id: nodeObj.id
            , name: nodeName
            , fullName: nodeObj.properties.name
            , nodeColor: getNodeColor(nodeType, nodeId)
            , nodeShape: getNodeShape(nodeType)
            , nodeType: nodeType
            

                    //,label : getNodeLabel(nodeObj)
        }};
    if (nodeType === 'DR') {
        node.data['uri'] = nodeObj.properties.uri;
    } else if (nodeType === 'DCI') {
//node.data.push({'question':nodeObj.question});
        node.data['question'] = nodeObj.properties.question;
        node.data['statisticalDataType'] = nodeObj.properties.statisticalDataType;
        node.data['uri'] = nodeObj.properties.uri;
        node.data['label'] = nodeObj.properties.label;
        //node.data['nodeShape'] = 'triangle';
    } else if (nodeType === 'DC') {
        node.data['uri'] = nodeObj.properties.uri;
    } else if (nodeType === 'DV') {
        node.data['uri'] = nodeObj.properties.uri;
        node.data['label'] = nodeObj.properties.label;
        node.data['value'] = nodeObj.properties.value;
    } else if (nodeType === 'PB') {
        node.data['uri'] = nodeObj.properties.uri;
    } else if (nodeType === 'RQ') {
//node.data['id'] = nodeObj.properties.id;
        node.data['questionNo'] = nodeObj.properties.questionNo;
        node.data['sentence'] = nodeObj.properties.sentence;
    } else if (nodeType === 'CI') {
        node.data['uri'] = nodeObj.properties.uri;
        node.data['name'] = nodeObj.properties.name;
    } else if (nodeType === 'CRC') {
//node.data['id'] = nodeObj.properties.id;
        node.data['crcNo'] = nodeObj.properties.crcNo;
        node.data['relation'] = nodeObj.properties.relation;
    } else if (nodeType === 'OC') {
        node.data['uri'] = nodeObj.properties.uri;
        node.data['prefix'] = nodeObj.properties.prefix;
        node.data['name'] = nodeObj.properties.name;
    } else if (nodeType === 'VAR') {
// node.data['id'] = nodeObj.properties.id;
        node.data['label'] = nodeObj.properties.label;
        node.data['varName'] = nodeObj.properties.varName;
        node.data['question'] = nodeObj.properties.question;
        node.data['dataType'] = nodeObj.properties.dataType;
    } else if (nodeType === 'VAL') {
//node.data['id'] = nodeObj.properties.id;
        node.data['label'] = nodeObj.properties.label;
        node.data['value'] = nodeObj.properties.value;
    }/*else if (nodeType === "DCI") {
     node.data['question'] = nodeObj.properties.question;
     node.data['dataType'] = nodeObj.properties.dataType;
     }*/
    return node;
}

function getNodeDesc(json) {
    var html = "";
    var jsonObj = $.parseJSON(json);
    $.each(jsonObj, function (index, element) {
        if (index !== 'nodeColor' && index !== 'nodeType' && index !== 'id') {
            html += "<div class='col-xs-4'>" + index + "</div><div class='col-xs-8'>:" + element + "</div>";
        }
    });
    return html;
}

