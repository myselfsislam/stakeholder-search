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
            throw new Error('HTTP error! status: ' + response.status);
        }
        const employees = await response.json();
        allEmployees = employees;
        console.log('Loaded', employees.length, 'employees for autocomplete');
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

// Setup autocomplete functionality
function setupAutocomplete() {
    loadAllEmployees();
    
    const searchInput = document.getElementById('search');
    if (!searchInput) return;
    
    // Create autocomplete dropdown container
    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.id = 'autocomplete-dropdown';
    autocompleteContainer.className = 'autocomplete-dropdown hidden';
    
    // Insert after search input
    searchInput.parentNode.appendChild(autocompleteContainer);
    
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
    if (!dropdown) return;
    
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
        const response = await fetch('/api/search?' + params);
        if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
        }
        const results = await response.json();
        console.log('Search results:', results);
        
        if (results.length > 0) {
            selectPerson(results[0].name);
        } else {
            alert('No results found. Please try a different name.');
        }
    } catch (error) {
        console.error('Error searching:', error);
        alert('Error searching. Please check if the Flask server is running.');
    }
}

// Select a person and load their organizational data
async function selectPerson(personName) {
    console.log('Selecting person:', personName);
    currentPerson = personName;
    document.getElementById('visualization-container').classList.remove('hidden');
    hideAutocomplete(); // Hide dropdown when person is selected
    
    await loadOrgChart();
    await loadMap();
}

// Load organizational chart data from API
async function loadOrgChart() {
    if (!currentPerson) return;
    
    console.log('Loading org chart for:', currentPerson);
    
    try {
        const response = await fetch('/api/hierarchy/' + encodeURIComponent(currentPerson));
        if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
        }
        const hierarchyData = await response.json();
        
        console.log('Hierarchy data received:', hierarchyData);
        renderOrgChart(hierarchyData);
    } catch (error) {
        console.error('Error loading hierarchy:', error);
        alert('Error loading organizational chart. Please check if the Flask server is running.');
    }
}

