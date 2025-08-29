// Global Variables
let currentPerson = null;
let map = null;
let globalTreeData = null;
let globalSvg = null;
let globalTree = null;
let globalRoot = null;
let i = 0;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadFilters();
    
    // Add enter key support for search
    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchEmployees();
            }
        });
    }
});

// Load department and country filters from API
async function loadFilters() {
    try {
        const response = await fetch('/api/filters');
        if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
        }
        const filters = await response.json();
        
        const deptSelect = document.getElementById('department-filter');
        const countrySelect = document.getElementById('country-filter');
        
        if (deptSelect && filters.departments) {
            filters.departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept;
                option.textContent = dept;
                deptSelect.appendChild(option);
            });
        }
        
        if (countrySelect && filters.countries) {
            filters.countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                countrySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading filters:', error);
        const searchSection = document.querySelector('.search-section');
        if (searchSection) {
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = '<div style="background: #ff4444; color: white; padding: 12px; border-radius: 8px; margin: 10px 0;">' +
                'Error loading filters. Please check if the Flask server is running.' +
                '</div>';
            searchSection.appendChild(errorDiv);
        }
    }
}

// Search for employees based on input criteria
async function searchEmployees() {
    const searchInput = document.getElementById('search');
    const deptFilter = document.getElementById('department-filter');
    const countryFilter = document.getElementById('country-filter');
    
    if (!searchInput || !deptFilter || !countryFilter) {
        console.error('Search elements not found');
        return;
    }
    
    const query = searchInput.value;
    const department = deptFilter.value;
    const country = countryFilter.value;
    
    if (!query.trim() && !department && !country) {
        alert('Please enter a search term or select a filter');
        return;
    }
    
    const params = new URLSearchParams({
        q: query,
        department: department,
        country: country
    });
    
    try {
        const response = await fetch('/api/search?' + params);
        if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
        }
        const results = await response.json();
        
        if (results.length > 0) {
            selectPerson(results[0].name);
        } else {
            alert('No results found. Please try a different search term.');
        }
    } catch (error) {
        console.error('Error searching:', error);
        alert('Error searching. Please check if the Flask server is running.');
    }
}

// Select a person and load their organizational data
async function selectPerson(personName) {
    currentPerson = personName;
    document.getElementById('visualization-container').classList.remove('hidden');
    
    await loadOrgChart();
    await loadMap();
}

// Load organizational chart data from API
async function loadOrgChart() {
    if (!currentPerson) return;
    
    try {
        const response = await fetch('/api/hierarchy/' + encodeURIComponent(currentPerson));
        const hierarchyData = await response.json();
        
        renderOrgChart(hierarchyData);
    } catch (error) {
        console.error('Error loading hierarchy:', error);
    }
}

// Load map data from API
async function loadMap() {
    if (!currentPerson) return;
    
    try {
        const response = await fetch('/api/map-data/' + encodeURIComponent(currentPerson));
        const mapData = await response.json();
        
        renderMap(mapData);
    } catch (error) {
        console.error('Error loading map data:', error);
    }
}

// Analyze business opportunities from organizational data
function analyzeBusinessOpportunities(data) {
    let stats = {
        direct: 0,
        indirect: 0,
        none: 0,
        total: 0,
        highPriorityContacts: [],
        opportunities: []
    };

    function analyzeNode(node) {
        stats.total++;
        const relationship = node.relationship_with_qt || 'None';
        
        if (relationship.toLowerCase() === 'direct') {
            stats.direct++;
            stats.highPriorityContacts.push({
                name: node.name,
                position: node.position,
                department: node.department,
                location: node.location || 'Unknown'
            });
        } else if (relationship.toLowerCase() === 'indirect') {
            stats.indirect++;
            stats.opportunities.push({
                name: node.name,
                position: node.position,
                department: node.department,
                location: node.location || 'Unknown'
            });
        } else {
            stats.none++;
        }

        if (node.children) {
            node.children.forEach(analyzeNode);
        }
    }

    analyzeNode(data);
    return stats;
}

// Display business opportunity information banner
function displayBusinessOpportunityInfo(stats) {
    const infoContainer = document.getElementById('business-opportunity-info');
    
    let content = '';
    
    if (stats.direct > 0) {
        const plural = stats.direct > 1 ? 's' : '';
        content += '<div class="business-opportunity-banner">' +
            '<span class="opportunity-icon">TARGET</span>' +
            '<strong>SALES OPPORTUNITY ALERT!</strong> ' +
            'You have ' + stats.direct + ' direct connection' + plural + ' in this team - ' +
            'Perfect for sales introductions!' +
            '</div>';
    }
    
    if (stats.indirect > 0 && stats.direct === 0) {
        const plural = stats.indirect > 1 ? 's' : '';
        content += '<div class="business-opportunity-banner">' +
            '<span class="opportunity-icon">BUSINESS</span>' +
            '<strong>BUSINESS DEVELOPMENT OPPORTUNITY!</strong> ' +
            stats.indirect + ' indirect connection' + plural + ' found - ' +
            'Consider warm introductions for sales outreach.' +
            '</div>';
    }
    
    infoContainer.innerHTML = content;
}

// Analyze representative connections for champion identification
function analyzeRepresentatives(data) {
    const representatives = {};
    
    function analyzeNode(node) {
        const representative = node.representative_from_qt;
        if (representative && representative !== 'No' && representative !== '' && representative !== 'N/A') {
            if (!representatives[representative]) {
                representatives[representative] = {
                    name: representative,
                    connections: [],
                    totalConnections: 0,
                    directConnections: 0,
                    indirectConnections: 0
                };
            }
            
            const relationship = node.relationship_with_qt || 'None';
            if (relationship.toLowerCase() === 'direct') {
                representatives[representative].directConnections++;
            } else if (relationship.toLowerCase() === 'indirect') {
                representatives[representative].indirectConnections++;
            }
            
            representatives[representative].connections.push({
                name: node.name,
                position: node.position,
                department: node.department,
                location: node.location || 'Unknown',
                relationship: relationship
            });
            representatives[representative].totalConnections++;
        }

        if (node.children) {
            node.children.forEach(analyzeNode);
        }
    }

    analyzeNode(data);
    
    return Object.values(representatives).sort((a, b) => b.totalConnections - a.totalConnections);
}

