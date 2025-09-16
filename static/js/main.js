// Global Variables
let currentPerson = null;
let map = null;
let globalTreeData = null;
let globalSvg = null;
let globalTree = null;
let globalRoot = null;
let globalG = null;
let i = 0;
let allEmployees = []; // Store all employees for autocomplete

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - initializing app with autocomplete');
    loadFilters();
    setupAutocomplete();
    
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

// Load all employees for autocomplete functionality
async function loadAllEmployees() {
    try {
        console.log('Loading all employees for autocomplete...');
        const response = await fetch('/api/search?q='); // Empty query to get all employees
        if (!response.ok) {
            console.error('HTTP error! status:', response.status);
            throw new Error('HTTP error! status: ' + response.status);
        }
        const employees = await response.json();
        allEmployees = employees;
        console.log('Loaded', employees.length, 'employees for autocomplete');
    } catch (error) {
        console.error('Error loading employees:', error);
        allEmployees = []; // Fallback to empty array
    }
}

// Setup autocomplete functionality
function setupAutocomplete() {
    loadAllEmployees();
    
    const searchInput = document.getElementById('search');
    if (!searchInput) {
        console.warn('Search input not found');
        return;
    }
    
    // Create autocomplete dropdown container
    let autocompleteContainer = document.getElementById('autocomplete-dropdown');
    if (!autocompleteContainer) {
        autocompleteContainer = document.createElement('div');
        autocompleteContainer.id = 'autocomplete-dropdown';
        autocompleteContainer.className = 'autocomplete-dropdown hidden';
        
        // Insert after search input's parent
        searchInput.parentNode.appendChild(autocompleteContainer);
    }
    
    // Add input event listener for real-time search
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.trim().toLowerCase();
        
        if (query.length < 2) {
            hideAutocomplete();
            return;
        }
        
        // Filter employees based on name, position, or department
        const matches = allEmployees.filter(emp => {
            return emp.name.toLowerCase().includes(query) ||
                   emp.position.toLowerCase().includes(query) ||
                   emp.department.toLowerCase().includes(query);
        }).slice(0, 8); // Limit to 8 results
        
        showAutocomplete(matches);
    });
    
    // Hide autocomplete when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !autocompleteContainer.contains(e.target)) {
            hideAutocomplete();
        }
    });
    
    // Handle focus events
    searchInput.addEventListener('focus', function(e) {
        const query = e.target.value.trim().toLowerCase();
        if (query.length >= 2) {
            const matches = allEmployees.filter(emp => {
                return emp.name.toLowerCase().includes(query) ||
                       emp.position.toLowerCase().includes(query) ||
                       emp.department.toLowerCase().includes(query);
            }).slice(0, 8);
            showAutocomplete(matches);
        }
    });
}

// Show autocomplete dropdown with employee suggestions
function showAutocomplete(matches) {
    const dropdown = document.getElementById('autocomplete-dropdown');
    if (!dropdown) {
        console.warn('Autocomplete dropdown not found');
        return;
    }
    
    if (matches.length === 0) {
        hideAutocomplete();
        return;
    }
    
    dropdown.innerHTML = '';
    dropdown.classList.remove('hidden');
    
    matches.forEach(employee => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        
        // Create colored avatar circle
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];
        const colorIndex = employee.name.length % colors.length;
        const avatarColor = colors[colorIndex];
        const initials = employee.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        
        item.innerHTML = `
            <div class="autocomplete-avatar" style="background: ${avatarColor}">
                ${initials}
            </div>
            <div class="autocomplete-info">
                <div class="autocomplete-name">${employee.name}</div>
                <div class="autocomplete-details">${employee.position}</div>
                <div class="autocomplete-department">${employee.department} • ${employee.country}</div>
            </div>
            <div class="autocomplete-connection">
                <div class="connection-dot ${getConnectionClass(employee.relationship_with_qt)}"></div>
            </div>
        `;
        
        item.addEventListener('click', function() {
            document.getElementById('search').value = employee.name;
            hideAutocomplete();
            selectPerson(employee.name);
        });
        
        dropdown.appendChild(item);
    });
}

// Hide autocomplete dropdown
function hideAutocomplete() {
    const dropdown = document.getElementById('autocomplete-dropdown');
    if (dropdown) {
        dropdown.classList.add('hidden');
    }
}

// Get CSS class for connection status
function getConnectionClass(relationship) {
    if (!relationship) return 'connection-none';
    switch(relationship.toLowerCase()) {
        case 'direct': return 'connection-direct';
        case 'indirect': return 'connection-indirect';
        default: return 'connection-none';
    }
}