// Load map data from API
async function loadMap() {
    if (!currentPerson) return;
    
    try {
        const response = await fetch('/api/map-data/' + encodeURIComponent(currentPerson));
        if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
        }
        const mapData = await response.json();
        
        console.log('Map data received:', mapData);
        renderMap(mapData);
    } catch (error) {
        console.error('Error loading map data:', error);
        alert('Error loading map. Please check if the Flask server is running.');
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
    if (!infoContainer) return;
    
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
    
    if (!championsCard || !championsGrid) return;
    
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

// Render the main organizational chart - COMPLETE HIERARCHY CHAIN
function renderOrgChart(data) {
    console.log('Rendering COMPLETE hierarchy chain:', data);
    
    const container = d3.select("#org-chart");
    container.selectAll("*").remove();
    
    const containerNode = container.node();
    if (!containerNode) {
        console.error('Org chart container not found');
        return;
    }
    
    const width = containerNode.getBoundingClientRect().width;
    const height = 800;
    
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
    
    // ZOOM DISABLED - no zoom functionality
    
    const g = svg.append("g")
        .attr("transform", "translate(40,40)");
    
    globalG = g;
    
    // Create hierarchy maintaining the complete chain
    globalRoot = buildHierarchyChain(data);
    
    console.log('Complete hierarchy chain built');
    logHierarchyStructure(globalRoot);
    
    updateCompleteChart();
}

// Build hierarchy chain showing path from root to current focus + immediate reports
function buildHierarchyChain(data) {
    const root = {
        data: data,
        children: [],
        _children: data.children || [],
        isRoot: true,
        level: 0
    };
    
    // Add all immediate children
    if (data.children && data.children.length > 0) {
        root.children = data.children.map((child, index) => ({
            data: child,
            parent: root,
            children: [],
            _children: child.children || [],
            isChild: true,
            level: 1,
            index: index
        }));
    }
    
    return root;
}

// Log hierarchy structure for debugging
function logHierarchyStructure(root) {
    console.log('=== HIERARCHY STRUCTURE ===');
    console.log('Root:', root.data.name, '- Level:', root.level);
    if (root.children) {
        console.log('Direct reports (' + root.children.length + '):');
        root.children.forEach((child, i) => {
            console.log(`  ${i+1}. ${child.data.name} (${child.data.position})`);
            if (child._children && child._children.length > 0) {
                console.log(`     Has ${child._children.length} subordinates`);
            }
        });
    }
    console.log('===========================');
}

// Update chart showing complete hierarchy chain
function updateCompleteChart() {
    if (!globalRoot || !globalG) {
        console.error('Global references missing');
        return;
    }
    
    console.log('Updating complete hierarchy chart...');
    
    // Create flat list of all visible nodes
    const nodes = [globalRoot];
    if (globalRoot.children) {
        nodes.push(...globalRoot.children);
    }
    
    // Create links from root to each child
    const links = globalRoot.children || [];
    
    console.log('Chart update - showing', nodes.length, 'nodes');
    
    // Position nodes vertically
    positionCompleteHierarchy(nodes);
    
    // Update connecting lines
    const link = globalG.selectAll('.link')
        .data(links, d => d.data.name);
    
    const linkEnter = link.enter().insert('line', "g")
        .attr("class", "link")
        .style('stroke', '#C1C7CD')
        .style('stroke-width', '2px')
        .style('opacity', 0)
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 0)
        .attr('y2', 0);
    
    const linkUpdate = linkEnter.merge(link);
    
    linkUpdate.transition()
        .duration(500)
        .style('opacity', 1)
        .attr('x1', globalRoot.x || 0)
        .attr('y1', (globalRoot.y || 0) + 42.5)
        .attr('x2', d => d.x || 0)
        .attr('y2', d => (d.y || 0) - 42.5);
    
    link.exit().transition()
        .duration(500)
        .style('opacity', 0)
        .remove();
    
    // Update nodes
    const node = globalG.selectAll('.node')
        .data(nodes, d => d.data.name);
    
    const nodeEnter = node.enter().append('g')
        .attr('class', 'node complete-node')
        .attr("transform", d => `translate(${d.x || 0},${d.y || 0})`)
        .on('click', function(event, d) { 
            handleCompleteNodeClick(d); 
        })
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
            const name = d.data.name || '';
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
            const name = d.data.name || '';
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
            const name = d.data.name || '';
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
            const position = d.data.position || '';
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
            const location = d.data.location || d.data.country || '';
            return location.length > 30 ? location.substring(0, 28) + '...' : location;
        });
    
    // Add connection status
    nodeEnter.append('circle')
        .attr('class', 'status-indicator')
        .attr('cx', 115)
        .attr('cy', -25)
        .attr('r', 6)
        .style('fill', d => {
            const relationship = d.data.relationship_with_qt || 'None';
            switch(relationship.toLowerCase()) {
                case 'direct': return '#10B981';
                case 'indirect': return '#F59E0B';
                default: return '#D1D5DB';
            }
        })
        .style('stroke', '#ffffff')
        .style('stroke-width', '2px');
    
    // Add reports counter
    const reportsGroup = nodeEnter.append('g')
        .attr('class', 'reports-counter')
        .style('display', d => {
            const reportCount = d._children ? d._children.length : 0;
            return reportCount > 0 ? 'block' : 'none';
        });
    
    reportsGroup.append('rect')
        .attr('x', 95)
        .attr('y', 18)
        .attr('width', 32)
        .attr('height', 16)
        .attr('rx', 8)
        .attr('ry', 8)
        .style('fill', '#F3F4F6')
        .style('stroke', '#E5E7EB')
        .style('stroke-width', '1px');
    
    reportsGroup.append('text')
        .attr('x', 111)
        .attr('y', 28)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Inter, sans-serif')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('fill', '#6B7280')
        .text(d => {
            const reportCount = d._children ? d._children.length : 0;
            return reportCount > 99 ? '99+' : reportCount.toString();
        });
    
    // Add expand button - only show for nodes with reports
    const expandButton = nodeEnter.append('g')
        .attr('class', 'expand-button')
        .style('display', d => {
            const reportCount = d._children ? d._children.length : 0;
            return reportCount > 0 ? 'block' : 'none';
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
        .text('+');
    
    // Update existing nodes
    const nodeUpdate = nodeEnter.merge(node);
    
    nodeUpdate.transition()
        .duration(500)
        .attr("transform", d => `translate(${d.x},${d.y})`);
    
    // Remove exiting nodes
    node.exit().transition()
        .duration(500)
        .style('opacity', 0)
        .remove();
    
    console.log('Complete chart update finished');
}

// Position nodes in complete hierarchy
function positionCompleteHierarchy(nodes) {
    const containerWidth = globalSvg.node().getBoundingClientRect().width - 80;
    const centerX = containerWidth / 2;
    const cardSpacing = 120;
    
    // Root at top
    if (nodes[0]) {
        nodes[0].x = centerX;
        nodes[0].y = 80;
    }
    
    // Stack children vertically below
    for (let i = 1; i < nodes.length; i++) {
        nodes[i].x = centerX;
        nodes[i].y = 200 + ((i - 1) * cardSpacing);
    }
    
    console.log('Positioned', nodes.length, 'nodes in complete hierarchy');
}

// Handle node clicks - expand within current hierarchy, don't replace it
function handleCompleteNodeClick(clickedNode) {
    console.log('Complete node clicked:', clickedNode.data.name);
    
    // If clicked node has no reports, do nothing
    if (!clickedNode._children || clickedNode._children.length === 0) {
        console.log('No reports to show for:', clickedNode.data.name);
        return;
    }
    
    // Toggle expansion of this node within the current hierarchy
    if (clickedNode.isExpanded) {
        // Collapse this node
        clickedNode.isExpanded = false;
        clickedNode.expandedChildren = null;
        console.log('Collapsing:', clickedNode.data.name);
    } else {
        // Expand this node to show its children
        clickedNode.isExpanded = true;
        clickedNode.expandedChildren = clickedNode._children.map((child, index) => ({
            data: child,
            parent: clickedNode,
            children: [],
            _children: child.children || [],
            isExpandedChild: true,
            level: clickedNode.level + 1,
            index: index
        }));
        console.log('Expanding:', clickedNode.data.name, 'showing', clickedNode.expandedChildren.length, 'reports');
    }
    
    // Update the chart to show the new expanded state
    updateCompleteChart();
}

// Update chart showing complete hierarchy with expansions
function updateCompleteChart() {
    if (!globalRoot || !globalG) {
        console.error('Global references missing');
        return;
    }
    
    console.log('Updating complete hierarchy with expansions...');
    
    // Build flat list of all visible nodes including expanded ones
    const nodes = [globalRoot];
    const links = [];
    
    // Add immediate children (always visible)
    if (globalRoot.children) {
        nodes.push(...globalRoot.children);
        // Add links from root to immediate children
        globalRoot.children.forEach(child => {
            links.push({ source: globalRoot, target: child });
        });
    }
    
    // Add expanded children for any expanded nodes
    if (globalRoot.children) {
        globalRoot.children.forEach(child => {
            if (child.isExpanded && child.expandedChildren) {
                nodes.push(...child.expandedChildren);
                // Add links from expanded parent to its children
                child.expandedChildren.forEach(grandchild => {
                    links.push({ source: child, target: grandchild });
                });
            }
        });
    }
    
    console.log('Chart update - showing', nodes.length, 'nodes with', links.length, 'connections');
    
    // Position nodes in expanded hierarchy
    positionExpandedHierarchy(nodes);
    
    // Update connecting lines
    const link = globalG.selectAll('.link')
        .data(links, d => `${d.source.data.name}-${d.target.data.name}`);
    
    const linkEnter = link.enter().insert('line', "g")
        .attr("class", "link")
        .style('stroke', '#C1C7CD')
        .style('stroke-width', '2px')
        .style('opacity', 0)
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 0)
        .attr('y2', 0);
    
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
        .data(nodes, d => d.data.name);
    
    const nodeEnter = node.enter().append('g')
        .attr('class', 'node complete-node')
        .attr("transform", d => `translate(${d.x || 0},${d.y || 0})`)
        .on('click', function(event, d) { 
            handleCompleteNodeClick(d); 
        })
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
        .style('stroke', d => {
            if (d.isRoot) return '#0E3386';
            if (d.isExpandedChild) return '#10B981';
            return '#E5E7EB';
        })
        .style('stroke-width', d => (d.isRoot || d.isExpandedChild) ? '2px' : '1px')
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
            const name = d.data.name || '';
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
            const name = d.data.name || '';
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
            const name = d.data.name || '';
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
            const position = d.data.position || '';
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
            const location = d.data.location || d.data.country || '';
            return location.length > 30 ? location.substring(0, 28) + '...' : location;
        });
    
    // Add connection status
    nodeEnter.append('circle')
        .attr('class', 'status-indicator')
        .attr('cx', 115)
        .attr('cy', -25)
        .attr('r', 6)
        .style('fill', d => {
            const relationship = d.data.relationship_with_qt || 'None';
            switch(relationship.toLowerCase()) {
                case 'direct': return '#10B981';
                case 'indirect': return '#F59E0B';
                default: return '#D1D5DB';
            }
        })
        .style('stroke', '#ffffff')
        .style('stroke-width', '2px');
    
    // Add reports counter
    const reportsGroup = nodeEnter.append('g')
        .attr('class', 'reports-counter')
        .style('display', d => {
            const reportCount = d._children ? d._children.length : 0;
            return reportCount > 0 ? 'block' : 'none';
        });
    
    reportsGroup.append('rect')
        .attr('x', 95)
        .attr('y', 18)
        .attr('width', 32)
        .attr('height', 16)
        .attr('rx', 8)
        .attr('ry', 8)
        .style('fill', '#F3F4F6')
        .style('stroke', '#E5E7EB')
        .style('stroke-width', '1px');
    
    reportsGroup.append('text')
        .attr('x', 111)
        .attr('y', 28)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Inter, sans-serif')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('fill', '#6B7280')
        .text(d => {
            const reportCount = d._children ? d._children.length : 0;
            return reportCount > 99 ? '99+' : reportCount.toString();
        });
    
    // Add expand/collapse button
    const expandButton = nodeEnter.append('g')
        .attr('class', 'expand-button')
        .style('display', d => {
            const reportCount = d._children ? d._children.length : 0;
            return reportCount > 0 ? 'block' : 'none';
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
        .text(d => d.isExpanded ? '−' : '+');
    
    // Update existing nodes
    const nodeUpdate = nodeEnter.merge(node);
    
    nodeUpdate.transition()
        .duration(500)
        .attr("transform", d => `translate(${d.x},${d.y})`);
    
    // Update expand button text
    nodeUpdate.select('.expand-button text')
        .text(d => d.isExpanded ? '−' : '+');
    
    // Remove exiting nodes
    node.exit().transition()
        .duration(500)
        .style('opacity', 0)
        .remove();
    
    console.log('Complete chart with expansions updated');
}

// Position nodes in expanded hierarchy maintaining management chain
function positionExpandedHierarchy(nodes) {
    const containerWidth = globalSvg.node().getBoundingClientRect().width - 80;
    const centerX = containerWidth / 2;
    const cardSpacing = 120;
    const indentAmount = 50; // Indent expanded children
    
    let currentY = 80;
    
    // Position root at top
    if (nodes[0]) {
        nodes[0].x = centerX;
        nodes[0].y = currentY;
        currentY += cardSpacing + 40; // Extra space after root
    }
    
    // Position immediate children and their expansions
    for (let i = 1; i < nodes.length; i++) {
        const node = nodes[i];
        
        if (node.isExpandedChild) {
            // This is an expanded child - indent it
            node.x = centerX + indentAmount;
        } else {
            // This is a direct child of root
            node.x = centerX;
        }
        
        node.y = currentY;
        currentY += cardSpacing;
    }
    
    console.log('Positioned', nodes.length, 'nodes in expanded hierarchy');
}

// Get data for immediate reports analysis (root + direct children only)
function getImmediateReportsData(data) {
    const flatData = {
        name: data.name,
        position: data.position,
        department: data.department,
        country: data.country,
        location: data.location,
        relationship_with_qt: data.relationship_with_qt,
        representative_from_qt: data.representative_from_qt,
        children: data.children || []
    };
    return flatData;
}

// Update chart with FLAT LAYOUT - only immediate reports
function updateFlatChart() {
    if (!globalRoot || !globalG) {
        console.error('Global references missing for flat chart');
        return;
    }
    
    console.log('Updating FLAT chart layout...');
    
    // Create flat list: root + immediate children only
    const nodes = [globalRoot];
    if (globalRoot.children) {
        nodes.push(...globalRoot.children);
    }
    
    const links = globalRoot.children || [];
    
    console.log('Flat chart update - nodes:', nodes.length);
    
    // FLAT VERTICAL POSITIONING
    positionNodesFlatVertical(nodes);
    
    // Update connecting lines
    const link = globalG.selectAll('.link')
        .data(links, d => d.data.name);
    
    const linkEnter = link.enter().insert('line', "g")
        .attr("class", "link")
        .style('stroke', '#C1C7CD')
        .style('stroke-width', '2px')
        .style('opacity', 0)
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 0)
        .attr('y2', 0);
    
    const linkUpdate = linkEnter.merge(link);
    
    linkUpdate.transition()
        .duration(500)
        .style('opacity', 1)
        .attr('x1', globalRoot.x || 0)
        .attr('y1', (globalRoot.y || 0) + 42.5) // Bottom of parent card
        .attr('x2', d => d.x || 0)
        .attr('y2', d => (d.y || 0) - 42.5); // Top of child card
    
    link.exit().transition()
        .duration(500)
        .style('opacity', 0)
        .remove();
    
    // Update nodes with PROFESSIONAL CARDS
    const node = globalG.selectAll('.node')
        .data(nodes, d => d.data.name);
    
    const nodeEnter = node.enter().append('g')
        .attr('class', 'node flat-node')
        .attr("transform", d => `translate(${d.x || 0},${d.y || 0})`)
        .on('click', function(event, d) { 
            if (d === globalRoot) return; // Don't allow clicking root
            handleFlatNodeClick(d); 
        })
        .style('cursor', d => d === globalRoot ? 'default' : 'pointer');
    
    // Add PROFESSIONAL node background card
    nodeEnter.append('rect')
        .attr('class', 'professional-card')
        .attr('width', 280)
        .attr('height', 85)
        .attr('x', -140)
        .attr('y', -42.5)
        .attr('rx', 12)
        .attr('ry', 12)
        .style('fill', '#ffffff')
        .style('stroke', '#E5E7EB')
        .style('stroke-width', '1px')
        .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))')
        .style('transition', 'all 0.3s ease');
    
    // Add hover effect (only for non-root nodes)
    nodeEnter.filter(d => d !== globalRoot)
        .selectAll('.professional-card')
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
    
    // Add PROFILE CIRCLE (left side)
    nodeEnter.append('circle')
        .attr('class', 'profile-circle')
        .attr('cx', -90)
        .attr('cy', 0)
        .attr('r', 25)
        .style('fill', d => {
            const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];
            const name = d.data.name || '';
            const index = name.length % colors.length;
            return colors[index];
        })
        .style('stroke', '#ffffff')
        .style('stroke-width', '3px');
    
    // Add PROFILE INITIALS
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
            const name = d.data.name || '';
            return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        });
    
    // Add EMPLOYEE NAME (primary text)
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
            const name = d.data.name || '';
            return name.length > 20 ? name.substring(0, 18) + '...' : name;
        });
    
    // Add EMPLOYEE POSITION (secondary text)
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
            const position = d.data.position || '';
            return position.length > 24 ? position.substring(0, 22) + '...' : position;
        });
    
    // Add LOCATION (tertiary text)
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
            const location = d.data.location || d.data.country || '';
            return location.length > 30 ? location.substring(0, 28) + '...' : location;
        });
    
    // Add CONNECTION STATUS INDICATOR (top-right)
    nodeEnter.append('circle')
        .attr('class', 'status-indicator')
        .attr('cx', 115)
        .attr('cy', -25)
        .attr('r', 6)
        .style('fill', d => {
            const relationship = d.data.relationship_with_qt || 'None';
            switch(relationship.toLowerCase()) {
                case 'direct': return '#10B981';
                case 'indirect': return '#F59E0B';
                default: return '#D1D5DB';
            }
        })
        .style('stroke', '#ffffff')
        .style('stroke-width', '2px');
    
    // Add REPORTS COUNTER (bottom-right) - only for nodes with children
    const reportsGroup = nodeEnter.append('g')
        .attr('class', 'reports-counter')
        .style('display', d => {
            const hasReports = d._children && d._children.length > 0;
            return hasReports ? 'block' : 'none';
        });
    
    reportsGroup.append('rect')
        .attr('x', 95)
        .attr('y', 18)
        .attr('width', 32)
        .attr('height', 16)
        .attr('rx', 8)
        .attr('ry', 8)
        .style('fill', '#F3F4F6')
        .style('stroke', '#E5E7EB')
        .style('stroke-width', '1px');
    
    reportsGroup.append('text')
        .attr('x', 111)
        .attr('y', 28)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Inter, sans-serif')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('fill', '#6B7280')
        .text(d => {
            const reportCount = d._children ? d._children.length : 0;
            return reportCount > 99 ? '99+' : reportCount.toString();
        });
    
    // Add EXPAND BUTTON (bottom center) - only for nodes with children
    const expandButton = nodeEnter.append('g')
        .attr('class', 'expand-button')
        .style('display', d => {
            const hasReports = d._children && d._children.length > 0;
            return hasReports ? 'block' : 'none';
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
        .text('+');
    
    // Merge and update existing nodes
    const nodeUpdate = nodeEnter.merge(node);
    
    nodeUpdate.transition()
        .duration(500)
        .attr("transform", d => `translate(${d.x},${d.y})`);
    
    // Remove exiting nodes
    node.exit().transition()
        .duration(500)
        .style('opacity', 0)
        .remove();
    
    console.log('FLAT chart update complete');
}

// Position nodes in FLAT VERTICAL STACK
function positionNodesFlatVertical(nodes) {
    const containerWidth = globalSvg.node().getBoundingClientRect().width - 80;
    const centerX = containerWidth / 2;
    const cardSpacing = 120; // Space between cards vertically
    
    // Position root at top
    if (nodes[0]) {
        nodes[0].x = centerX;
        nodes[0].y = 80;
    }
    
    // Position immediate children vertically below root
    for (let i = 1; i < nodes.length; i++) {
        nodes[i].x = centerX;
        nodes[i].y = 200 + ((i - 1) * cardSpacing);
    }
    
    console.log('Positioned', nodes.length, 'nodes in flat vertical layout');
}

// Handle click on nodes in flat layout - expand to show that person's reports
function handleFlatNodeClick(clickedNode) {
    console.log('Flat node clicked:', clickedNode.data.name);
    
    if (!clickedNode._children || clickedNode._children.length === 0) {
        console.log('No reports to show for:', clickedNode.data.name);
        return;
    }
    
    // Load new flat hierarchy for the clicked person
    selectPerson(clickedNode.data.name);
}

// Update chart with VERTICAL LAYOUT for immediate reports
function updateVerticalChart(source) {
    if (!globalRoot || !globalG) {
        console.error('Global references missing for vertical chart');
        return;
    }
    
    console.log('Updating VERTICAL chart layout...');
    
    const nodes = globalRoot.descendants();
    const links = globalRoot.descendants().slice(1);
    
    console.log('Vertical chart update - nodes:', nodes.length, 'links:', links.length);
    
    // VERTICAL POSITIONING: Stack cards vertically
    positionNodesVertically(nodes);
    
    // Update links for vertical layout
    const link = globalG.selectAll('.link')
        .data(links, d => d.id);
    
    const linkEnter = link.enter().insert('line', "g")
        .attr("class", "link")
        .style('stroke', '#C1C7CD')
        .style('stroke-width', '2px')
        .style('opacity', 0)
        .attr('x1', source.x0 || 0)
        .attr('y1', source.y0 || 0)
        .attr('x2', source.x0 || 0)
        .attr('y2', source.y0 || 0);
    
    const linkUpdate = linkEnter.merge(link);
    
    linkUpdate.transition()
        .duration(500)
        .style('opacity', 1)
        .attr('x1', d => d.parent.x)
        .attr('y1', d => d.parent.y + 42.5) // Bottom of parent card
        .attr('x2', d => d.x)
        .attr('y2', d => d.y - 42.5); // Top of child card
    
    link.exit().transition()
        .duration(500)
        .style('opacity', 0)
        .remove();
    
    // Update nodes with PROFESSIONAL CARDS
    const node = globalG.selectAll('.node')
        .data(nodes, d => d.id);
    
    const nodeEnter = node.enter().append('g')
        .attr('class', 'node professional-node')
        .attr("transform", d => `translate(${source.x0 || source.x || 0},${source.y0 || source.y || 0})`)
        .on('click', function(event, d) { 
            toggleVertical(d); 
        })
        .style('cursor', 'pointer');
    
    // Add PROFESSIONAL node background card
    nodeEnter.append('rect')
        .attr('class', 'professional-card')
        .attr('width', 280)
        .attr('height', 85)
        .attr('x', -140)
        .attr('y', -42.5)
        .attr('rx', 12)
        .attr('ry', 12)
        .style('fill', '#ffffff')
        .style('stroke', '#E5E7EB')
        .style('stroke-width', '1px')
        .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))')
        .style('transition', 'all 0.3s ease');
    
    // Add hover effect
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
    
    // Add PROFILE CIRCLE (left side)
    nodeEnter.append('circle')
        .attr('class', 'profile-circle')
        .attr('cx', -90)
        .attr('cy', 0)
        .attr('r', 25)
        .style('fill', d => {
            const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];
            const name = d.data.name || '';
            const index = name.length % colors.length;
            return colors[index];
        })
        .style('stroke', '#ffffff')
        .style('stroke-width', '3px');
    
    // Add PROFILE INITIALS
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
            const name = d.data.name || '';
            return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        });
    
    // Add EMPLOYEE NAME (primary text)
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
            const name = d.data.name || '';
            return name.length > 20 ? name.substring(0, 18) + '...' : name;
        });
    
    // Add EMPLOYEE POSITION (secondary text)
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
            const position = d.data.position || '';
            return position.length > 24 ? position.substring(0, 22) + '...' : position;
        });
    
    // Add LOCATION (tertiary text)
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
            const location = d.data.location || d.data.country || '';
            return location.length > 30 ? location.substring(0, 28) + '...' : location;
        });
    
    // Add CONNECTION STATUS INDICATOR (top-right)
    nodeEnter.append('circle')
        .attr('class', 'status-indicator')
        .attr('cx', 115)
        .attr('cy', -25)
        .attr('r', 6)
        .style('fill', d => {
            const relationship = d.data.relationship_with_qt || 'None';
            switch(relationship.toLowerCase()) {
                case 'direct': return '#10B981';
                case 'indirect': return '#F59E0B';
                default: return '#D1D5DB';
            }
        })
        .style('stroke', '#ffffff')
        .style('stroke-width', '2px');
    
    // Add REPORTS COUNTER (bottom-right)
    const reportsGroup = nodeEnter.append('g')
        .attr('class', 'reports-counter')
        .style('display', d => {
            const totalReports = (d._children ? d._children.length : 0) + (d.children ? d.children.length : 0);
            return totalReports > 0 ? 'block' : 'none';
        });
    
    reportsGroup.append('rect')
        .attr('x', 95)
        .attr('y', 18)
        .attr('width', 32)
        .attr('height', 16)
        .attr('rx', 8)
        .attr('ry', 8)
        .style('fill', '#F3F4F6')
        .style('stroke', '#E5E7EB')
        .style('stroke-width', '1px');
    
    reportsGroup.append('text')
        .attr('x', 111)
        .attr('y', 28)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Inter, sans-serif')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('fill', '#6B7280')
        .text(d => {
            const totalReports = (d._children ? d._children.length : 0) + (d.children ? d.children.length : 0);
            return totalReports > 99 ? '99+' : totalReports.toString();
        });
    
    // Add EXPAND/COLLAPSE BUTTON (bottom center)
    const expandButton = nodeEnter.append('g')
        .attr('class', 'expand-button')
        .style('display', d => (d._children || (d.children && d.children.length > 0)) ? 'block' : 'none');
    
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
        .text(d => (d.children && d.children.length > 0) ? '−' : '+');
    
    // Merge and update existing nodes
    const nodeUpdate = nodeEnter.merge(node);
    
    nodeUpdate.transition()
        .duration(500)
        .attr("transform", d => `translate(${d.x},${d.y})`);
    
    // Update expand button
    nodeUpdate.select('.expand-button text')
        .text(d => (d.children && d.children.length > 0) ? '−' : '+');
    
    nodeUpdate.select('.expand-button')
        .style('display', d => (d._children || (d.children && d.children.length > 0)) ? 'block' : 'none');
    
    // Update reports counter
    nodeUpdate.select('.reports-counter')
        .style('display', d => {
            const totalReports = (d._children ? d._children.length : 0) + (d.children ? d.children.length : 0);
            return totalReports > 0 ? 'block' : 'none';
        });
    
    nodeUpdate.select('.reports-counter text')
        .text(d => {
            const totalReports = (d._children ? d._children.length : 0) + (d.children ? d.children.length : 0);
            return totalReports > 99 ? '99+' : totalReports.toString();
        });
    
    // Remove exiting nodes
    node.exit().transition()
        .duration(500)
        .attr("transform", d => `translate(${source.x},${source.y})`)
        .style('opacity', 0)
        .remove();
    
    // Store positions for next time
    nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
    });
    
    console.log('VERTICAL chart update complete');
}