// Display connection champions cards
function displayConnectionChampions(representatives) {
    const championsCard = document.getElementById('champions-card');
    const championsGrid = document.getElementById('champions-grid');
    
    if (representatives.length === 0) {
        championsCard.classList.add('hidden');
        return;
    }
    
    championsCard.classList.remove('hidden');
    championsGrid.innerHTML = '';
    
    representatives.forEach(rep => {
        const initials = rep.name.split(' ').map(n => n[0]).join('').toUpperCase();
        
        const championCard = document.createElement('div');
        championCard.className = 'champion-card';
        championCard.onclick = () => highlightChampionConnections(rep);
        
        let badges = '';
        if (rep.directConnections > 0) {
            badges += `<span class="connection-badge badge-direct">${rep.directConnections} Direct</span>`;
        }
        if (rep.indirectConnections > 0) {
            badges += `<span class="connection-badge badge-indirect">${rep.indirectConnections} Indirect</span>`;
        }
        
        championCard.innerHTML = `
            <div class="champion-avatar">${initials}</div>
            <div class="champion-name">${rep.name}</div>
            <div class="champion-connections">${rep.totalConnections} Connections</div>
            <div class="champion-breakdown">${badges}</div>
        `;
        
        championsGrid.appendChild(championCard);
    });
}
// Render the main organizational chart
function renderOrgChart(data) {
    const container = d3.select("#org-chart");
    container.selectAll("*").remove();
    
    const width = container.node().getBoundingClientRect().width;
    const height = 600;
    
    const connectionStats = analyzeBusinessOpportunities(data);
    displayBusinessOpportunityInfo(connectionStats);
    
    const representativeStats = analyzeRepresentatives(data);
    displayConnectionChampions(representativeStats);
    
    // Store global references
    globalTreeData = data;
    
    const svg = container
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "#f8f9fa");
    
    globalSvg = svg;
    
    // Add zoom and pan functionality
    const zoom = d3.zoom()
        .scaleExtent([0.3, 3])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });
    
    svg.call(zoom);
    
    const g = svg.append("g")
        .attr("transform", "translate(60,40)");
    
    // Create tree layout optimized for Teams-style layout
    const tree = d3.tree()
        .size([width - 120, height - 120])
        .separation((a, b) => {
            return (a.parent == b.parent ? 1.5 : 2.2) / a.depth;
        });
    
    globalTree = tree;
    
    // Create hierarchy and initialize collapsed state
    const root = d3.hierarchy(data);
    globalRoot = root;
    
    // Start with only first two levels expanded
    root.descendants().forEach(d => {
        d._children = d.children;
        if (d.depth >= 2) {
            d.children = null;
        }
    });
    
    updateChart(g, root, tree);
}