// Load filters from API - SIMPLIFIED VERSION (name search only)
async function loadFilters() {
    try {
        console.log('App initialized - name search with autocomplete');
        // No need to load department/country filters anymore
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

// Search for employees - SIMPLIFIED VERSION (name only)
async function searchEmployees() {
    console.log('Search employees called');
    
    const searchInput = document.getElementById('search');
    
    if (!searchInput) {
        console.error('Search input not found');
        alert('Search input not found on page');
        return;
    }
    
    const query = searchInput.value.trim();
    
    console.log('Search params:', { query });
    
    if (!query) {
        alert('Please enter a name to search');
        return;
    }
    
    const params = new URLSearchParams({
        q: query
    });
    
    try {
        console.log('Making search request to:', '/api/search?' + params.toString());
        const response = await fetch('/api/search?' + params);
        
        if (!response.ok) {
            console.error('Search API response not OK:', response.status, response.statusText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const results = await response.json();
        console.log('Search results:', results);
        
        if (results.length > 0) {
            // Find exact match first, then fallback to first result
            let selectedPerson = results.find(person => 
                person.name.toLowerCase() === query.toLowerCase()
            ) || results[0];
            
            console.log('Selected person:', selectedPerson);
            selectPerson(selectedPerson.name);
        } else {
            alert('No results found. Please try a different name.');
        }
    } catch (error) {
        console.error('Error searching:', error);
        alert('Error searching: ' + error.message + '. Please check if the Flask server is running on the correct port.');
    }
}

// Select a person and load their organizational data
async function selectPerson(personName) {
    console.log('Selecting person:', personName);
    currentPerson = personName;
    
    const visualizationContainer = document.getElementById('visualization-container');
    if (visualizationContainer) {
        visualizationContainer.classList.remove('hidden');
    } else {
        console.error('Visualization container not found');
    }
    
    hideAutocomplete(); // Hide dropdown when person is selected
    
    try {
        await loadOrgChart();
        await loadMap();
    } catch (error) {
        console.error('Error loading person data:', error);
    }
}

// Load organizational chart data from API
async function loadOrgChart() {
    if (!currentPerson) {
        console.error('No current person selected');
        return;
    }
    
    console.log('Loading org chart for:', currentPerson);
    
    try {
        const encodedName = encodeURIComponent(currentPerson);
        const url = `/api/hierarchy/${encodedName}`;
        console.log('Making hierarchy request to:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            console.error('Hierarchy API response not OK:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error response body:', errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        const hierarchyData = await response.json();
        console.log('Hierarchy data received:', hierarchyData);
        
        if (!hierarchyData) {
            throw new Error('No hierarchy data received');
        }
        
        renderOrgChart(hierarchyData);
    } catch (error) {
        console.error('Error loading hierarchy:', error);
        alert('Error loading organizational chart: ' + error.message);
    }
}

// Load map data from API
async function loadMap() {
    if (!currentPerson) {
        console.error('No current person selected');
        return;
    }
    
    try {
        const encodedName = encodeURIComponent(currentPerson);
        const url = `/api/map-data/${encodedName}`;
        console.log('Making map data request to:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            console.error('Map API response not OK:', response.status, response.statusText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const mapData = await response.json();
        console.log('Map data received:', mapData);
        
        renderMap(mapData);
    } catch (error) {
        console.error('Error loading map data:', error);
        // Don't show alert for map errors as it's secondary functionality
        console.warn('Map functionality disabled due to error');
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
        if (!node) return;
        
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

        if (node.children && Array.isArray(node.children)) {
            node.children.forEach(analyzeNode);
        }
    }

    analyzeNode(data);
    return stats;
}

// Display business opportunity information banner
function displayBusinessOpportunityInfo(stats) {
    const infoContainer = document.getElementById('business-opportunity-info');
    if (!infoContainer) {
        console.warn('Business opportunity info container not found');
        return;
    }
    
    let content = '';
    
    if (stats.direct > 0) {
        const plural = stats.direct > 1 ? 's' : '';
        content += '<div class="business-opportunity-banner">' +
            '<span class="opportunity-icon">🎯</span>' +
            '<strong>SALES OPPORTUNITY ALERT!</strong> ' +
            'You have ' + stats.direct + ' direct connection' + plural + ' in this team - ' +
            'Perfect for sales introductions!' +
            '</div>';
    }
    
    if (stats.indirect > 0 && stats.direct === 0) {
        const plural = stats.indirect > 1 ? 's' : '';
        content += '<div class="business-opportunity-banner">' +
            '<span class="opportunity-icon">💼</span>' +
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
        if (!node) return;
        
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

        if (node.children && Array.isArray(node.children)) {
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
    
    if (!championsCard || !championsGrid) {
        console.warn('Champions card elements not found');
        return;
    }
    
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
    console.log('Rendering organizational chart with data:', data);
    
    const container = d3.select("#org-chart");
    if (container.empty()) {
        console.error('Org chart container not found');
        alert('Chart container not found on page');
        return;
    }
    
    container.selectAll("*").remove();
    
    const containerNode = container.node();
    if (!containerNode) {
        console.error('Org chart container node not found');
        return;
    }
    
    const width = containerNode.getBoundingClientRect().width || 800;
    const height = 800;
    
    console.log('Chart container dimensions:', width, 'x', height);
    
    // Analyze and display stats for the complete visible hierarchy
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
        .style("background", "#ffffff");
    
    globalSvg = svg;
    
    const g = svg.append("g")
        .attr("transform", "translate(40,40)");
    
    globalG = g;
    
    // Create hierarchy maintaining the complete chain
    globalRoot = buildHierarchyChain(data);
    
    if (!globalRoot) {
        console.error('Failed to build hierarchy chain');
        alert('Failed to build organizational chart structure');
        return;
    }
    
    console.log('Hierarchy chain built successfully');
    logHierarchyStructure(globalRoot);
    
    updateCompleteChart();
}

// Build hierarchy chain showing path from root to current focus + immediate reports
function buildHierarchyChain(data) {
    if (!data) {
        console.error('No data provided to buildHierarchyChain');
        return null;
    }
    
    const root = {
        data: data,
        children: [],
        _children: data.children || [],
        isRoot: true,
        level: 0,
        expanded: false // Track expansion state
    };
    
    // Add all immediate children but keep them collapsed initially
    if (data.children && Array.isArray(data.children) && data.children.length > 0) {
        // Don't show children initially - they should be expanded manually
        root._children = data.children;
        root.children = []; // Start collapsed
    }
    
    return root;
}

// Log hierarchy structure for debugging
function logHierarchyStructure(root) {
    console.log('=== HIERARCHY STRUCTURE ===');
    if (!root || !root.data) {
        console.log('Invalid root structure');
        return;
    }
    
    console.log('Root:', root.data.name, '- Level:', root.level);
    console.log('Available children (_children):', root._children ? root._children.length : 0);
    console.log('Visible children (children):', root.children ? root.children.length : 0);
    console.log('Expanded state:', root.expanded);
    console.log('===========================');
}

// Update chart showing complete hierarchy chain
function updateCompleteChart() {
    if (!globalRoot || !globalG) {
        console.error('Global references missing for chart update');
        return;
    }
    
    console.log('Updating complete hierarchy chart...');
    
    // Create flat list of all visible nodes (recursively)
    const nodes = [];
    const links = [];
    
    function collectNodes(node, parentNode = null) {
        if (!node) return;
        
        nodes.push(node);
        
        // Add link from parent to this node
        if (parentNode) {
            links.push({
                source: parentNode,
                target: node
            });
        }
        
        // Recursively add visible children
        if (node.children && Array.isArray(node.children)) {
            node.children.forEach(child => collectNodes(child, node));
        }
    }
    
    collectNodes(globalRoot);
    
    console.log('Chart update - showing', nodes.length, 'nodes and', links.length, 'links');
    
    // Position nodes hierarchically
    positionHierarchicalNodes(nodes);
    
    // Calculate required height and adjust SVG
    adjustChartHeight(nodes);
    
    // Update connecting lines
    const link = globalG.selectAll('.link')
        .data(links, d => `${d.source.data.name}-${d.target.data.name}`);
    
    const linkEnter = link.enter().insert('line', "g")
        .attr("class", "link")
        .style('stroke', '#C1C7CD')
        .style('stroke-width', '2px')
        .style('opacity', 0);
    
    const linkUpdate = linkEnter.merge(link);
    
    linkUpdate.transition()
        .duration(500)
        .style('opacity', 1)
        .attr('x1', d => d.source.x || 0)
        .attr('y1', d => (d.source.y || 0) + 42.5)
        .attr('x2', d => d.target.x || 0)
        .attr('y2', d => (d.target.y || 0) - 42.5);
    
    link.exit().transition()
        .duration(500)
        .style('opacity', 0)
        .remove();
    
    // Update nodes
    const node = globalG.selectAll('.node')
        .data(nodes, d => d.data ? d.data.name : 'unknown-' + Math.random());
    
    const nodeEnter = node.enter().append('g')
        .attr('class', 'node complete-node')
        .attr("transform", d => `translate(${d.x || 0},${d.y || 0})`)
        .style('cursor', 'pointer');
    
    // Add professional card background
    nodeEnter.append('rect')
        .attr('class', 'professional-card')
        .attr('width', 280)
        .attr('height', 85)
        .attr('x', -140)
        .attr('y', -42.5)
        .attr('rx', 12)
        .attr('ry', 12)
        .style('fill', '#ffffff')
        .style('stroke', d => d.isRoot ? '#0E3386' : '#E5E7EB')
        .style('stroke-width', d => d.isRoot ? '2px' : '1px')
        .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))')
        .style('transition', 'all 0.3s ease');
    
    // Add hover effects
    nodeEnter.selectAll('.professional-card')
        .on('mouseenter', function() {
            d3.select(this)
                .style('filter', 'drop-shadow(0 8px 25px rgba(0, 0, 0, 0.15))')
                .style('transform', 'translateY(-2px)');
        })
        .on('mouseleave', function() {
            d3.select(this)
                .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))')
                .style('transform', 'translateY(0)');
        });
    
    // Add profile circle
    nodeEnter.append('circle')
        .attr('class', 'profile-circle')
        .attr('cx', -90)
        .attr('cy', 0)
        .attr('r', 25)
        .style('fill', d => {
            const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];
            const name = d.data ? d.data.name || '' : '';
            const index = name.length % colors.length;
            return colors[index];
        })
        .style('stroke', '#ffffff')
        .style('stroke-width', '3px');
    
    // Add profile initials
    nodeEnter.append('text')
        .attr('class', 'profile-initials')
        .attr('x', -90)
        .attr('y', 5)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Inter, sans-serif')
        .style('font-size', '14px')
        .style('font-weight', '600')
        .style('fill', '#ffffff')
        .text(d => {
            const name = d.data ? d.data.name || '' : '';
            return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        });
    
    // Add employee name
    nodeEnter.append('text')
        .attr('class', 'employee-name')
        .attr('x', -45)
        .attr('y', -12)
        .attr('text-anchor', 'start')
        .style('font-family', 'Inter, sans-serif')
        .style('font-size', '16px')
        .style('font-weight', '700')
        .style('fill', '#1F2937')
        .text(d => {
            const name = d.data ? d.data.name || '' : '';
            return name.length > 20 ? name.substring(0, 18) + '...' : name;
        });
    
    // Add position
    nodeEnter.append('text')
        .attr('class', 'employee-position')
        .attr('x', -45)
        .attr('y', 4)
        .attr('text-anchor', 'start')
        .style('font-family', 'Inter, sans-serif')
        .style('font-size', '13px')
        .style('font-weight', '500')
        .style('fill', '#6B7280')
        .text(d => {
            const position = d.data ? d.data.position || '' : '';
            return position.length > 24 ? position.substring(0, 22) + '...' : position;
        });
    
    // Add location
    nodeEnter.append('text')
        .attr('class', 'employee-location')
        .attr('x', -45)
        .attr('y', 20)
        .attr('text-anchor', 'start')
        .style('font-family', 'Inter, sans-serif')
        .style('font-size', '11px')
        .style('font-weight', '400')
        .style('fill', '#9CA3AF')
        .text(d => {
            const location = d.data ? (d.data.location || d.data.country || '') : '';
            return location.length > 30 ? location.substring(0, 28) + '...' : location;
        });
    
    // Add connection status
    nodeEnter.append('circle')
        .attr('class', 'status-indicator')
        .attr('cx', 115)
        .attr('cy', -25)
        .attr('r', 6)
        .style('fill', d => {
            const relationship = d.data ? d.data.relationship_with_qt || 'None' : 'None';
            switch(relationship.toLowerCase()) {
                case 'direct': return '#10B981';
                case 'indirect': return '#F59E0B';
                default: return '#D1D5DB';
            }
        })
        .style('stroke', '#ffffff')
        .style('stroke-width', '2px');
    
    // Add expand/collapse button - ONLY for nodes that have unexpanded children
    const expandButton = nodeEnter.filter(d => {
        // Only show button if node has _children that aren't currently expanded
        return d._children && d._children.length > 0;
    }).append('g')
        .attr('class', 'expand-button')
        .on('click', function(event, d) {
            event.stopPropagation();
            console.log('Expand button clicked for:', d.data.name, 'Expanded:', d.expanded);
            toggleNodeExpansion(d);
        });
    
    expandButton.append('circle')
        .attr('cx', 0)
        .attr('cy', 60)
        .attr('r', 10)
        .style('fill', '#ffffff')
        .style('stroke', '#0E3386')
        .style('stroke-width', '2px');
    
    expandButton.append('text')
        .attr('x', 0)
        .attr('y', 65)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Inter, sans-serif')
        .style('font-size', '12px')
        .style('font-weight', '700')
        .style('fill', '#0E3386')
        .text(d => d.expanded ? '−' : '+');
    
    // Update existing nodes
    const nodeUpdate = nodeEnter.merge(node);
    
    nodeUpdate.transition()
        .duration(500)
        .attr("transform", d => `translate(${d.x},${d.y})`);
    
    // Update expand/collapse button text for existing nodes
    nodeUpdate.select('.expand-button text')
        .text(d => d.expanded ? '−' : '+');
    
    // Remove exiting nodes
    node.exit().transition()
        .duration(500)
        .style('opacity', 0)
        .remove();
    
    console.log('Complete chart update finished successfully');
    
    // Auto-scroll to show newly expanded content
    setTimeout(() => {
        scrollToShowAllContent(nodes);
    }, 600); // Wait for transition to complete
}

// Adjust chart height based on content
function adjustChartHeight(nodes) {
    if (!globalSvg || nodes.length === 0) return;
    
    // Find the bottom-most node
    const maxY = Math.max(...nodes.map(node => node.y || 0));
    const padding = 150; // Extra space at bottom
    const minHeight = 800; // Minimum height
    
    const requiredHeight = Math.max(minHeight, maxY + padding);
    
    console.log('Adjusting chart height to:', requiredHeight, 'Max Y:', maxY);
    
    // Update SVG height
    globalSvg.attr("height", requiredHeight);
    
    // Update chart container height
    const chartContainer = document.getElementById('org-chart');
    if (chartContainer) {
        chartContainer.style.height = requiredHeight + 'px';
    }
}

// Auto-scroll to ensure all content is visible
function scrollToShowAllContent(nodes) {
    if (nodes.length === 0) return;
    
    // Find the last (bottom-most) node
    const bottomNode = nodes.reduce((bottom, node) => {
        return (node.y || 0) > (bottom.y || 0) ? node : bottom;
    });
    
    if (!bottomNode) return;
    
    console.log('Bottom node:', bottomNode.data.name, 'at Y:', bottomNode.y);
    
    // Try multiple scroll targets - chart container, parent containers, and window
    const scrollTargets = [
        document.getElementById('org-chart'),
        document.querySelector('.visualization-panel'),
        document.querySelector('.results-section'),
        document.querySelector('.container'),
        document.documentElement,
        document.body
    ];
    
    const nodeBottomY = (bottomNode.y || 0) + 100; // Add padding
    
    // Find the best scroll target
    for (const target of scrollTargets) {
        if (!target) continue;
        
        const isScrollable = target.scrollHeight > target.clientHeight;
        
        if (isScrollable) {
            console.log('Found scrollable target:', target.id || target.className);
            
            // Calculate scroll position
            const targetScrollTop = Math.max(0, nodeBottomY - target.clientHeight + 200);
            
            console.log('Scrolling to:', targetScrollTop);
            
            // Smooth scroll
            target.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth'
            });
            
            break; // Use the first scrollable container we find
        }
    }
    
    // Fallback: scroll the window
    const windowScrollY = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const chartContainer = document.getElementById('org-chart');
    
    if (chartContainer) {
        const chartRect = chartContainer.getBoundingClientRect();
        const chartTop = chartRect.top + windowScrollY;
        const targetY = chartTop + nodeBottomY;
        
        if (targetY > windowScrollY + windowHeight) {
            console.log('Scrolling window to show content at:', targetY);
            window.scrollTo({
                top: targetY - windowHeight + 200,
                behavior: 'smooth'
            });
        }
    }
}

// Alternative: Scroll to expanded node specifically
function scrollToExpandedNode(expandedNode) {
    if (!expandedNode || !expandedNode.children || expandedNode.children.length === 0) {
        return;
    }
    
    // Find the last child of the expanded node
    const lastChild = expandedNode.children[expandedNode.children.length - 1];
    if (!lastChild) return;
    
    console.log('Scrolling to show expanded children of:', expandedNode.data.name);
    console.log('Last child:', lastChild.data.name, 'at Y:', lastChild.y);
    
    const targetY = (lastChild.y || 0) + 100;
    
    // Get chart container
    const chartContainer = document.getElementById('org-chart');
    if (!chartContainer) return;
    
    // Make sure the chart container is scrollable
    chartContainer.style.overflowY = 'auto';
    chartContainer.style.maxHeight = '800px';
    
    // Calculate and perform scroll
    const containerHeight = chartContainer.clientHeight;
    const currentScroll = chartContainer.scrollTop;
    const visibleBottom = currentScroll + containerHeight;
    
    if (targetY > visibleBottom) {
        const newScrollTop = targetY - containerHeight + 150;
        
        console.log('Chart container scroll - Current:', currentScroll, 'Target:', newScrollTop);
        
        chartContainer.scrollTo({
            top: Math.max(0, newScrollTop),
            behavior: 'smooth'
        });
    }
}

// Position nodes vertically in hierarchy with dynamic spacing
function positionHierarchicalNodes(nodes) {
    if (!globalSvg) {
        console.error('GlobalSvg not available for positioning');
        return;
    }
    
    const containerWidth = globalSvg.node().getBoundingClientRect().width - 80;
    const centerX = containerWidth / 2;
    const baseVerticalSpacing = 140; // Base space between parent and child
    const siblingSpacing = 120; // Space between siblings
    
    // Start positioning from the top
    let currentY = 80; // Starting Y position
    
    // Position nodes level by level, accounting for expansions
    function positionNodeAndChildren(node, level = 0) {
        if (!node) return currentY;
        
        // Position the current node
        node.x = centerX;
        node.y = currentY;
        node.level = level;
        
        console.log(`Positioning ${node.data ? node.data.name : 'unknown'} at Y: ${currentY} (Level: ${level})`);
        
        // Move Y position down for next node
        currentY += siblingSpacing;
        
        // If this node is expanded, position its children
        if (node.expanded && node.children && node.children.length > 0) {
            console.log(`Node ${node.data ? node.data.name : 'unknown'} is expanded with ${node.children.length} children`);
            
            // Add extra space before children
            currentY += 20;
            
            // Position each child
            node.children.forEach((child, index) => {
                child.level = level + 1;
                positionNodeAndChildren(child, level + 1);
            });
            
            // Add extra space after children group
            currentY += 20;
        }
        
        return currentY;
    }
    
    // Start positioning from root
    if (globalRoot) {
        positionNodeAndChildren(globalRoot, 0);
    }
    
    console.log('Positioned nodes with dynamic spacing. Final Y:', currentY);
    
    // Update chart height based on final position
    const requiredHeight = Math.max(800, currentY + 100);
    if (globalSvg) {
        globalSvg.attr("height", requiredHeight);
    }
    
    const chartContainer = document.getElementById('org-chart');
    if (chartContainer) {
        chartContainer.style.height = requiredHeight + 'px';
    }
}

// Enhanced expand node with repositioning
function expandNode(node) {
    console.log('Expanding node:', node.data ? node.data.name : 'unknown');
    
    if (!node._children || node._children.length === 0) {
        console.log('No _children to expand');
        return;
    }
    
    // Create child nodes from _children data
    node.children = node._children.map((childData, index) => ({
        data: childData,
        parent: node,
        children: [],
        _children: childData.children || [],
        isChild: true,
        level: node.level + 1,
        index: index,
        expanded: false
    }));
    
    node.expanded = true;
    console.log('Expanded node now has', node.children.length, 'visible children');
    
    // Force immediate repositioning after expansion
    setTimeout(() => {
        repositionAllNodes();
    }, 50);
}

// Enhanced collapse node with repositioning
function collapseNode(node) {
    console.log('Collapsing node:', node.data ? node.data.name : 'unknown');
    
    if (!node.children || node.children.length === 0) {
        console.log('No children to collapse');
        return;
    }
    
    // Recursively collapse all child nodes first
    node.children.forEach(child => {
        if (child.expanded) {
            collapseNode(child);
        }
    });
    
    // Hide all children
    node.children = [];
    node.expanded = false;
    console.log('Collapsed node, children now hidden');
    
    // Force immediate repositioning after collapse
    setTimeout(() => {
        repositionAllNodes();
    }, 50);
}

// New function to reposition all visible nodes
function repositionAllNodes() {
    if (!globalRoot || !globalG) {
        console.error('Cannot reposition - missing global references');
        return;
    }
    
    console.log('Repositioning all nodes after expansion/collapse');
    
    // Collect all currently visible nodes
    const nodes = [];
    function collectNodes(node) {
        if (!node) return;
        nodes.push(node);
        if (node.children && Array.isArray(node.children)) {
            node.children.forEach(collectNodes);
        }
    }
    collectNodes(globalRoot);
    
    // Reposition all nodes
    positionHierarchicalNodes(nodes);
    
    // Update existing node positions with animation
    globalG.selectAll('.node')
        .data(nodes, d => d.data ? d.data.name : 'unknown')
        .transition()
        .duration(400)
        .attr("transform", d => `translate(${d.x},${d.y})`);
    
    // Update link positions
    const links = [];
    function collectLinks(node) {
        if (!node || !node.children) return;
        node.children.forEach(child => {
            links.push({ source: node, target: child });
            collectLinks(child);
        });
    }
    collectLinks(globalRoot);
    
    globalG.selectAll('.link')
        .data(links, d => `${d.source.data.name}-${d.target.data.name}`)
        .transition()
        .duration(400)
        .attr('x1', d => d.source.x || 0)
        .attr('y1', d => (d.source.y || 0) + 42.5)
        .attr('x2', d => d.target.x || 0)
        .attr('y2', d => (d.target.y || 0) - 42.5);
    
    console.log('Node repositioning complete');
}

// Update the main chart update to use new positioning
function updateCompleteChart() {
    if (!globalRoot || !globalG) {
        console.error('Global references missing for chart update');
        return;
    }
    
    console.log('Updating complete hierarchy chart...');
    
    // Create flat list of all visible nodes (recursively)
    const nodes = [];
    const links = [];
    
    function collectNodes(node, parentNode = null) {
        if (!node) return;
        
        nodes.push(node);
        
        // Add link from parent to this node
        if (parentNode) {
            links.push({
                source: parentNode,
                target: node
            });
        }
        
        // Recursively add visible children
        if (node.children && Array.isArray(node.children)) {
            node.children.forEach(child => collectNodes(child, node));
        }
    }
    
    collectNodes(globalRoot);
    
    console.log('Chart update - showing', nodes.length, 'nodes and', links.length, 'links');
    
    // Position nodes with dynamic spacing
    positionHierarchicalNodes(nodes);
    
    // Update connecting lines
    const link = globalG.selectAll('.link')
        .data(links, d => `${d.source.data.name}-${d.target.data.name}`);
    
    const linkEnter = link.enter().insert('line', "g")
        .attr("class", "link")
        .style('stroke', '#C1C7CD')
        .style('stroke-width', '2px')
        .style('opacity', 0);
    
    const linkUpdate = linkEnter.merge(link);
    
    linkUpdate.transition()
        .duration(500)
        .style('opacity', 1)
        .attr('x1', d => d.source.x || 0)
        .attr('y1', d => (d.source.y || 0) + 42.5)
        .attr('x2', d => d.target.x || 0)
        .attr('y2', d => (d.target.y || 0) - 42.5);
    
    link.exit().transition()
        .duration(500)
        .style('opacity', 0)
        .remove();
    
    // Update nodes
    const node = globalG.selectAll('.node')
        .data(nodes, d => d.data ? d.data.name : 'unknown-' + Math.random());
    
    const nodeEnter = node.enter().append('g')
        .attr('class', 'node complete-node')
        .attr("transform", d => `translate(${d.x || 0},${d.y || 0})`)
        .style('cursor', 'pointer');
    
    // Add professional card background
    nodeEnter.append('rect')
        .attr('class', 'professional-card')
        .attr('width', 280)
        .attr('height', 85)
        .attr('x', -140)
        .attr('y', -42.5)
        .attr('rx', 12)
        .attr('ry', 12)
        .style('fill', '#ffffff')
        .style('stroke', d => d.isRoot ? '#0E3386' : '#E5E7EB')
        .style('stroke-width', d => d.isRoot ? '2px' : '1px')
        .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))')
        .style('transition', 'all 0.3s ease');
    
    // Add hover effects
    nodeEnter.selectAll('.professional-card')
        .on('mouseenter', function() {
            d3.select(this)
                .style('filter', 'drop-shadow(0 8px 25px rgba(0, 0, 0, 0.15))')
                .style('transform', 'translateY(-2px)');
        })
        .on('mouseleave', function() {
            d3.select(this)
                .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))')
                .style('transform', 'translateY(0)');
        });
    
    // Add profile circle
    nodeEnter.append('circle')
        .attr('class', 'profile-circle')
        .attr('cx', -90)
        .attr('cy', 0)
        .attr('r', 25)
        .style('fill', d => {
            const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];
            const name = d.data ? d.data.name || '' : '';
            const index = name.length % colors.length;
            return colors[index];
        })
        .style('stroke', '#ffffff')
        .style('stroke-width', '3px');
    
    // Add profile initials
    nodeEnter.append('text')
        .attr('class', 'profile-initials')
        .attr('x', -90)
        .attr('y', 5)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Inter, sans-serif')
        .style('font-size', '14px')
        .style('font-weight', '600')
        .style('fill', '#ffffff')
        .text(d => {
            const name = d.data ? d.data.name || '' : '';
            return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        });
    
    // Add employee name
    nodeEnter.append('text')
        .attr('class', 'employee-name')
        .attr('x', -45)
        .attr('y', -12)
        .attr('text-anchor', 'start')
        .style('font-family', 'Inter, sans-serif')
        .style('font-size', '16px')
        .style('font-weight', '700')
        .style('fill', '#1F2937')
        .text(d => {
            const name = d.data ? d.data.name || '' : '';
            return name.length > 20 ? name.substring(0, 18) + '...' : name;
        });
    
    // Add position
    nodeEnter.append('text')
        .attr('class', 'employee-position')
        .attr('x', -45)
        .attr('y', 4)
        .attr('text-anchor', 'start')
        .style('font-family', 'Inter, sans-serif')
        .style('font-size', '13px')
        .style('font-weight', '500')
        .style('fill', '#6B7280')
        .text(d => {
            const position = d.data ? d.data.position || '' : '';
            return position.length > 24 ? position.substring(0, 22) + '...' : position;
        });
    
    // Add location
    nodeEnter.append('text')
        .attr('class', 'employee-location')
        .attr('x', -45)
        .attr('y', 20)
        .attr('text-anchor', 'start')
        .style('font-family', 'Inter, sans-serif')
        .style('font-size', '11px')
        .style('font-weight', '400')
        .style('fill', '#9CA3AF')
        .text(d => {
            const location = d.data ? (d.data.location || d.data.country || '') : '';
            return location.length > 30 ? location.substring(0, 28) + '...' : location;
        });
    
    // Add connection status
    nodeEnter.append('circle')
        .attr('class', 'status-indicator')
        .attr('cx', 115)
        .attr('cy', -25)
        .attr('r', 6)
        .style('fill', d => {
            const relationship = d.data ? d.data.relationship_with_qt || 'None' : 'None';
            switch(relationship.toLowerCase()) {
                case 'direct': return '#10B981';
                case 'indirect': return '#F59E0B';
                default: return '#D1D5DB';
            }
        })
        .style('stroke', '#ffffff')
        .style('stroke-width', '2px');
    
    // Add expand/collapse button - ONLY for nodes that have unexpanded children
    const expandButton = nodeEnter.filter(d => {
        // Only show button if node has _children that aren't currently expanded
        return d._children && d._children.length > 0;
    }).append('g')
        .attr('class', 'expand-button')
        .on('click', function(event, d) {
            event.stopPropagation();
            console.log('Expand button clicked for:', d.data.name, 'Expanded:', d.expanded);
            toggleNodeExpansion(d);
        });
    
    expandButton.append('circle')
        .attr('cx', 0)
        .attr('cy', 60)
        .attr('r', 10)
        .style('fill', '#ffffff')
        .style('stroke', '#0E3386')
        .style('stroke-width', '2px');
    
    expandButton.append('text')
        .attr('x', 0)
        .attr('y', 65)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Inter, sans-serif')
        .style('font-size', '12px')
        .style('font-weight', '700')
        .style('fill', '#0E3386')
        .text(d => d.expanded ? '−' : '+');
    
    // Update existing nodes with smooth transitions
    const nodeUpdate = nodeEnter.merge(node);
    
    nodeUpdate.transition()
        .duration(500)
        .attr("transform", d => `translate(${d.x},${d.y})`);
    
    // Update expand/collapse button text for existing nodes
    nodeUpdate.select('.expand-button text')
        .text(d => d.expanded ? '−' : '+');
    
    // Remove exiting nodes
    node.exit().transition()
        .duration(500)
        .style('opacity', 0)
        .remove();
    
    console.log('Complete chart update finished successfully');
}