// Position nodes in VERTICAL STACK (not horizontal spread)
function positionNodesVertically(nodes) {
    const containerWidth = globalSvg.node().getBoundingClientRect().width - 80;
    const centerX = containerWidth / 2;
    const cardSpacing = 120; // Space between cards vertically
    
    // Root at top center
    const rootNode = nodes.find(n => n.depth === 0);
    if (rootNode) {
        rootNode.x = centerX;
        rootNode.y = 80;
    }
    
    // Stack all children vertically below root
    const childNodes = nodes.filter(n => n.depth === 1).sort((a, b) => {
        // Sort alphabetically by name for consistent ordering
        return (a.data.name || '').localeCompare(b.data.name || '');
    });
    
    childNodes.forEach((node, index) => {
        node.x = centerX; // All at same X position (centered)
        node.y = 200 + (index * cardSpacing); // Stack vertically
    });
    
    console.log('Positioned', nodes.length, 'nodes in vertical stack');
}

// Toggle for vertical layout - show/hide children of clicked node
function toggleVertical(d) {
    console.log('Vertical toggle called for:', d.data.name);
    
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }
    updateVerticalChart(d);
}

// Update chart with PROFESSIONAL LAYOUT - FIXED SPACING VERSION
function updateProfessionalChart(source) {
    if (!globalRoot || !globalG) {
        console.error('Global references missing for professional chart');
        return;
    }
    
    console.log('Updating PROFESSIONAL chart with proper spacing...');
    
    // Use D3 tree layout with WIDER spacing for 280px cards
    const containerWidth = globalSvg.node().getBoundingClientRect().width - 80;
    const treeLayout = d3.tree().size([containerWidth - 200, 600]);
    const treeData = treeLayout(globalRoot);
    
    const nodes = treeData.descendants();
    const links = treeData.descendants().slice(1);
    
    console.log('Professional chart update - nodes:', nodes.length, 'links:', links.length);
    
    // FIXED SPACING: Ensure minimum distance between cards
    const cardWidth = 280;
    const minHorizontalGap = 40; // Gap between cards
    const minDistance = cardWidth + minHorizontalGap; // 320px minimum distance
    
    // Adjust horizontal positions to prevent overlap
    const nodesByLevel = {};
    nodes.forEach(node => {
        if (!nodesByLevel[node.depth]) {
            nodesByLevel[node.depth] = [];
        }
        nodesByLevel[node.depth].push(node);
    });
    
    // Fix positioning for each level
    Object.keys(nodesByLevel).forEach(depth => {
        const levelNodes = nodesByLevel[depth];
        if (levelNodes.length > 1) {
            // Sort nodes by their current x position
            levelNodes.sort((a, b) => a.x - b.x);
            
            // Adjust positions to ensure minimum spacing
            for (let i = 1; i < levelNodes.length; i++) {
                const prevNode = levelNodes[i - 1];
                const currentNode = levelNodes[i];
                const minX = prevNode.x + minDistance;
                
                if (currentNode.x < minX) {
                    currentNode.x = minX;
                }
            }
        }
    });
    
    // Increase vertical spacing for better hierarchy visibility
    nodes.forEach(d => { 
        d.y = d.depth * 180; // Increased from 160px to 180px
    });
    
    // Update links with professional styling
    const link = globalG.selectAll('.link')
        .data(links, d => d.id);
    
    const linkEnter = link.enter().insert('path', "g")
        .attr("class", "link")
        .style('fill', 'none')
        .style('stroke', '#C1C7CD')
        .style('stroke-width', '2px')
        .style('opacity', 0)
        .attr('d', d => {
            const o = {x: source.x0 || source.x || 0, y: source.y0 || source.y || 0};
            return createProfessionalLinkPath(o, o);
        });
    
    const linkUpdate = linkEnter.merge(link);
    
    linkUpdate.transition()
        .duration(500)
        .style('opacity', 1)
        .attr('d', d => createProfessionalLinkPath(d.parent, d));
    
    link.exit().transition()
        .duration(500)
        .style('opacity', 0)
        .attr('d', d => {
            const o = {x: source.x, y: source.y};
            return createProfessionalLinkPath(o, o);
        })
        .remove();
    
    // Update nodes with PROFESSIONAL CARDS
    const node = globalG.selectAll('.node')
        .data(nodes, d => d.id);
    
    const nodeEnter = node.enter().append('g')
        .attr('class', 'node professional-node')
        .attr("transform", d => `translate(${source.x0 || source.x || 0},${source.y0 || source.y || 0})`)
        .on('click', function(event, d) { 
            toggleProfessional(d); 
        })
        .style('cursor', 'pointer');
    
    // Add PROFESSIONAL node background card
    nodeEnter.append('rect')
        .attr('class', 'professional-card')
        .attr('width', 280)
        .attr('height', 85)
        .attr('x', -140)
        .attr('y', -42.5)
        .attr('rx', 12)
        .attr('ry', 12)
        .style('fill', '#ffffff')
        .style('stroke', '#E5E7EB')
        .style('stroke-width', '1px')
        .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))')
        .style('transition', 'all 0.3s ease');
    
    // Add hover effect
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
    
    // Add PROFILE CIRCLE (left side)
    nodeEnter.append('circle')
        .attr('class', 'profile-circle')
        .attr('cx', -90)
        .attr('cy', 0)
        .attr('r', 25)
        .style('fill', d => {
            const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];
            const name = d.data.name || '';
            const index = name.length % colors.length;
            return colors[index];
        })
        .style('stroke', '#ffffff')
        .style('stroke-width', '3px');
    
    // Add PROFILE INITIALS
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
            const name = d.data.name || '';
            return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        });
    
    // Add EMPLOYEE NAME (primary text)
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
            const name = d.data.name || '';
            return name.length > 20 ? name.substring(0, 18) + '...' : name;
        });
    
    // Add EMPLOYEE POSITION (secondary text)
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
            const position = d.data.position || '';
            return position.length > 24 ? position.substring(0, 22) + '...' : position;
        });
    
    // Add LOCATION ONLY (no department to save space)
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
            const location = d.data.location || d.data.country || '';
            return location.length > 30 ? location.substring(0, 28) + '...' : location;
        });
    
    // Add CONNECTION STATUS INDICATOR (top-right)
    nodeEnter.append('circle')
        .attr('class', 'status-indicator')
        .attr('cx', 115)
        .attr('cy', -25)
        .attr('r', 6)
        .style('fill', d => {
            const relationship = d.data.relationship_with_qt || 'None';
            switch(relationship.toLowerCase()) {
                case 'direct': return '#10B981';
                case 'indirect': return '#F59E0B';
                default: return '#D1D5DB';
            }
        })
        .style('stroke', '#ffffff')
        .style('stroke-width', '2px');
    
    // Add REPORTS COUNTER (bottom-right)
    const reportsGroup = nodeEnter.append('g')
        .attr('class', 'reports-counter')
        .style('display', d => {
            const totalReports = (d._children ? d._children.length : 0) + (d.children ? d.children.length : 0);
            return totalReports > 0 ? 'block' : 'none';
        });
    
    reportsGroup.append('rect')
        .attr('x', 95)
        .attr('y', 18)
        .attr('width', 32)
        .attr('height', 16)
        .attr('rx', 8)
        .attr('ry', 8)
        .style('fill', '#F3F4F6')
        .style('stroke', '#E5E7EB')
        .style('stroke-width', '1px');
    
    reportsGroup.append('text')
        .attr('x', 111)
        .attr('y', 28)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Inter, sans-serif')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('fill', '#6B7280')
        .text(d => {
            const totalReports = (d._children ? d._children.length : 0) + (d.children ? d.children.length : 0);
            return totalReports > 99 ? '99+' : totalReports.toString();
        });
    
    // Add EXPAND/COLLAPSE BUTTON (bottom center)
    const expandButton = nodeEnter.append('g')
        .attr('class', 'expand-button')
        .style('display', d => (d._children || (d.children && d.children.length > 0)) ? 'block' : 'none');
    
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
        .text(d => (d.children && d.children.length > 0) ? '−' : '+');
    
    // Merge and update existing nodes
    const nodeUpdate = nodeEnter.merge(node);
    
    nodeUpdate.transition()
        .duration(500)
        .attr("transform", d => `translate(${d.x},${d.y})`);
    
    // Update expand button
    nodeUpdate.select('.expand-button text')
        .text(d => (d.children && d.children.length > 0) ? '−' : '+');
    
    nodeUpdate.select('.expand-button')
        .style('display', d => (d._children || (d.children && d.children.length > 0)) ? 'block' : 'none');
    
    // Update reports counter
    nodeUpdate.select('.reports-counter')
        .style('display', d => {
            const totalReports = (d._children ? d._children.length : 0) + (d.children ? d.children.length : 0);
            return totalReports > 0 ? 'block' : 'none';
        });
    
    nodeUpdate.select('.reports-counter text')
        .text(d => {
            const totalReports = (d._children ? d._children.length : 0) + (d.children ? d.children.length : 0);
            return totalReports > 99 ? '99+' : totalReports.toString();
        });
    
    // Remove exiting nodes
    node.exit().transition()
        .duration(500)
        .attr("transform", d => `translate(${source.x},${source.y})`)
        .style('opacity', 0)
        .remove();
    
    // Store positions for next time
    nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
    });
    
    console.log('PROFESSIONAL chart update complete - no overlapping cards');
}