// Update chart with Teams-style nodes
function updateChart(g, source, tree) {
    // Compute the new tree layout
    tree(globalRoot);
    
    const nodes = globalRoot.descendants();
    const links = globalRoot.descendants().slice(1);
    
    // Update links - Teams style with straight lines
    const link = g.selectAll(".link")
        .data(links, d => d.id || (d.id = ++i));
    
    const linkEnter = link.enter().append("path")
        .attr("class", "link")
        .attr("d", d => {
            const o = {x: source.x0 || source.x, y: source.y0 || source.y};
            return teamsLinkPath(o, o);
        });
    
    const linkUpdate = linkEnter.merge(link);
    
    linkUpdate.transition()
        .duration(500)
        .attr("d", d => teamsLinkPath(d, d.parent));
    
    link.exit().transition()
        .duration(500)
        .attr("d", d => {
            const o = {x: source.x, y: source.y};
            return teamsLinkPath(o, o);
        })
        .remove();
    
    // Update nodes - Teams style cards
    const node = g.selectAll(".node")
        .data(nodes, d => d.id || (d.id = ++i));
    
    const nodeEnter = node.enter().append("g")
        .attr("class", "node teams-node")
        .attr("transform", d => `translate(${source.x0 || source.x},${source.y0 || source.y})`)
        .on("click", click);
    
    // Add Teams-style card background
    nodeEnter.append("rect")
        .attr("class", "node-card")
        .attr("width", 160)
        .attr("height", 80)
        .attr("x", -80)
        .attr("y", -40)
        .attr("rx", 8)
        .attr("ry", 8)
        .style("fill", "#ffffff")
        .style("stroke", d => {
            const relationship = d.data.relationship_with_qt || 'None';
            if (relationship.toLowerCase() === 'direct') return '#00ff88';
            if (relationship.toLowerCase() === 'indirect') return '#ffaa00';
            return '#e0e0e0';
        })
        .style("stroke-width", 2)
        .style("filter", "drop-shadow(0 2px 8px rgba(0,0,0,0.15))");
    
    // Add status indicator dot
    nodeEnter.append("circle")
        .attr("class", "status-dot")
        .attr("cx", 65)
        .attr("cy", -25)
        .attr("r", 6)
        .style("fill", d => {
            const relationship = d.data.relationship_with_qt || 'None';
            if (relationship.toLowerCase() === 'direct') return '#00ff88';
            if (relationship.toLowerCase() === 'indirect') return '#ffaa00';
            return '#cccccc';
        });
    
    // Add profile avatar placeholder
    nodeEnter.append("circle")
        .attr("class", "avatar-circle")
        .attr("cx", 0)
        .attr("cy", -15)
        .attr("r", 20)
        .style("fill", "#f0f0f0")
        .style("stroke", "#d0d0d0")
        .style("stroke-width", 1);
    
    // Add avatar initials
    nodeEnter.append("text")
        .attr("class", "avatar-initials")
        .attr("x", 0)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-family", "'Segoe UI', 'System UI', sans-serif")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", "#666")
        .text(d => {
            const name = d.data.name;
            const parts = name.split(' ');
            if (parts.length >= 2) {
                return (parts[0][0] + parts[1][0]).toUpperCase();
            }
            return name.substring(0, 2).toUpperCase();
        });
    
    // Add name
    nodeEnter.append("text")
        .attr("class", "teams-node-name")
        .attr("x", 0)
        .attr("y", 12)
        .attr("text-anchor", "middle")
        .style("font-family", "'Segoe UI', 'System UI', sans-serif")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .style("fill", "#323130")
        .text(d => {
            const name = d.data.name;
            return name.length > 18 ? name.substring(0, 16) + "..." : name;
        });
    
    // Add title/position
    nodeEnter.append("text")
        .attr("class", "teams-node-title")
        .attr("x", 0)
        .attr("y", 28)
        .attr("text-anchor", "middle")
        .style("font-family", "'Segoe UI', 'System UI', sans-serif")
        .style("font-size", "11px")
        .style("font-weight", "400")
        .style("fill", "#605e5c")
        .text(d => {
            const title = d.data.position;
            return title.length > 20 ? title.substring(0, 18) + "..." : title;
        });
    
    // Add expand/collapse button for nodes with children
    const expandButton = nodeEnter.append("g")
        .attr("class", "expand-button")
        .style("cursor", "pointer")
        .style("display", d => (d.children || d._children) ? "block" : "none");
    
    expandButton.append("circle")
        .attr("cx", 0)
        .attr("cy", 50)
        .attr("r", 12)
        .style("fill", "#ffffff")
        .style("stroke", "#0078d4")
        .style("stroke-width", 2);
    
    expandButton.append("text")
        .attr("x", 0)
        .attr("y", 55)
        .attr("text-anchor", "middle")
        .style("font-family", "'Segoe UI', 'System UI', sans-serif")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", "#0078d4")
        .text(d => d.children ? "−" : "+");
    
    // Add children count
    nodeEnter.append("text")
        .attr("class", "teams-children-count")
        .attr("x", 20)
        .attr("y", 55)
        .attr("text-anchor", "start")
        .style("font-family", "'Segoe UI', 'System UI', sans-serif")
        .style("font-size", "10px")
        .style("font-weight", "400")
        .style("fill", "#0078d4")
        .text(d => {
            const count = d._children ? d._children.length : (d.children ? d.children.length : 0);
            return count > 0 ? `${count}` : '';
        });
    
    // Add tooltips
    nodeEnter.append("title")
        .text(d => {
            const relationship = d.data.relationship_with_qt || 'None';
            let opportunityText = '';
            
            if (relationship.toLowerCase() === 'direct') {
                opportunityText = '\nHIGH PRIORITY: Direct connection';
            } else if (relationship.toLowerCase() === 'indirect') {
                opportunityText = '\nGOOD OPPORTUNITY: Indirect connection';
            } else {
                opportunityText = '\nNO KNOWN CONNECTION';
            }
            
            const representative = d.data.representative_from_qt;
            const repText = representative && representative !== 'No' && representative !== '' ? 
                '\nCONNECT VIA: ' + representative : '';
            
            return `${d.data.name}\n${d.data.position}\n${d.data.location || 'Unknown'}\n${d.data.department}${opportunityText}${repText}`;
        });
    
    const nodeUpdate = nodeEnter.merge(node);
    
    // Transition nodes to their new positions
    nodeUpdate.transition()
        .duration(500)
        .attr("transform", d => `translate(${d.x},${d.y})`);
    
    // Update expand button state
    nodeUpdate.select(".expand-button text")
        .text(d => d.children ? "−" : "+");
    
    nodeUpdate.select(".teams-children-count")
        .text(d => {
            const count = d._children ? d._children.length : (d.children ? d.children.length : 0);
            return count > 0 ? `${count}` : '';
        });
    
    // Remove exiting nodes
    const nodeExit = node.exit().transition()
        .duration(500)
        .attr("transform", d => `translate(${source.x},${source.y})`)
        .remove();
    
    nodeExit.select(".node-card")
        .attr("width", 1e-6)
        .attr("height", 1e-6);
    
    // Store old positions for transition
    nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
    });
    
    // Store references for highlighting
    window.orgChartNodes = nodeUpdate;
    window.orgChartLinks = linkUpdate;
    window.orgChartData = nodes;
}

// Teams-style connection lines
function teamsLinkPath(source, target) {
    const midY = (source.y + target.y) / 2;
    return `M${source.x},${source.y}
            L${source.x},${midY}
            L${target.x},${midY}
            L${target.x},${target.y}`;
}

// Handle node clicks for expand/collapse
function click(event, d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }
    
    const g = globalSvg.select("g");
    updateChart(g, d, globalTree);
}

// Chart control functions
function expandAll() {
    if (!globalRoot) return;
    
    globalRoot.descendants().forEach(d => {
        if (d._children) {
            d.children = d._children;
            d._children = null;
        }
    });
    
    const g = globalSvg.select("g");
    updateChart(g, globalRoot, globalTree);
}

function collapseAll() {
    if (!globalRoot) return;
    
    globalRoot.descendants().forEach(d => {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        }
    });
    
    // Keep root expanded
    if (globalRoot._children) {
        globalRoot.children = globalRoot._children;
        globalRoot._children = null;
    }
    
    const g = globalSvg.select("g");
    updateChart(g, globalRoot, globalTree);
}

function resetChart() {
    if (!globalRoot) return;
    
    // Reset to initial state (first 2 levels expanded)
    globalRoot.descendants().forEach(d => {
        d._children = d.children = null;
    });
    
    const root = d3.hierarchy(globalTreeData);
    globalRoot = root;
    
    root.descendants().forEach(d => {
        d._children = d.children;
        if (d.depth >= 2) {
            d.children = null;
        }
    });
    
    const g = globalSvg.select("g");
    updateChart(g, root, globalTree);
}

