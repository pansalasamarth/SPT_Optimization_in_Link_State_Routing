class Node 
{
    constructor(val, cost) 
    {
        this.val = val;
        this.cost = cost;
    }
}

class Graph 
{
    constructor(numVertices) 
    {
        this.numVertices = numVertices;
        this.adjList = Array.from({ length: numVertices + 1 }, () => []);
    }

    addEdge(start, end, weight) 
    {
        this.adjList[start].push(new Node(end, weight));
        this.adjList[end].push(new Node(start, weight)); // Undirected graph
    }

    removeConnections(router) 
    {
        if (!router) return;
        this.adjList[router] = [];  // Clear all connections from the failed router
        this.adjList.forEach((neighbors, index) => {
            this.adjList[index] = neighbors.filter(neighbor => neighbor.val !== router);
        });
    }
}

let failedRouter = null;
let nodes = null;
let edges = [];

// Dijkstra's algorithm to find shortest path and previous nodes, avoiding failed router
function dijkstra(graph, start) 
{
    const distances = Array(graph.numVertices + 1).fill(Infinity);
    const previous = Array(graph.numVertices + 1).fill(null);
    distances[start] = 0;
    const priorityQueue = [new Node(start, 0)];

    while (priorityQueue.length > 0) 
    {
        const { val, cost } = priorityQueue.shift();

        graph.adjList[val].forEach(neighbor => {
            if (neighbor.val === failedRouter || val === failedRouter) return; // Skip paths to/from the failed router

            const newDist = cost + neighbor.cost;
            if (newDist < distances[neighbor.val]) 
            {
                distances[neighbor.val] = newDist;
                previous[neighbor.val] = val;
                priorityQueue.push(new Node(neighbor.val, newDist));
            }
        });
    }
    return { distances, previous };
}

// Get next hop for each destination
function getNextHop(previous, start, destination) 
{
    let current = destination;
    let nextHop = current;
    while (previous[current] !== null && previous[current] !== start) 
    {
        nextHop = previous[current];
        current = previous[current];
    }
    return nextHop === destination ? "-" : nextHop;
}

// Construct the path from source to destination
function constructPath(previous, start, destination) 
{
    let path = [];
    for (let at = destination; at !== null; at = previous[at]) 
    {
        path.push(at);
    }
    path.reverse();
    return path[0] === start ? path : null;
}

// Initialize graph and add edges
document.getElementById("initializeGraph").addEventListener("click", function() {
    nodes = parseInt(document.getElementById("nodes").value);
    const edgeCount = parseInt(document.getElementById("edges").value);

    if (!nodes || !edgeCount || nodes <= 0 || edgeCount <= 0) 
    {
        alert("Please enter valid numbers for nodes and edges.");
        return;
    }

    const edgeInputs = document.getElementById("edgeInputs");
    edgeInputs.innerHTML = ""; 

    for (let i = 0; i < edgeCount; i++) 
    {
        const edgeInput = document.createElement("div");
        edgeInput.classList.add("edge-input");

        edgeInput.innerHTML = `
            <label>Edge ${i + 1}:</label>
            <input type="number" placeholder="Start Node" class="start-node">
            <input type="number" placeholder="End Node" class="end-node">
            <input type="number" placeholder="Weight" class="weight">
        `;
        
        edgeInputs.appendChild(edgeInput);
    }
    
    document.getElementById("calculatePaths").classList.remove("hidden");
});

document.getElementById("calculatePaths").addEventListener("click", function() {
    const sourceNode = parseInt(document.getElementById("source").value);
    const destinationNode = parseInt(document.getElementById("destination").value);

    if (!sourceNode || !destinationNode || sourceNode > nodes || destinationNode > nodes) 
    {
        alert("Please enter valid source and destination nodes.");
        return;
    }

    const graph = new Graph(nodes);
    edges = [];

    document.querySelectorAll(".edge-input").forEach(edge => {
        const start = parseInt(edge.querySelector(".start-node").value);
        const end = parseInt(edge.querySelector(".end-node").value);
        const weight = parseInt(edge.querySelector(".weight").value);
        
        if (start > 0 && end > 0 && weight > 0) 
        {
            graph.addEdge(start, end, weight);
            edges.push({ start, end, weight });
        }
    });

    displayRoutingTables(graph, sourceNode, destinationNode);
    displayNetworkGraph(nodes, edges);
});