// Create professional connecting lines between parent and child nodes
function createProfessionalLinkPath(parent, child) {
    if (!parent || !child) return '';
    
    const midY = (parent.y + child.y) / 2;
    
    return `M${parent.x},${parent.y + 42.5}
            L${parent.x},${midY}
            L${child.x},${midY}
            L${child.x},${child.y - 42.5}`;
}

// Toggle children on click - Professional version
function toggleProfessional(d) {
    console.log('Professional toggle called for:', d.data.name);
    
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }
    updateProfessionalChart(d);
}

// BACKWARD COMPATIBILITY - Use complete chart version
function updateChart(source) {
    return updateCompleteChart();
}

function updateProfessionalChart(source) {
    return updateCompleteChart();
}

function updateVerticalChart(source) {
    return updateCompleteChart();
}

function updateFlatChart() {
    return updateCompleteChart();
}

function toggle(d) {
    return handleCompleteNodeClick(d);
}

function toggleProfessional(d) {
    return handleCompleteNodeClick(d);
}

function toggleVertical(d) {
    return handleCompleteNodeClick(d);
}

function handleFlatNodeClick(d) {
    return handleCompleteNodeClick(d);
}

// Chart control functions - Updated for complete hierarchy
function expandAll() {
    console.log('Expand all - showing all immediate reports');
    // All immediate reports are already shown in the complete hierarchy
}