// Highlighting and interaction functions
function highlightChampionConnections(champion) {
    // Clear any existing highlights
    clearHighlights();
    
    // Highlight in org chart
    if (window.orgChartNodes && window.orgChartData) {
        window.orgChartNodes.each(function(d) {
            const representative = d.data.representative_from_qt;
            if (representative === champion.name) {
                d3.select(this).classed('highlighted', true);
                
                // Find and highlight the path to this node
                highlightPathToNode(d);
            }
        });
    }
    
    // Highlight in map
    highlightChampionOnMap(champion);
    
    // Auto-clear highlights after 20 seconds
    setTimeout(clearHighlights, 20000);
}

function highlightPathToNode(targetNode) {
    if (!window.orgChartLinks) return;
    
    // Get all ancestors of the target node
    const ancestors = targetNode.ancestors();
    const ancestorNames = ancestors.map(d => d.data.name);
    
    // Highlight all nodes in the path
    window.orgChartNodes.each(function(d) {
        if (ancestorNames.includes(d.data.name)) {
            d3.select(this).classed('connected', true);
        }
    });
    
    // Highlight links in the path
    window.orgChartLinks.each(function(d) {
        if (ancestorNames.includes(d.data.name) && ancestorNames.includes(d.parent.data.name)) {
            d3.select(this).classed('highlighted', true);
        }
    });
}

function highlightChampionOnMap(champion) {
    if (!map) return;
    
    // Find locations where this champion has connections
    const championLocations = [];
    champion.connections.forEach(connection => {
        if (!championLocations.includes(connection.location)) {
            championLocations.push(connection.location);
        }
    });
    
    // Apply highlight/dim effect to markers
    map.eachLayer(function(layer) {
        if (layer instanceof L.CircleMarker) {
            const popup = layer.getPopup();
            const element = layer.getElement();
            
            if (popup && element) {
                const content = popup.getContent();
                let isHighlighted = false;
                
                // Check if this marker should be highlighted
                championLocations.forEach(location => {
                    if (content.includes(location)) {
                        isHighlighted = true;
                    }
                });
                
                if (isHighlighted) {
                    element.classList.add('highlighted');
                    element.classList.remove('dimmed');
                } else {
                    element.classList.add('dimmed');
                    element.classList.remove('highlighted');
                }
            }
        }
    });
}

function clearHighlights() {
    // Clear org chart highlights
    if (window.orgChartNodes) {
        window.orgChartNodes.classed('highlighted connected', false);
    }
    if (window.orgChartLinks) {
        window.orgChartLinks.classed('highlighted', false);
    }
    
    // Clear map highlights - restore all markers to normal state
    if (map) {
        map.eachLayer(function(layer) {
            if (layer instanceof L.CircleMarker) {
                const element = layer.getElement();
                if (element) {
                    element.classList.remove('highlighted', 'dimmed');
                }
            }
        });
    }
}