// Toggle node expansion/collapse
function toggleNodeExpansion(clickedNode) {
    console.log('Toggling expansion for:', clickedNode.data ? clickedNode.data.name : 'unknown');
    console.log('Current state - Expanded:', clickedNode.expanded, 'Has _children:', clickedNode._children ? clickedNode._children.length : 0);
    
    if (!clickedNode._children || clickedNode._children.length === 0) {
        console.log('No children to expand/collapse');
        return;
    }
    
    if (clickedNode.expanded) {
        // Collapse - hide all expanded children
        collapseNode(clickedNode);
    } else {
        // Expand - show all children
        expandNode(clickedNode);
    }
    
    updateCompleteChart();
    
    // After expanding, scroll to show the expanded content
    if (!clickedNode.expanded) { // If we just expanded (now it's true)
        setTimeout(() => {
            scrollToExpandedNode(clickedNode);
        }, 700); // Wait for animations
    }
}

// Render the main organizational chart
function renderOrgChart(data) {
    console.log('Rendering organizational chart with data:', data);
    
    const container = d3.select("#org-chart");
    if (container.empty()) {
        console.error('Org chart container not found');
        alert('Chart container not found on page');
        return;
    }
    
    container.selectAll("*").remove();
    
    const containerNode = container.node();
    if (!containerNode) {
        console.error('Org chart container node not found');
        return;
    }
    
    // Setup container for scrolling
    containerNode.style.overflowY = 'auto';
    containerNode.style.overflowX = 'hidden';
    containerNode.style.maxHeight = '800px';
    containerNode.style.position = 'relative';
    
    const width = containerNode.getBoundingClientRect().width || 800;
    const height = 1200; // Start with larger height
    
    console.log('Chart container dimensions:', width, 'x', height);
    
    // Analyze and display stats for the complete visible hierarchy
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
        .style("background", "#ffffff")
        .style("display", "block");
    
    globalSvg = svg;
    
    const g = svg.append("g")
        .attr("transform", "translate(40,40)");
    
    globalG = g;
    
    // Create hierarchy maintaining the complete chain
    globalRoot = buildHierarchyChain(data);
    
    if (!globalRoot) {
        console.error('Failed to build hierarchy chain');
        alert('Failed to build organizational chart structure');
        return;
    }
    
    console.log('Hierarchy chain built successfully');
    logHierarchyStructure(globalRoot);
    
    updateCompleteChart();
}