function collapseAll() {
    console.log('Collapse all - showing immediate reports only');
    // Always show immediate reports in complete hierarchy
}

function resetChart() {
    if (!globalTreeData) return;
    
    console.log('Resetting complete chart');
    renderOrgChart(globalTreeData);
}

// Enhanced highlighting functions with visual feedback
function highlightChampionConnections(champion) {
    clearHighlights();
    
    console.log('Highlighting connections for champion:', champion.name);
    console.log('Champion connections:', champion.connections);
    
    // Add visual highlight border to champion cards
    if (globalG) {
        globalG.selectAll('.node').each(function(d) {
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
                
                // Add champion badge
                const badgeGroup = d3.select(this).append('g')
                    .attr('class', 'champion-badge');
                
                badgeGroup.append('circle')
                    .attr('cx', -115)
                    .attr('cy', -30)
                    .attr('r', 12)
                    .style('fill', '#FFD700')
                    .style('stroke', '#ffffff')
                    .style('stroke-width', '2px');
                
                badgeGroup.append('text')
                    .attr('x', -115)
                    .attr('y', -25)
                    .attr('text-anchor', 'middle')
                    .style('font-family', 'Inter, sans-serif')
                    .style('font-size', '12px')
                    .style('font-weight', '700')
                    .style('fill', '#000000')
                    .text('★');
                
                console.log('Highlighted node:', personName, 'connected to champion:', champion.name);
            }
        });
    }
    
    highlightChampionOnMap(champion);
    
    // Show notification
    showHighlightNotification(champion);
    
    // Auto-clear highlights after 15 seconds
    setTimeout(clearHighlights, 15000);
}