// Render geographic map with location markers
function renderMap(mapData) {
    if (map) {
        map.remove();
    }
    
    map = L.map('map', {
        zoomControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        dragging: false
    }).setView([20, 0], 2);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'OpenStreetMap contributors'
    }).addTo(map);
    
    const locationCoords = {
        'New York': [40.7128, -74.0060],
        'San Francisco': [37.7749, -122.4194],
        'Chicago': [41.8781, -87.6298],
        'Austin': [30.2672, -97.7431],
        'Seattle': [47.6062, -122.3321],
        'Denver': [39.7392, -104.9903],
        'London': [51.5074, -0.1278],
        'Manchester': [53.4808, -2.2426],
        'Berlin': [52.5200, 13.4050],
        'Munich': [48.1351, 11.5820],
        'Hamburg': [53.5511, 9.9937],
        'Lisbon': [38.7223, -9.1393],
        'Porto': [41.1579, -8.6291],
        'Braga': [41.5518, -8.4229],
        'Mumbai': [19.0760, 72.8777],
        'Bangalore': [12.9716, 77.5946],
        'Delhi': [28.7041, 77.1025],
        'Chennai': [13.0827, 80.2707],
        'Pune': [18.5204, 73.8567],
        'Tokyo': [35.6762, 139.6503],
        'Sydney': [-33.8688, 151.2093],
        'Madrid': [40.4168, -3.7038],
        'Toronto': [43.6532, -79.3832],
        'Vancouver': [49.2827, -123.1207],
        'Amsterdam': [52.3676, 4.9041],
        'São Paulo': [-23.5505, -46.6333],
        'Rio de Janeiro': [-22.9068, -43.1729],
        'Paris': [48.8566, 2.3522],
        'Lyon': [45.7640, 4.8357],
        'Nice': [43.7102, 7.2620],
        'Dubai': [25.2048, 55.2708],
        'Stockholm': [59.3293, 18.0686],
        'Milan': [45.4642, 9.1900],
        'Dublin': [53.3498, -6.2603],
        'Warsaw': [52.2297, 21.0122],
        'Santiago': [-33.4489, -70.6693],
        'Beijing': [39.9042, 116.4074],
        'Shanghai': [31.2304, 121.4737],
        'Singapore': [1.3521, 103.8198],
        'Kyoto': [35.0116, 135.7681],
        'Osaka': [34.6937, 135.5023],
        'Washington DC': [38.9072, -77.0369],
        'Boston': [42.3601, -71.0589],
        'Atlanta': [33.7490, -84.3880],
        'Portland': [45.5152, -122.6784],
        'Miami': [25.7617, -80.1918],
        'Melbourne': [-37.8136, 144.9631],
        'Frankfurt': [50.1109, 8.6821],
        'Cologne': [50.9375, 6.9603],
        'Coimbra': [40.2033, -8.4103],
        'Birmingham': [52.4862, -1.8904],
        'Edinburgh': [55.9533, -3.1883],
        'Hyderabad': [17.3850, 78.4867]
    };
    
    mapData.forEach(location => {
        const coords = locationCoords[location.location] || [0, 0];
        
        if (coords[0] !== 0 || coords[1] !== 0) {
            const connectionCounts = {
                direct: 0,
                indirect: 0,
                none: 0
            };
            
            location.people.forEach(person => {
                const relationship = person.relationship_with_qt || 'None';
                if (relationship.toLowerCase() === 'direct') {
                    connectionCounts.direct++;
                } else if (relationship.toLowerCase() === 'indirect') {
                    connectionCounts.indirect++;
                } else {
                    connectionCounts.none++;
                }
            });
            
            let circleColor, strokeColor;
            if (connectionCounts.direct > 0) {
                circleColor = '#00ff88';
                strokeColor = '#00cc6a';
            } else if (connectionCounts.indirect > 0) {
                circleColor = '#ffaa00';
                strokeColor = '#cc8800';
            } else {
                circleColor = '#666666';
                strokeColor = '#444444';
            }
            
            const circleMarker = L.circleMarker(coords, {
                radius: 20,
                fillColor: circleColor,
                color: strokeColor,
                weight: 3,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);
            
            const popupContent = '<div style="font-family: \'Space Grotesk\', sans-serif; min-width: 250px;">' +
                '<h3 style="margin: 0 0 12px 0; color: #333; font-size: 1.1rem;">Location: ' + location.location + '</h3>' +
                '<p style="margin: 0 0 10px 0; font-weight: 600; color: #555;"><strong>Total Employees:</strong> ' + location.count + '</p>' +
                
                (connectionCounts.direct > 0 ? 
                    '<div style="background: #e8f5e8; padding: 8px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid #00ff88;">' +
                    '<strong style="color: #00aa55;">Direct Connections: ' + connectionCounts.direct + '</strong>' +
                    '<br><small style="color: #007733;">High priority sales opportunities!</small></div>' : '') +
                
                (connectionCounts.indirect > 0 ? 
                    '<div style="background: #fff8e1; padding: 8px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid #ffaa00;">' +
                    '<strong style="color: #cc8800;">Indirect Connections: ' + connectionCounts.indirect + '</strong>' +
                    '<br><small style="color: #996600;">Good networking opportunities!</small></div>' : '') +
                
                (connectionCounts.none > 0 ? 
                    '<div style="background: #f5f5f5; padding: 8px; border-radius: 6px; margin-bottom: 12px; border-left: 4px solid #666666;">' +
                    '<strong style="color: #666;">No Known Connections: ' + connectionCounts.none + '</strong></div>' : '') +
                
                '<div style="max-height: 150px; overflow-y: auto; border-top: 1px solid #eee; padding-top: 8px;">' +
                '<strong style="color: #333; font-size: 0.9rem;">Team Members:</strong>' +
                '<ul style="margin: 6px 0 0 0; padding-left: 16px; font-size: 0.85rem;">' +
                location.people.map(person => {
                    const relationship = person.relationship_with_qt || 'None';
                    let connectionIcon = '';
                    let textColor = '#333';
                    
                    if (relationship.toLowerCase() === 'direct') {
                        connectionIcon = 'Direct';
                        textColor = '#00aa55';
                    } else if (relationship.toLowerCase() === 'indirect') {
                        connectionIcon = 'Indirect';
                        textColor = '#cc8800';
                    } else {
                        connectionIcon = 'None';
                        textColor = '#666';
                    }
                    
                    return '<li style="margin-bottom: 4px; color: ' + textColor + ';">' +
                        connectionIcon + ' - <strong>' + person.name + '</strong><br>' +
                        '<small style="color: #666;">' + person.position + '</small>' +
                        (person.representative_from_qt && person.representative_from_qt !== 'No' && person.representative_from_qt !== '' ? 
                            '<br><small style="color: #4a90e2;">Via: ' + person.representative_from_qt + '</small>' : '') +
                        '</li>';
                }).join('') +
                '</ul></div></div>';
            
            circleMarker.bindPopup(popupContent);
        }
    });
    
    setTimeout(() => {
        map.setView([20, 0], 2);
    }, 100);
}

// Render the main organizational chart
function renderOrgChart(data) {
    const container = d3.select("#org-chart");
    container.selectAll("*").remove();
    
    const width = container.node().getBoundingClientRect().width;
    const height = 600;
    
    const connectionStats = analyzeBusinessOpportunities(data);
    displayBusinessOpportunityInfo(connectionStats);
    
    const representativeStats = analyzeRepresentatives(data);
    displayConnectionChampions(representativeStats);
    
    // Store global references
    globalTreeData = data;
    
    const svg = container
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "#f8f9fa");
    
    globalSvg = svg;
    
    // Add zoom and pan functionality
    const zoom = d3.zoom()
        .scaleExtent([0.3, 3])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });
    
    svg.call(zoom);
    
    const g = svg.append("g")
        .attr("transform", "translate(60,40)");
    
    // Create tree layout optimized for Teams-style layout
    const tree = d3.tree()
        .size([width - 120, height - 120])
        .separation((a, b) => {
            return (a.parent == b.parent ? 1.5 : 2.2) / a.depth;
        });
    
    globalTree = tree;
    
    // Create hierarchy and initialize collapsed state
    const root = d3.hierarchy(data);
    globalRoot = root;
    
    // Start with only first two levels expanded
    root.descendants().forEach(d => {
        d._children = d.children;
        if (d.depth >= 2) {
            d.children = null;
        }
    });
    
    updateChart(g, root, tree);
}