// Expand node to show all its children
function expandNode(node) {
    console.log('Expanding node:', node.data ? node.data.name : 'unknown');
    
    if (!node._children || node._children.length === 0) {
        console.log('No _children to expand');
        return;
    }
    
    // Create child nodes from _children data
    node.children = node._children.map((childData, index) => ({
        data: childData,
        parent: node,
        children: [],
        _children: childData.children || [],
        isChild: true,
        level: node.level + 1,
        index: index,
        expanded: false
    }));
    
    node.expanded = true;
    console.log('Expanded node now has', node.children.length, 'visible children');
}

// Collapse node to hide all its children
function collapseNode(node) {
    console.log('Collapsing node:', node.data ? node.data.name : 'unknown');
    
    if (!node.children || node.children.length === 0) {
        console.log('No children to collapse');
        return;
    }
    
    // Recursively collapse all child nodes first
    node.children.forEach(child => {
        if (child.expanded) {
            collapseNode(child);
        }
    });
    
    // Hide all children
    node.children = [];
    node.expanded = false;
    console.log('Collapsed node, children now hidden');
}

// Chart control functions
function expandAll() {
    console.log('Expand all - showing all immediate reports');
    
    if (!globalRoot) {
        console.log('No chart data to expand');
        return;
    }
    
    // Expand the root node if it has children
    if (globalRoot._children && globalRoot._children.length > 0 && !globalRoot.expanded) {
        expandNode(globalRoot);
        updateCompleteChart();
    }
}