document.getElementById("failRouter").addEventListener("click", function() {
    failedRouter = parseInt(document.getElementById("failedRouter").value);

    if (isNaN(failedRouter) || failedRouter < 1 || failedRouter > nodes) 
    {
        alert("Please enter a valid router number.");
        return;
    }

    alert(`Router ${failedRouter} is marked as failed.`);
    const graph = new Graph(nodes);
    edges.forEach(edge => graph.addEdge(edge.start, edge.end, edge.weight));
    graph.removeConnections(failedRouter);  // Remove connections from/to the failed router

    displayNetworkGraph(nodes, edges);
    displayRoutingTables(graph, parseInt(document.getElementById("source").value), parseInt(document.getElementById("destination").value));
});

function displayRoutingTables(graph, source, destination) 
{
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "<h3>Link State Packets & Routing Tables:</h3>";
    resultDiv.classList.remove("hidden");

    for (let i = 1; i <= graph.numVertices; i++) 
    {
        if (i === failedRouter) continue; // Skip the failed router's table

        const initialTable = document.createElement("table");
        initialTable.classList.add("routing-table");
        initialTable.innerHTML = `<tr><th colspan="2">Link State Packet for Router ${i}</th></tr>`;
        initialTable.innerHTML += "<tr><th>Neighbor Router</th><th>Cost</th></tr>";

        graph.adjList[i].forEach(neighbor => {
            if (neighbor.val === failedRouter) 
            {
                initialTable.innerHTML += `<tr><td>${neighbor.val}</td><td>Unreachable</td></tr>`;
            } 
            else 
            {
                initialTable.innerHTML += `<tr><td>${neighbor.val}</td><td>${neighbor.cost}</td></tr>`;
            }
        });

        resultDiv.appendChild(initialTable);

        const { distances, previous } = dijkstra(graph, i);
        const finalTable = document.createElement("table");
        finalTable.classList.add("routing-table");

        finalTable.innerHTML = `<tr><th colspan="3">Routing Table for Router ${i}</th></tr>`;
        finalTable.innerHTML += "<tr><th>Destination Router</th><th>Next Hop</th><th>Cost</th></tr>";

        distances.forEach((dist, j) => {
            if (j > 0) 
            {
                const nextHop = getNextHop(previous, i, j);
                const distanceText = (j === failedRouter || dist === Infinity) ? "Unreachable" : dist;
                finalTable.innerHTML += `<tr><td>${j}</td><td>${nextHop}</td><td>${distanceText}</td></tr>`;
            }
        });

        resultDiv.appendChild(finalTable);

        if (i === source) 
        {
            const pathInfo = dijkstra(graph, source);
            const path = constructPath(pathInfo.previous, source, destination);
            displayOptimalPath(pathInfo.distances, path, destination);
        }
    }
}

function displayOptimalPath(distances, path, destination) 
{
    const resultDiv = document.getElementById("result");
    const optimalPathDiv = document.createElement("div");
    optimalPathDiv.classList.add("path-card");

    optimalPathDiv.innerHTML = "<br><h3>Optimal Path:</h3>";

    if (path) 
    {
        const pathStr = path.join(" -> ");
        const totalCost = distances[destination];
        optimalPathDiv.innerHTML += `<p>Optimal Path from Source to Destination: ${pathStr}</p>`;
        optimalPathDiv.innerHTML += `<p>Total Cost: ${totalCost}</p>`;
    } 
    else 
    {
        optimalPathDiv.innerHTML += `<p>No path found from source to destination.</p>`;
    }
    resultDiv.appendChild(optimalPathDiv);
}

function displayNetworkGraph(nodes, edges) 
{
    const nodesArr = Array.from({ length: nodes }, (_, i) => ({
        id: i + 1,
        label: `Router ${i + 1}`
    }));
    const edgesArr = edges.map((edge, index) => ({
        id: index + 1,
        from: edge.start,
        to: edge.end,
        label: `${edge.weight}`,
        font: { align: 'middle' }
    }));

    const container = document.getElementById("network");
    const data = { nodes: new vis.DataSet(nodesArr), edges: new vis.DataSet(edgesArr) };
    const options = {
        edges: { color: { color: '#5c6bc0' }, width: 2 },
        nodes: { color: { background: '#d9e1f2', border: '#5c6bc0' }, font: { color: '#333' } }
    };

    if (failedRouter !== null) 
    {
        data.nodes.update({ id: failedRouter, label: `Router ${failedRouter} ❌`, color: { background: '#ff6b6b', border: '#ff6b6b' } });
        edgesArr.forEach((edge, index) => {
            if (edge.from === failedRouter || edge.to === failedRouter) 
            {
                data.edges.update([{ id: index + 1, color: { color: '#f77' } }]);
            }
        });
    }

    new vis.Network(container, data, options);
}