// Update chart with Teams-style nodes
function updateChart(g, source, tree) {
    // Compute the new tree layout
    tree(globalRoot);
    
    const nodes = globalRoot.descendants();
    const links = globalRoot.descendants().slice(1);
    
    // Update links - Teams style with straight lines
    const link = g.selectAll(".link")
        .data(links, d => d.id || (d.id = ++i));
    
    const linkEnter = link.enter().append("path")
        .attr("class", "link")
        .attr("d", d => {
            const o = {x: source.x0 || source.x, y: source.y0 || source.y};
            return teamsLinkPath(o, o);
        });
    
    const linkUpdate = linkEnter.merge(link);
    
    linkUpdate.transition()
        .duration(500)
        .attr("d", d => teamsLinkPath(d, d.parent));
    
    link.exit().transition()
        .duration(500)
        .attr("d", d => {
            const o = {x: source.x, y: source.y};
            return teamsLinkPath(o, o);
        })
        .remove();
    
    // Update nodes - Teams style cards
    const node = g.selectAll(".node")
        .data(nodes, d => d.id || (d.id = ++i));
    
    const nodeEnter = node.enter().append("g")
        .attr("class", "node teams-node")
        .attr("transform", d => `translate(${source.x0 || source.x},${source.y0 || source.y})`)
        .on("click", click);
    
    // Add Teams-style card background
    nodeEnter.append("rect")
        .attr("class", "node-card")
        .attr("width", 160)
        .attr("height", 80)
        .attr("x", -80)
        .attr("y", -40)
        .attr("rx", 8)
        .attr("ry", 8)
        .style("fill", "#ffffff")
        .style("stroke", d => {
            const relationship = d.data.relationship_with_qt || 'None';
            if (relationship.toLowerCase() === 'direct') return '#00ff88';
            if (relationship.toLowerCase() === 'indirect') return '#ffaa00';
            return '#e0e0e0';
        })
        .style("stroke-width", 2)
        .style("filter", "drop-shadow(0 2px 8px rgba(0,0,0,0.15))");
    
    // Add status indicator dot
    nodeEnter.append("circle")
        .attr("class", "status-dot")
        .attr("cx", 65)
        .attr("cy", -25)
        .attr("r", 6)
        .style("fill", d => {
            const relationship = d.data.relationship_with_qt || 'None';
            if (relationship.toLowerCase() === 'direct') return '#00ff88';
            if (relationship.toLowerCase() === 'indirect') return '#ffaa00';
            return '#cccccc';
        });
    
    // Add profile avatar placeholder
    nodeEnter.append("circle")
        .attr("class", "avatar-circle")
        .attr("cx", 0)
        .attr("cy", -15)
        .attr("r", 20)
        .style("fill", "#f0f0f0")
        .style("stroke", "#d0d0d0")
        .style("stroke-width", 1);
    
    // Add avatar initials
    nodeEnter.append("text")
        .attr("class", "avatar-initials")
        .attr("x", 0)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-family", "'Segoe UI', 'System UI', sans-serif")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", "#666")
        .text(d => {
            const name = d.data.name;
            const parts = name.split(' ');
            if (parts.length >= 2) {
                return (parts[0][0] + parts[1][0]).toUpperCase();
            }
            return name.substring(0, 2).toUpperCase();
        });
    
    // Add name
    nodeEnter.append("text")
        .attr("class", "teams-node-name")
        .attr("x", 0)
        .attr("y", 12)
        .attr("text-anchor", "middle")
        .style("font-family", "'Segoe UI', 'System UI', sans-serif")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .style("fill", "#323130")
        .text(d => {
            const name = d.data.name;
            return name.length > 18 ? name.substring(0, 16) + "..." : name;
        });
    
    // Add title/position
    nodeEnter.append("text")
        .attr("class", "teams-node-title")
        .attr("x", 0)
        .attr("y", 28)
        .attr("text-anchor", "middle")
        .style("font-family", "'Segoe UI', 'System UI', sans-serif")
        .style("font-size", "11px")
        .style("font-weight", "400")
        .style("fill", "#605e5c")
        .text(d => {
            const title = d.data.position;
            return title.length > 20 ? title.substring(0, 18) + "..." : title;
        });
    
    // Add expand/collapse button for nodes with children
    const expandButton = nodeEnter.append("g")
        .attr("class", "expand-button")
        .style("cursor", "pointer")
        .style("display", d => (d.children || d._children) ? "block" : "none");
    
    expandButton.append("circle")
        .attr("cx", 0)
        .attr("cy", 50)
        .attr("r", 12)
        .style("fill", "#ffffff")
        .style("stroke", "#0078d4")
        .style("stroke-width", 2);
    
    expandButton.append("text")
        .attr("x", 0)
        .attr("y", 55)
        .attr("text-anchor", "middle")
        .style("font-family", "'Segoe UI', 'System UI', sans-serif")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", "#0078d4")
        .text(d => d.children ? "−" : "+");
    
    // Add children count
    nodeEnter.append("text")
        .attr("class", "teams-children-count")
        .attr("x", 20)
        .attr("y", 55)
        .attr("text-anchor", "start")
        .style("font-family", "'Segoe UI', 'System UI', sans-serif")
        .style("font-size", "10px")
        .style("font-weight", "400")
        .style("fill", "#0078d4")
        .text(d => {
            const count = d._children ? d._children.length : (d.children ? d.children.length : 0);
            return count > 0 ? `${count}` : '';
        });
    
    // Add tooltips
    nodeEnter.append("title")
        .text(d => {
            const relationship = d.data.relationship_with_qt || 'None';
            let opportunityText = '';
            
            if (relationship.toLowerCase() === 'direct') {
                opportunityText = '\nHIGH PRIORITY: Direct connection';
            } else if (relationship.toLowerCase() === 'indirect') {
                opportunityText = '\nGOOD OPPORTUNITY: Indirect connection';
            } else {
                opportunityText = '\nNO KNOWN CONNECTION';
            }
            
            const representative = d.data.representative_from_qt;
            const repText = representative && representative !== 'No' && representative !== '' ? 
                '\nCONNECT VIA: ' + representative : '';
            
            return `${d.data.name}\n${d.data.position}\n${d.data.location || 'Unknown'}\n${d.data.department}${opportunityText}${repText}`;
        });
    
    const nodeUpdate = nodeEnter.merge(node);
    
    // Transition nodes to their new positions
    nodeUpdate.transition()
        .duration(500)
        .attr("transform", d => `translate(${d.x},${d.y})`);
    
    // Update expand button state
    nodeUpdate.select(".expand-button text")
        .text(d => d.children ? "−" : "+");
    
    nodeUpdate.select(".teams-children-count")
        .text(d => {
            const count = d._children ? d._children.length : (d.children ? d.children.length : 0);
            return count > 0 ? `${count}` : '';
        });
    
    // Remove exiting nodes
    const nodeExit = node.exit().transition()
        .duration(500)
        .attr("transform", d => `translate(${source.x},${source.y})`)
        .remove();
    
    nodeExit.select(".node-card")
        .attr("width", 1e-6)
        .attr("height", 1e-6);
    
    // Store old positions for transition
    nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
    });
    
    // Store references for highlighting
    window.orgChartNodes = nodeUpdate;
    window.orgChartLinks = linkUpdate;
    window.orgChartData = nodes;
}