// Show notification when champion is highlighted
function showHighlightNotification(champion) {
    // Remove existing notification
    const existingNotification = document.querySelector('.champion-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'champion-notification';
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #FFD700, #FFA500);
            color: #000;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(255, 215, 0, 0.3);
            z-index: 1000;
            font-family: 'Inter', sans-serif;
            font-weight: 600;
            max-width: 300px;
            animation: slideInFromRight 0.5s ease;
        ">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">★</span>
                <div>
                    <div style="font-size: 14px; margin-bottom: 4px;">
                        Champion: ${champion.name}
                    </div>
                    <div style="font-size: 12px; opacity: 0.8;">
                        ${champion.totalConnections} connections highlighted
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove notification
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
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
        
        // Remove champion badges
        globalG.selectAll('.champion-badge').remove();
        
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
    
    // Remove any notifications
    const notifications = document.querySelectorAll('.champion-notification');
    notifications.forEach(notification => notification.remove());
}

function highlightChampionOnMap(champion) {
    if (!map) return;
    
    const championLocations = [];
    champion.connections.forEach(connection => {
        if (!championLocations.includes(connection.location)) {
            championLocations.push(connection.location);
        }
    });
    
    map.eachLayer(function(layer) {
        if (layer instanceof L.CircleMarker) {
            const popup = layer.getPopup();
            const element = layer.getElement();
            
            if (popup && element) {
                const content = popup.getContent();
                let isHighlighted = false;
                
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

// Map rendering function
function renderMap(mapData) {
    if (map) {
        map.remove();
    }
    
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }
    
    console.log('Rendering map with data:', mapData);
    
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
                <h3 style="margin: 0 0 12px 0; color: #333; font-size: 1.1rem;">📍 ${location.location}</h3>
                <p style="margin: 0 0 10px 0; font-weight: 600; color: #555;"><strong>Total Employees:</strong> ${location.count}</p>
                
                ${connectionCounts.direct > 0 ? 
                    `<div style="background: #E8F5E8; padding: 8px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid #00C853;">
                        <strong style="color: #00A847;">🎯 Direct Connections: ${connectionCounts.direct}</strong>
                        <br><small style="color: #007233;">High priority sales opportunities!</small>
                    </div>` : ''}
                
                ${connectionCounts.indirect > 0 ? 
                    `<div style="background: #FFF8E1; padding: 8px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid #FF9800;">
                        <strong style="color: #E68900;">🤝 Indirect Connections: ${connectionCounts.indirect}</strong>
                        <br><small style="color: #CC7A00;">Good networking opportunities!</small>
                    </div>` : ''}
                
                ${connectionCounts.none > 0 ? 
                    `<div style="background: #F5F5F5; padding: 8px; border-radius: 6px; margin-bottom: 12px; border-left: 4px solid #757575;">
                        <strong style="color: #666;">❓ No Known Connections: ${connectionCounts.none}</strong>
                    </div>` : ''}
                
                <div style="max-height: 150px; overflow-y: auto; border-top: 1px solid #eee; padding-top: 8px;">
                    <strong style="color: #333; font-size: 0.9rem;">Team Members:</strong>
                    <ul style="margin: 6px 0 0 0; padding-left: 16px; font-size: 0.85rem;">
                        ${location.people.map(person => {
                            const relationship = person.relationship_with_qt || 'None';
                            let connectionIcon = '';
                            let textColor = '#333';
                            
                            if (relationship.toLowerCase() === 'direct') {
                                connectionIcon = '🎯 Direct';
                                textColor = '#00A847';
                            } else if (relationship.toLowerCase() === 'indirect') {
                                connectionIcon = '🤝 Indirect';
                                textColor = '#E68900';
                            } else {
                                connectionIcon = '❓ None';
                                textColor = '#666';
                            }
                            
                            return `<li style="margin-bottom: 4px; color: ${textColor};">
                                ${connectionIcon} - <strong>${person.name}</strong><br>
                                <small style="color: #666;">${person.position}</small>
                                ${person.representative_from_qt && person.representative_from_qt !== 'No' && person.representative_from_qt !== '' ? 
                                    `<br><small style="color: #4A90E2;">Via: ${person.representative_from_qt}</small>` : ''}
                            </li>`;
                        }).join('')}
                    </ul>
                </div>
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
}

// Additional utility functions for debugging
function debugOrgChart() {
    console.log('=== PROFESSIONAL CHART DEBUG INFO ===');
    console.log('Current person:', currentPerson);
    console.log('Global tree data:', globalTreeData);
    console.log('Global root:', globalRoot);
    if (globalRoot) {
        console.log('Total nodes in tree:', globalRoot.descendants().length);
        console.log('Visible nodes:', globalRoot.descendants().filter(d => d.parent === null || (d.parent.children && d.parent.children.includes(d))).length);
        console.log('Root children:', globalRoot.children ? globalRoot.children.length : 0);
        console.log('Root _children:', globalRoot._children ? globalRoot._children.length : 0);
    }
    console.log('Chart type: PROFESSIONAL CARDS');
    console.log('=====================================');
}

// Error handling wrapper for API calls
async function safeApiCall(url, errorMessage) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`${errorMessage}:`, error);
        alert(`${errorMessage}. Please check if the Flask server is running and try again.`);
        throw error;
    }
}

// Add window resize handler for responsive chart
window.addEventListener('resize', () => {
    if (globalTreeData && currentPerson) {
        setTimeout(() => {
            renderOrgChart(globalTreeData);
        }, 100);
    }
});

// Expose functions to window for console access and debugging
window.debugOrgChart = debugOrgChart;
window.expandAll = expandAll;
window.collapseAll = collapseAll;
window.resetChart = resetChart;

console.log('PROFESSIONAL JavaScript file loaded successfully - Chart will show large detailed cards with profile circles and autocomplete search');