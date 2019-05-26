var pythonWebsocketConnection;
var nodeWebSocketConnection;
var trafficData;
var trafficSystem;
var trafficId = 1;
var frameCount = 0;
var i = 0;
var frame = 1;
var initialValue = 1;
var json = [];
var nodeWebSocketUrl = '4ddd75a4.ngrok.io';
var phpUrl = 'd2b6a114.ngrok.io';
var outputFromPython;
var trafficAlert = false;
var trafficAlertLane;
var trafficAlertDensity;


/* Establishing Connection to Node Websoket */
function establishConnectionwithNodeWebsocket() {
    nodeWebSocketConnection = new WebSocket('ws://' + nodeWebSocketUrl + ':80');
    nodeWebSocketConnection.onopen = function () {
        // connection is opened and ready to use
        console.log('Connected to node websocket');
        nodeWebSocketConnection.send('{"id":' + trafficId + ',"type":"traffic"}');
    };

    nodeWebSocketConnection.onerror = function (error) {
        // an error occurred when sending/receiving data
    };
    nodeWebSocketConnection.onmessage = function (message) {
        console.log('Receiving alert from node websockeet');
        try {
            console.log(message.data);
            let nodeData = JSON.parse(message.data);
            if (nodeData.type === 'traffic_alert') {
                if (!trafficAlert) {
                    trafficAlert = true;
                    trafficAlertLane = nodeData.lane;
                    trafficAlertDensity = nodeData.trafficDensity;
                    // pythonWebsocketConnection.send('{"frame":"' + frame + '","type":"incoming_traffic","lane":' + nodeData.lane + ',"traffic_density":' + nodeData.trafficDensity + '}');
                } else {
                    console.log('queue is full');
                }
            }
        } catch (err) {
            console.log('invalid message format');
        }
    };
}

/* Send signal to nearby Traffic through Node websocket to inform there is a traffic heading their way */