// Teams-style connection lines
function teamsLinkPath(source, target) {
    const midY = (source.y + target.y) / 2;
    return `M${source.x},${source.y}
            L${source.x},${midY}
            L${target.x},${midY}
            L${target.x},${target.y}`;
}

// Handle node clicks for expand/collapse
function click(event, d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }
    
    const g = globalSvg.select("g");
    updateChart(g, d, globalTree);
}

// Chart control functions
function expandAll() {
    if (!globalRoot) return;
    
    globalRoot.descendants().forEach(d => {
        if (d._children) {
            d.children = d._children;
            d._children = null;
        }
    });
    
    const g = globalSvg.select("g");
    updateChart(g, globalRoot, globalTree);
}

function collapseAll() {
    if (!globalRoot) return;
    
    globalRoot.descendants().forEach(d => {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        }
    });
    
    // Keep root expanded
    if (globalRoot._children) {
        globalRoot.children = globalRoot._children;
        globalRoot._children = null;
    }
    
    const g = globalSvg.select("g");
    updateChart(g, globalRoot, globalTree);
}

function resetChart() {
    if (!globalRoot) return;
    
    // Reset to initial state (first 2 levels expanded)
    globalRoot.descendants().forEach(d => {
        d._children = d.children = null;
    });
    
    const root = d3.hierarchy(globalTreeData);
    globalRoot = root;
    
    root.descendants().forEach(d => {
        d._children = d.children;
        if (d.depth >= 2) {
            d.children = null;
        }
    });
    
    const g = globalSvg.select("g");
    updateChart(g, root, globalTree);
}

// Highlighting and interaction functions
function highlightChampionConnections(champion) {
    // Clear any existing highlights
    clearHighlights();
    
    // Highlight in org chart
    if (window.orgChartNodes && window.orgChartData) {
        window.orgChartNodes.each(function(d) {
            const representative = d.data.representative_from_qt;
            if (representative === champion.name) {
                d3.select(this).classed('highlighted', true);
                
                // Find and highlight the path to this node
                highlightPathToNode(d);
            }
        });
    }
    
    // Highlight in map
    highlightChampionOnMap(champion);
    
    // Auto-clear highlights after 20 seconds
    setTimeout(clearHighlights, 20000);
}

function highlightPathToNode(targetNode) {
    if (!window.orgChartLinks) return;
    
    // Get all ancestors of the target node
    const ancestors = targetNode.ancestors();
    const ancestorNames = ancestors.map(d => d.data.name);
    
    // Highlight all nodes in the path
    window.orgChartNodes.each(function(d) {
        if (ancestorNames.includes(d.data.name)) {
            d3.select(this).classed('connected', true);
        }
    });
    
    // Highlight links in the path
    window.orgChartLinks.each(function(d) {
        if (ancestorNames.includes(d.data.name) && ancestorNames.includes(d.parent.data.name)) {
            d3.select(this).classed('highlighted', true);
        }
    });
}

function highlightChampionOnMap(champion) {
    if (!map) return;
    
    // Find locations where this champion has connections
    const championLocations = [];
    champion.connections.forEach(connection => {
        if (!championLocations.includes(connection.location)) {
            championLocations.push(connection.location);
        }
    });
    
    // Apply highlight/dim effect to markers
    map.eachLayer(function(layer) {
        if (layer instanceof L.CircleMarker) {
            const popup = layer.getPopup();
            const element = layer.getElement();
            
            if (popup && element) {
                const content = popup.getContent();
                let isHighlighted = false;
                
                // Check if this marker should be highlighted
                championLocations.forEach(location => {
                    if (content.includes(location)) {
                        isHighlighted = true;
                    }
                });
                
                if (isHighlighted) {
                    element.classList.add('highlighted');
                    element.classList.remove('dimmed');
                } else {
                    element.classList.add('dimmed');
                    element.classList.remove('highlighted');
                }
            }
        }
    });
}

function clearHighlights() {
    // Clear org chart highlights
    if (window.orgChartNodes) {
        window.orgChartNodes.classed('highlighted connected', false);
    }
    if (window.orgChartLinks) {
        window.orgChartLinks.classed('highlighted', false);
    }
    
    // Clear map highlights - restore all markers to normal state
    if (map) {
        map.eachLayer(function(layer) {
            if (layer instanceof L.CircleMarker) {
                const element = layer.getElement();
                if (element) {
                    element.classList.remove('highlighted', 'dimmed');
                }
            }
        });
    }
}