function collapseAll() {
    console.log('Collapse all - hiding all expanded nodes');
    
    if (!globalRoot) {
        console.log('No chart data to collapse');
        return;
    }
    
    // Collapse the root node if it's expanded
    if (globalRoot.expanded) {
        collapseNode(globalRoot);
        updateCompleteChart();
    }
}

function resetChart() {
    if (!globalTreeData) {
        console.log('No chart data to reset');
        return;
    }
    
    console.log('Resetting complete chart');
    renderOrgChart(globalTreeData);
}

// Enhanced highlighting functions with visual feedback (REMOVED BANNER)
function highlightChampionConnections(champion) {
    clearHighlights();
    
    console.log('Highlighting connections for champion:', champion.name);
    console.log('Champion connections:', champion.connections);
    
    // Add visual highlight border to champion cards
    if (globalG) {
        globalG.selectAll('.node').each(function(d) {
            if (!d.data) return;
            
            const representative = d.data.representative_from_qt;
            const personName = d.data.name;
            
            // Check if this person is connected to the champion
            const isConnectedToChampion = champion.connections.some(conn => conn.name === personName);
            
            if (isConnectedToChampion || representative === champion.name) {
                // Add highlight class and visual effects
                d3.select(this).classed('champion-highlighted', true);
                
                // Add glowing border effect
                d3.select(this).select('.professional-card')
                    .style('stroke', '#FFD700')
                    .style('stroke-width', '3px')
                    .style('filter', 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.6))')
                    .style('animation', 'pulse-glow 2s infinite');
                
                console.log('Highlighted node:', personName, 'connected to champion:', champion.name);
            }
        });
    }
    
    // Auto-clear highlights after 10 seconds
    setTimeout(clearHighlights, 10000);
}