function sendSignalToNearbyTraffic(valueOfLane) {
    let valueOfI = Number(JSON.parse(valueOfLane));
    if (json[valueOfI].lane2 === -1) {
        for (let i1 = 1; i1 <= 2; i1++) {
            let laneToAlert = (Number(json[valueOfI].lane1) + i1);
            laneToAlert = laneToAlert > 4 ? laneToAlert - 4 : laneToAlert;
            let xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    // Typical action to be performed when the document is ready:
                    let trafficData = JSON.parse(xhttp.responseText);
                    let trafficSystem = trafficData.message;
                    let laneConnectedIndex;
                    console.log(trafficSystem);
                    for (let i2 = 1; i2 <= 4; i2++) {
                        if (trafficSystem[`nearby_signal_id_${i2}`] == trafficId) {
                            laneConnectedIndex = i2;
                            break;
                        }
                    }
                    nodeWebSocketConnection.send(JSON.stringify({
                        "id": trafficId, "type": "traffic_alert", "nearbyTrafficId": trafficSystem.traffic_signal_id, "lane": laneConnectedIndex, "weight": outputFromPython['lane' + json[valueOfI].lane1 + 'Weight']
                    }));

                    // trafficData = JSON.parse(xhttp.responseText);
                    // trafficSystem = trafficData.message;
                    // console.log(trafficSystem);
                }
            };
            let nearbyTrafficId = trafficSystem['nearby_signal_id_' + laneToAlert];
            if (nearbyTrafficId > 0) {
                xhttp.open("GET", "http://" + phpUrl + "/traffic-service/traffic-signals/" + nearbyTrafficId, true);
                xhttp.send();
            }
        }
    } else if (json[valueOfI].lane2 !== -1) {
        let laneToAlert;
        let xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                // Typical action to be performed when the document is ready:
                let trafficData = JSON.parse(xhttp.responseText);
                let trafficSystem = trafficData.message;
                let laneConnectedIndex;
                console.log(trafficSystem);
                for (let i2 = 1; i2 <= 4; i2++) {
                    if (trafficSystem[`nearby_signal_id_${i2}`] == laneToAlert) {
                        laneConnectedIndex = i2;
                        break;
                    }
                }
                nodeWebSocketConnection.send(JSON.stringify({
                    "id": trafficId, "type": "traffic_alert", "nearbyTrafficId": trafficSystem.traffic_signal_id, "lane": laneConnectedIndex,
                    weight: outputFromPython['lane' + json[valueOfI].lane1 + 'Weight'] + outputFromPython['lane' + json[valueOfI].lane2 + 'Weight']
                }));

                // trafficData = JSON.parse(xhttp.responseText);
                // trafficSystem = trafficData.message;
                // console.log(trafficSystem);
            }
        };
        if (json[valueOfI].lane1Direction === 'straight') {
            laneToAlert = (Number(json[valueOfI].lane1) + 2);
            laneToAlert = laneToAlert > 4 ? laneToAlert - 4 : laneToAlert;
        } else {
            laneToAlert = (Number(json[valueOfI].lane1) + 1);
            laneToAlert = laneToAlert > 4 ? laneToAlert - 4 : laneToAlert;
        }
        let nearbyTrafficId = trafficSystem['nearby_signal_id_' + laneToAlert];
        xhttp.open("GET", "http://" + phpUrl + "/traffic-service/traffic-signals/" + nearbyTrafficId, true);
        xhttp.send();
    }
}
window.onload = function () {
    initialize();
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            // Typical action to be performed when the document is ready:
            trafficData = JSON.parse(xhttp.responseText);
            trafficSystem = trafficData.message;
            console.log(trafficSystem);
        }
    };
    xhttp.open("GET", "http://" + phpUrl + "/traffic-service/traffic-signals/" + trafficId, true);
    xhttp.send();

    /* Establish Connection with python websocket to get input on image data */

    pythonWebsocketConnection = new WebSocket('ws://127.0.0.1:8001');
    var inputFromImageAlgo = false;
    pythonWebsocketConnection.onopen = function () {
        // connection is opened and ready to use
        console.log('Connected to python websocket');
        pythonWebsocketConnection.send('{"id":' + trafficId + ',"type":"traffic"}');
        document.getElementById('process-live-traffic').addEventListener('click', () => {
            frame = (frameCount * 3) + trafficId;
            pythonWebsocketConnection.send('{"frame":"' + frame + '","type":"live"}');
            frameCount++;

        })
    };

    pythonWebsocketConnection.onerror = function (error) {
        // an error occurred when sending/receiving data
    };
    pythonWebsocketConnection.onmessage = function (message) {

        try {
            outputFromPython = JSON.parse(message.data);
            json = outputFromPython.slots;
            console.log(json);
            i = 0;
            inputFromImageAlgo = true;
            for (let j = 1; j <= 4; j++) {
                document.getElementById('lane-' + j + '-image').src = "/Users/naveenkarthick/Documents/hackathon_2019/integrated/contour_images/contour" + frame + '' + j + ".jpg"
            }
            initialValue = 1;
            initialize();
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ',
                message.data);
            return;
        }

        // handle incoming message
    };

    /* Establish Connection with node websocket to get signals on 
    incoming traffic or to notify other traffic signals or to clear route for ambulance */
    establishConnectionwithNodeWebsocket();

    /* Initialize the values of traffic such that all the signals are red at start */
    function initialize() {
        for (let i3 = 1; i3 <= 4; i3++) {
            document.getElementById('lane' + i3 + '-Red').classList.add('lampRed');
            document.getElementById('lane' + i3 + '-Yellow').classList.remove('lampYellow');
            document.getElementById('lane' + i3 + '-Green').classList.remove('lampGreen');
            document.getElementById('lane' + i3 + '-Green-Right').classList.remove('arrow-right');
        }
        setTimeout(() => {
            turnOnSequentialAlgorithm();
        }, 1000);
    }


    function switchLights() {
        if (inputFromImageAlgo) {
            if (i < json.length) {
                let firstLane = json[i].lane1 == 4 ? 2 : (json[i].lane1 == 2 ? 4 : json[i].lane1);
                let secondLane = json[i].lane2 == 4 ? 2 : (json[i].lane2 == 2 ? 4 : json[i].lane2);
                let pastFirstLane;
                let pastSecondlane;
                if ((i - 1) >= 0) {
                    pastFirstLane = json[i - 1].lane1 == 4 ? 2 : (json[i - 1].lane1 == 2 ? 4 : json[i - 1].lane1);
                    pastSecondlane = json[i - 1].lane2 == 4 ? 2 : (json[i - 1].lane2 == 2 ? 4 : json[i - 1].lane2);
                }
                if (json[i].lane1 !== -1) {
                    if (!((i - 1) >= 0 && (pastFirstLane === firstLane || pastSecondlane === firstLane))) {
                        document.getElementById('lane' + firstLane + '-Yellow').classList.add('lampYellow');
                    }
                    setTimeout(() => {
                        document.getElementById('lane' + firstLane + '-Yellow').classList.remove('lampYellow');
                        document.getElementById('lane' + firstLane + '-Red').classList.remove('lampRed');
                        if (json[i].lane1Direction === 'straight') {
                            document.getElementById('lane' + firstLane + '-Green').classList.add('lampGreen');
                        } else {
                            document.getElementById('lane' + firstLane + '-Green-Right').classList.add('arrow-right');
                        }
                    }, 1000);
                }
                if (json[i].lane2 !== -1) {
                    if (!((i - 1) >= 0 && (pastFirstLane === secondLane || pastSecondlane === secondLane))) {
                        document.getElementById('lane' + secondLane + '-Yellow').classList.add('lampYellow');
                    }
                    setTimeout(() => {
                        document.getElementById('lane' + secondLane + '-Yellow').classList.remove('lampYellow');
                        document.getElementById('lane' + secondLane + '-Red').classList.remove('lampRed');
                        if (json[i].lane2Direction === 'straight') {
                            document.getElementById('lane' + secondLane + '-Green').classList.add('lampGreen');
                        } else {
                            document.getElementById('lane' + secondLane + '-Green-Right').classList.add('arrow-right');
                        }
                    }, 1000);

                } else {
                    if (json[i].lane1 !== -1) {
                        if (!((i - 1) >= 0 && (pastFirstLane === firstLane || pastSecondlane === firstLane))) {
                            document.getElementById('lane' + firstLane + '-Yellow').classList.add('lampYellow');
                        }
                        setTimeout(() => {
                            document.getElementById('lane' + firstLane + '-Yellow').classList.remove('lampYellow');
                            document.getElementById('lane' + firstLane + '-Red').classList.remove('lampRed');
                            if (json[i].lane2Direction === 'straight') {
                                document.getElementById('lane' + firstLane + '-Green').classList.add('lampGreen');
                            } else {
                                document.getElementById('lane' + firstLane + '-Green-Right').classList.add('arrow-right');
                            }
                        }, 1000);
                    }
                }
                setTimeout(() => {
                    let futureFirstLane;
                    let futureSecondlane;
                    console.log('weight of traffic density ' + outputFromPython['lane' + json[i].lane1 + 'Weight']);
                    if (outputFromPython['lane' + json[i].lane1 + 'Weight'] > 20) {
                        sendSignalToNearbyTraffic(JSON.stringify(i));
                    } else if (json[i].lane2 !== -1 &&
                        Number(outputFromPython['lane' + json[i].lane1 + 'Weight'] + outputFromPython['lane' + json[i].lane2 + 'Weight']) > 18) {
                        sendSignalToNearbyTraffic(JSON.stringify(i));
                    }
                    if ((i + 1) < json.length) {
                        futureFirstLane = json[i + 1].lane1 == 4 ? 2 : (json[i + 1].lane1 == 2 ? 4 : json[i + 1].lane1);
                        futureSecondlane = json[i + 1].lane2 == 4 ? 2 : (json[i + 1].lane2 == 2 ? 4 : json[i + 1].lane2);
                    }
                    if (json[i].lane1 !== -1) {
                        if (!((i + 1) < json.length && (futureFirstLane === firstLane || futureSecondlane === firstLane))) {
                            if (json[i].lane1Direction === 'straight') {
                                document.getElementById('lane' + firstLane + '-Green').classList.remove('lampGreen');
                            } else {
                                document.getElementById('lane' + firstLane + '-Green-Right').classList.remove('arrow-right');
                            }
                            document.getElementById('lane' + firstLane + '-Yellow').classList.add('lampYellow');
                            setTimeout(() => {
                                document.getElementById('lane' + firstLane + '-Yellow').classList.remove('lampYellow');
                                document.getElementById('lane' + firstLane + '-Red').classList.add('lampRed');
                            }, 1000);
                        }
                    }
                    if (json[i].lane2 !== -1) {
                        if (!((i + 1) < json.length && (futureFirstLane === secondLane || futureSecondlane === secondLane))) {
                            if (json[i].lane2Direction === 'straight') {
                                document.getElementById('lane' + secondLane + '-Green').classList.remove('lampGreen');
                            } else {
                                document.getElementById('lane' + secondLane + '-Green-Right').classList.remove('arrow-right');
                            }
                            document.getElementById('lane' + secondLane + '-Yellow').classList.add('lampYellow');
                            setTimeout(() => {
                                document.getElementById('lane' + secondLane + '-Yellow').classList.remove('lampYellow');
                                document.getElementById('lane' + secondLane + '-Red').classList.add('lampRed');
                            }, 1000);
                        }
                    } else {
                        if (json[i].lane1 !== -1) {
                            if (!((i + 1) < json.length && (futureFirstLane === firstLane || futureSecondlane === firstLane))) {
                                if (json[i].lane2Direction === 'straight') {
                                    document.getElementById('lane' + firstLane + '-Green').classList.remove('lampGreen');
                                } else {
                                    document.getElementById('lane' + firstLane + '-Green-Right').classList.remove('arrow-right');
                                }
                                document.getElementById('lane' + firstLane + '-Yellow').classList.add('lampYellow');
                                setTimeout(() => {
                                    document.getElementById('lane' + firstLane + '-Yellow').classList.remove('lampYellow');
                                    document.getElementById('lane' + firstLane + '-Red').classList.add('lampRed');
                                }, 1000);
                            }
                        }
                    }
                    setTimeout(() => {
                        i++;
                        switchLights();
                    }, 1000);
                }, json[i].durationOpen * 1000);

                for (let k = 1; k <= 4; k++) {
                    let currentLane = k;
                    let oppositeLane = k + 2 > 4 ? k - 2 : k + 2;
                    let adjacentLane = k - 1 <= 0 ? k + 3 : k - 1;
                    let laneLeftToClose = k + 1 > 4 ? k - 3 : k + 1;
                    if(k==3 && i===3) {

                    }
                    if (firstLane !== currentLane && secondLane !== currentLane
                        && firstLane !== oppositeLane && secondLane !== oppositeLane
                        && trafficSystem['signal_lane_' + k] === 1) {
                        if ((firstLane !== adjacentLane && json[i].lane2 !== adjacentLane)) {
                            switchPedestrianSignal(laneLeftToClose, k, json[i].durationOpen);
                        } else if (json[i].lane1Direction === 'right') {
                            if (json[i].lane2Direction === 'right') {
                                if (firstLane !== adjacentLane && secondLane !== adjacentLane) {
                                    switchPedestrianSignal(laneLeftToClose, k, json[i].durationOpen);
                                }
                            } else {
                                if ((firstLane===-1 && secondLane !== adjacentLane) || (firstLane !== -1 && firstLane !==adjacentLane)) {
                                    switchPedestrianSignal(laneLeftToClose, k, json[i].durationOpen);
                                }
                            }
                        } else if (json[i].lane2Direction === 'right') {
                            if (json[i].lane1Direction === 'right') {
                                if (firstLane !== adjacentLane && secondLane !== adjacentLane) {
                                    switchPedestrianSignal(laneLeftToClose, k, json[i].durationOpen);
                                }
                            } else {
                                if ((secondLane===-1 && firstLane !== adjacentLane) || (secondLane !== -1 && secondLane !==adjacentLane)) {
                                    switchPedestrianSignal(laneLeftToClose, k, json[i].durationOpen);
                                }
                            }
                        }
                    }
                }
                function switchPedestrianSignal(_leftLaneToClose, index, _duration) {
                    document.getElementById('lane' + _leftLaneToClose + '-Green-left').classList.remove('lampGreen');
                    document.getElementById('lane-' + index + '-ped').classList.remove('display-none');
                    setTimeout(() => {
                        document.getElementById('lane' + _leftLaneToClose + '-Green-left').classList.add('lampGreen');
                        document.getElementById('lane-' + index + '-ped').classList.add('display-none');
                    }, _duration * 1000);
                }
            } else {
                if (frame < 10) {
                    frame = (frameCount * 3) + trafficId;
                    if (!trafficAlert) {
                        pythonWebsocketConnection.send('{"frame":"' + frame + '","type":"live"}');
                    } else {
                        trafficAlert = false;
                        pythonWebsocketConnection.send('{"frame":"' + frame + '","type":"incoming_traffic", "lane":'
                            + trafficAlertLane + ', "weight":' + trafficAlertDensity + '}');
                    }

                    frameCount++;
                } else {
                    inputFromImageAlgo = false;
                    initialValue = 1;
                    initialize();
                }
            }
        }
    }
    function turnOnSequentialAlgorithm() {
        if (!inputFromImageAlgo) {
            if (initialValue > 4) {
                initialValue = 1;
            }
            document.getElementById('lane' + initialValue + '-Yellow').classList.add('lampYellow');
            setTimeout(() => {
                document.getElementById('lane' + initialValue + '-Red').classList.remove('lampRed');
                document.getElementById('lane' + initialValue + '-Yellow').classList.remove('lampYellow');
                document.getElementById('lane' + initialValue + '-Green').classList.add('lampGreen');
                document.getElementById('lane' + initialValue + '-Green-Right').classList.add('arrow-right');
            }, 1000);
            setTimeout(() => {
                if (!inputFromImageAlgo) {
                    document.getElementById('lane' + initialValue + '-Green').classList.remove('lampGreen');
                    document.getElementById('lane' + initialValue + '-Green-Right').classList.remove('arrow-right');
                    document.getElementById('lane' + initialValue + '-Yellow').classList.add('lampYellow');
                    setTimeout(() => {
                        document.getElementById('lane' + initialValue + '-Yellow').classList.remove('lampYellow');
                        document.getElementById('lane' + initialValue + '-Red').classList.add('lampRed');
                        initialValue++;
                        turnOnSequentialAlgorithm();
                    }, 1000);
                }
            }, 3000);
        } else {
            switchLights();
        }
    }
}