// Render geographic map with location markers
function renderMap(mapData) {
    if (map) {
        map.remove();
    }
    
    map = L.map('map', {
        zoomControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        dragging: false
    }).setView([20, 0], 2);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'OpenStreetMap contributors'
    }).addTo(map);
    
    const locationCoords = {
        'New York': [40.7128, -74.0060],
        'San Francisco': [37.7749, -122.4194],
        'Chicago': [41.8781, -87.6298],
        'Austin': [30.2672, -97.7431],
        'Seattle': [47.6062, -122.3321],
        'Denver': [39.7392, -104.9903],
        'London': [51.5074, -0.1278],
        'Manchester': [53.4808, -2.2426],
        'Berlin': [52.5200, 13.4050],
        'Munich': [48.1351, 11.5820],
        'Hamburg': [53.5511, 9.9937],
        'Lisbon': [38.7223, -9.1393],
        'Porto': [41.1579, -8.6291],
        'Braga': [41.5518, -8.4229],
        'Mumbai': [19.0760, 72.8777],
        'Bangalore': [12.9716, 77.5946],
        'Delhi': [28.7041, 77.1025],
        'Chennai': [13.0827, 80.2707],
        'Pune': [18.5204, 73.8567],
        'Tokyo': [35.6762, 139.6503],
        'Sydney': [-33.8688, 151.2093],
        'Madrid': [40.4168, -3.7038],
        'Toronto': [43.6532, -79.3832],
        'Vancouver': [49.2827, -123.1207],
        'Amsterdam': [52.3676, 4.9041],
        'São Paulo': [-23.5505, -46.6333],
        'Rio de Janeiro': [-22.9068, -43.1729],
        'Paris': [48.8566, 2.3522],
        'Lyon': [45.7640, 4.8357],
        'Nice': [43.7102, 7.2620],
        'Dubai': [25.2048, 55.2708],
        'Stockholm': [59.3293, 18.0686],
        'Milan': [45.4642, 9.1900],
        'Dublin': [53.3498, -6.2603],
        'Warsaw': [52.2297, 21.0122],
        'Santiago': [-33.4489, -70.6693],
        'Beijing': [39.9042, 116.4074],
        'Shanghai': [31.2304, 121.4737],
        'Singapore': [1.3521, 103.8198],
        'Kyoto': [35.0116, 135.7681],
        'Osaka': [34.6937, 135.5023],
        'Washington DC': [38.9072, -77.0369],
        'Boston': [42.3601, -71.0589],
        'Atlanta': [33.7490, -84.3880],
        'Portland': [45.5152, -122.6784],
        'Miami': [25.7617, -80.1918],
        'Melbourne': [-37.8136, 144.9631],
        'Frankfurt': [50.1109, 8.6821],
        'Cologne': [50.9375, 6.9603],
        'Coimbra': [40.2033, -8.4103],
        'Birmingham': [52.4862, -1.8904],
        'Edinburgh': [55.9533, -3.1883],
        'Hyderabad': [17.3850, 78.4867]
    };
    
    mapData.forEach(location => {
        const coords = locationCoords[location.location] || [0, 0];
        
        if (coords[0] !== 0 || coords[1] !== 0) {
            const connectionCounts = {
                direct: 0,
                indirect: 0,
                none: 0
            };
            
            location.people.forEach(person => {
                const relationship = person.relationship_with_qt || 'None';
                if (relationship.toLowerCase() === 'direct') {
                    connectionCounts.direct++;
                } else if (relationship.toLowerCase() === 'indirect') {
                    connectionCounts.indirect++;
                } else {
                    connectionCounts.none++;
                }
            });
            
            let circleColor, strokeColor;
            if (connectionCounts.direct > 0) {
                circleColor = '#00ff88';
                strokeColor = '#00cc6a';
            } else if (connectionCounts.indirect > 0) {
                circleColor = '#ffaa00';
                strokeColor = '#cc8800';
            } else {
                circleColor = '#666666';
                strokeColor = '#444444';
            }
            
            const circleMarker = L.circleMarker(coords, {
                radius: 20,
                fillColor: circleColor,
                color: strokeColor,
                weight: 3,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);
            
            const popupContent = '<div style="font-family: \'Space Grotesk\', sans-serif; min-width: 250px;">' +
                '<h3 style="margin: 0 0 12px 0; color: #333; font-size: 1.1rem;">Location: ' + location.location + '</h3>' +
                '<p style="margin: 0 0 10px 0; font-weight: 600; color: #555;"><strong>Total Employees:</strong> ' + location.count + '</p>' +
                
                (connectionCounts.direct > 0 ? 
                    '<div style="background: #e8f5e8; padding: 8px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid #00ff88;">' +
                    '<strong style="color: #00aa55;">Direct Connections: ' + connectionCounts.direct + '</strong>' +
                    '<br><small style="color: #007733;">High priority sales opportunities!</small></div>' : '') +
                
                (connectionCounts.indirect > 0 ? 
                    '<div style="background: #fff8e1; padding: 8px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid #ffaa00;">' +
                    '<strong style="color: #cc8800;">Indirect Connections: ' + connectionCounts.indirect + '</strong>' +
                    '<br><small style="color: #996600;">Good networking opportunities!</small></div>' : '') +
                
                (connectionCounts.none > 0 ? 
                    '<div style="background: #f5f5f5; padding: 8px; border-radius: 6px; margin-bottom: 12px; border-left: 4px solid #666666;">' +
                    '<strong style="color: #666;">No Known Connections: ' + connectionCounts.none + '</strong></div>' : '') +
                
                '<div style="max-height: 150px; overflow-y: auto; border-top: 1px solid #eee; padding-top: 8px;">' +
                '<strong style="color: #333; font-size: 0.9rem;">Team Members:</strong>' +
                '<ul style="margin: 6px 0 0 0; padding-left: 16px; font-size: 0.85rem;">' +
                location.people.map(person => {
                    const relationship = person.relationship_with_qt || 'None';
                    let connectionIcon = '';
                    let textColor = '#333';
                    
                    if (relationship.toLowerCase() === 'direct') {
                        connectionIcon = 'Direct';
                        textColor = '#00aa55';
                    } else if (relationship.toLowerCase() === 'indirect') {
                        connectionIcon = 'Indirect';
                        textColor = '#cc8800';
                    } else {
                        connectionIcon = 'None';
                        textColor = '#666';
                    }
                    
                    return '<li style="margin-bottom: 4px; color: ' + textColor + ';">' +
                        connectionIcon + ' - <strong>' + person.name + '</strong><br>' +
                        '<small style="color: #666;">' + person.position + '</small>' +
                        (person.representative_from_qt && person.representative_from_qt !== 'No' && person.representative_from_qt !== '' ? 
                            '<br><small style="color: #4a90e2;">Via: ' + person.representative_from_qt + '</small>' : '') +
                        '</li>';
                }).join('') +
                '</ul></div></div>';
            
            circleMarker.bindPopup(popupContent);
        }
    });
    
    setTimeout(() => {
        map.setView([20, 0], 2);
    }, 100);
}