function clearHighlights() {
    console.log('Clearing all highlights');
    
    if (globalG) {
        // Remove champion highlighting
        globalG.selectAll('.node').classed('champion-highlighted', false);
        
        // Reset card styles
        globalG.selectAll('.professional-card')
            .style('stroke', '#E5E7EB')
            .style('stroke-width', '1px')
            .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))')
            .style('animation', null);
        
        // Clear link highlights
        globalG.selectAll('.link').classed('highlighted', false);
    }
    
    // Clear map highlights
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
    
    // Remove any existing notifications (though we're not creating them anymore)
    const notifications = document.querySelectorAll('.champion-notification');
    notifications.forEach(notification => notification.remove());
}

// Map rendering function
function renderMap(mapData) {
    if (map) {
        map.remove();
        map = null;
    }
    
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }
    
    console.log('Rendering map with data:', mapData);
    
    try {
        map = L.map('map', {
            zoomControl: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            boxZoom: false,
            keyboard: false,
            dragging: true
        }).setView([20, 0], 2);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
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
            'Pune': [18.5204, 73.8567]
        };
        
        if (!mapData || !Array.isArray(mapData)) {
            console.warn('Invalid map data provided');
            return;
        }
        
        mapData.forEach(location => {
            const coords = locationCoords[location.location];
            
            if (!coords) {
                console.warn('No coordinates found for location:', location.location);
                return;
            }
            
            const connectionCounts = {
                direct: 0,
                indirect: 0,
                none: 0
            };
            
            if (location.people && Array.isArray(location.people)) {
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
            }
            
            let circleColor, strokeColor;
            if (connectionCounts.direct > 0) {
                circleColor = '#00C853';
                strokeColor = '#00A847';
            } else if (connectionCounts.indirect > 0) {
                circleColor = '#FF9800';
                strokeColor = '#E68900';
            } else {
                circleColor = '#757575';
                strokeColor = '#616161';
            }
            
            const radius = Math.max(8, Math.min(25, location.count * 3));
            
            const circleMarker = L.circleMarker(coords, {
                radius: radius,
                fillColor: circleColor,
                color: strokeColor,
                weight: 3,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);
            
            const popupContent = `
                <div style="font-family: 'Inter', sans-serif; min-width: 250px;">
                    <h3 style="margin: 0 0 12px 0; color: #333; font-size: 1.1rem;">${location.location}</h3>
                    <p style="margin: 0 0 10px 0; font-weight: 600; color: #555;"><strong>Total Employees:</strong> ${location.count}</p>
                    
                    ${connectionCounts.direct > 0 ? 
                        `<div style="background: #E8F5E8; padding: 8px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid #00C853;">
                            <strong style="color: #00A847;">Direct Connections: ${connectionCounts.direct}</strong>
                        </div>` : ''}
                    
                    ${connectionCounts.indirect > 0 ? 
                        `<div style="background: #FFF8E1; padding: 8px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid #FF9800;">
                            <strong style="color: #E68900;">Indirect Connections: ${connectionCounts.indirect}</strong>
                        </div>` : ''}
                    
                    ${connectionCounts.none > 0 ? 
                        `<div style="background: #F5F5F5; padding: 8px; border-radius: 6px; margin-bottom: 12px; border-left: 4px solid #757575;">
                            <strong style="color: #666;">No Known Connections: ${connectionCounts.none}</strong>
                        </div>` : ''}
                </div>
            `;
            
            circleMarker.bindPopup(popupContent);
        });
        
        // Fit map to show all markers
        if (mapData.length > 0) {
            const group = new L.featureGroup();
            map.eachLayer(layer => {
                if (layer instanceof L.CircleMarker) {
                    group.addLayer(layer);
                }
            });
            
            if (group.getLayers().length > 0) {
                setTimeout(() => {
                    map.fitBounds(group.getBounds().pad(0.1));
                }, 100);
            }
        }
        
        console.log('Map rendered successfully');
        
    } catch (error) {
        console.error('Error rendering map:', error);
    }
}

// Error handling wrapper for API calls
async function safeApiCall(url, errorMessage) {
    try {
        console.log('Making API call to:', url);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('API call successful:', url);
        return data;
    } catch (error) {
        console.error(`${errorMessage}:`, error);
        alert(`${errorMessage}. Error: ${error.message}`);
        throw error;
    }
}

// Add window resize handler for responsive chart
window.addEventListener('resize', () => {
    if (globalTreeData && currentPerson) {
        setTimeout(() => {
            console.log('Window resized, re-rendering chart');
            renderOrgChart(globalTreeData);
        }, 100);
    }
});

// Expose functions to window for console access and debugging
window.debugOrgChart = function() {
    console.log('=== DEBUG INFO ===');
    console.log('Current person:', currentPerson);
    console.log('Global tree data:', globalTreeData);
    console.log('Global root:', globalRoot);
    console.log('Global root expanded:', globalRoot ? globalRoot.expanded : 'N/A');
    console.log('Global root _children:', globalRoot ? (globalRoot._children ? globalRoot._children.length : 0) : 'N/A');
    console.log('Global root children:', globalRoot ? (globalRoot.children ? globalRoot.children.length : 0) : 'N/A');
    console.log('All employees loaded:', allEmployees.length);
    console.log('==================');
};

window.expandAll = expandAll;
window.collapseAll = collapseAll;
window.resetChart = resetChart;
window.clearHighlights = clearHighlights;

console.log('Fixed JavaScript file loaded successfully - Proper expand/collapse with filtering');