from flask import Flask, render_template, request, jsonify
import pandas as pd
import json
from collections import defaultdict
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Sample data structure - comprehensive test data
def load_sample_data():
    """Load comprehensive test data with diverse global representation and realistic representative connections"""
    return [
        # Executive Level - USA
        {
            'name': 'Sarah Williams',
            'position': 'CEO',
            'department': 'Executive',
            'country': 'USA',
            'ldap': 'swilliams',
            'moma_url': 'https://example.com/swilliams',
            'manager_name': '',
            'manager_email': '',
            'moma_photo_url': 'https://example.com/photos/swilliams.jpg',
            'manager_name_input': '',
            'location_input': 'New York',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Direct',
            'representative_from_qt': 'Mayank'
        },
        
        # C-Suite - Different Countries
        {
            'name': 'James Thompson',
            'position': 'CTO',
            'department': 'Engineering',
            'country': 'UK',
            'ldap': 'jthompson',
            'moma_url': 'https://example.com/jthompson',
            'manager_name': 'Sarah Williams',
            'manager_email': 'swilliams@company.com',
            'moma_photo_url': 'https://example.com/photos/jthompson.jpg',
            'manager_name_input': 'Sarah Williams',
            'location_input': 'London',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Direct',
            'representative_from_qt': 'Mayank'
        },
        {
            'name': 'Maria Santos',
            'position': 'CFO',
            'department': 'Finance',
            'country': 'Portugal',
            'ldap': 'msantos',
            'moma_url': 'https://example.com/msantos',
            'manager_name': 'Sarah Williams',
            'manager_email': 'swilliams@company.com',
            'moma_photo_url': 'https://example.com/photos/msantos.jpg',
            'manager_name_input': 'Sarah Williams',
            'location_input': 'Lisbon',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Direct',
            'representative_from_qt': 'Mayank'
        },
        {
            'name': 'Klaus Mueller',
            'position': 'VP Operations',
            'department': 'Operations',
            'country': 'Germany',
            'ldap': 'kmueller',
            'moma_url': 'https://example.com/kmueller',
            'manager_name': 'Sarah Williams',
            'manager_email': 'swilliams@company.com',
            'moma_photo_url': 'https://example.com/photos/kmueller.jpg',
            'manager_name_input': 'Sarah Williams',
            'location_input': 'Berlin',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Direct',
            'representative_from_qt': 'Lihi'
        },
        {
            'name': 'Priya Sharma',
            'position': 'VP Marketing',
            'department': 'Marketing',
            'country': 'India',
            'ldap': 'psharma',
            'moma_url': 'https://example.com/psharma',
            'manager_name': 'Sarah Williams',
            'manager_email': 'swilliams@company.com',
            'moma_photo_url': 'https://example.com/photos/psharma.jpg',
            'manager_name_input': 'Sarah Williams',
            'location_input': 'Mumbai',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Direct',
            'representative_from_qt': 'Lihi'
        },
        # Engineering Team - UK
        {
            'name': 'Oliver Davis',
            'position': 'Engineering Director',
            'department': 'Engineering',
            'country': 'UK',
            'ldap': 'odavis',
            'moma_url': 'https://example.com/odavis',
            'manager_name': 'James Thompson',
            'manager_email': 'jthompson@company.com',
            'moma_photo_url': 'https://example.com/photos/odavis.jpg',
            'manager_name_input': 'James Thompson',
            'location_input': 'London',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Indirect',
            'representative_from_qt': 'Lihi'
        },
        {
            'name': 'Emma Wilson',
            'position': 'Senior Software Engineer',
            'department': 'Engineering',
            'country': 'UK',
            'ldap': 'ewilson',
            'moma_url': 'https://example.com/ewilson',
            'manager_name': 'Oliver Davis',
            'manager_email': 'odavis@company.com',
            'moma_photo_url': 'https://example.com/photos/ewilson.jpg',
            'manager_name_input': 'Oliver Davis',
            'location_input': 'London',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Indirect',
            'representative_from_qt': 'Mike'
        },
        {
            'name': 'Liam Brown',
            'position': 'DevOps Engineer',
            'department': 'Engineering',
            'country': 'UK',
            'ldap': 'lbrown',
            'moma_url': 'https://example.com/lbrown',
            'manager_name': 'Oliver Davis',
            'manager_email': 'odavis@company.com',
            'moma_photo_url': 'https://example.com/photos/lbrown.jpg',
            'manager_name_input': 'Oliver Davis',
            'location_input': 'Manchester',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'None',
            'representative_from_qt': 'No'
        },

        # Engineering Team - Germany
        {
            'name': 'Hans Weber',
            'position': 'Senior Backend Engineer',
            'department': 'Engineering',
            'country': 'Germany',
            'ldap': 'hweber',
            'moma_url': 'https://example.com/hweber',
            'manager_name': 'James Thompson',
            'manager_email': 'jthompson@company.com',
            'moma_photo_url': 'https://example.com/photos/hweber.jpg',
            'manager_name_input': 'James Thompson',
            'location_input': 'Berlin',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Indirect',
            'representative_from_qt': 'Dennis'
        },
        {
            'name': 'Anna Schmidt',
            'position': 'Frontend Developer',
            'department': 'Engineering',
            'country': 'Germany',
            'ldap': 'aschmidt',
            'moma_url': 'https://example.com/aschmidt',
            'manager_name': 'Hans Weber',
            'manager_email': 'hweber@company.com',
            'moma_photo_url': 'https://example.com/photos/aschmidt.jpg',
            'manager_name_input': 'Hans Weber',
            'location_input': 'Munich',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Indirect',
            'representative_from_qt': 'Dennis'
        },
        # Finance Team - Portugal
        {
            'name': 'João Silva',
            'position': 'Finance Director',
            'department': 'Finance',
            'country': 'Portugal',
            'ldap': 'jsilva',
            'moma_url': 'https://example.com/jsilva',
            'manager_name': 'Maria Santos',
            'manager_email': 'msantos@company.com',
            'moma_photo_url': 'https://example.com/photos/jsilva.jpg',
            'manager_name_input': 'Maria Santos',
            'location_input': 'Lisbon',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Indirect',
            'representative_from_qt': 'Matt'
        },
        {
            'name': 'Catarina Costa',
            'position': 'Financial Analyst',
            'department': 'Finance',
            'country': 'Portugal',
            'ldap': 'ccosta',
            'moma_url': 'https://example.com/ccosta',
            'manager_name': 'João Silva',
            'manager_email': 'jsilva@company.com',
            'moma_photo_url': 'https://example.com/photos/ccosta.jpg',
            'manager_name_input': 'João Silva',
            'location_input': 'Porto',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'None',
            'representative_from_qt': 'No'
        },

        # Marketing Team - India
        {
            'name': 'Rahul Patel',
            'position': 'Marketing Director',
            'department': 'Marketing',
            'country': 'India',
            'ldap': 'rpatel',
            'moma_url': 'https://example.com/rpatel',
            'manager_name': 'Priya Sharma',
            'manager_email': 'psharma@company.com',
            'moma_photo_url': 'https://example.com/photos/rpatel.jpg',
            'manager_name_input': 'Priya Sharma',
            'location_input': 'Mumbai',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Indirect',
            'representative_from_qt': 'Mike'
        },
        {
            'name': 'Deepika Singh',
            'position': 'Digital Marketing Manager',
            'department': 'Marketing',
            'country': 'India',
            'ldap': 'dsingh',
            'moma_url': 'https://example.com/dsingh',
            'manager_name': 'Rahul Patel',
            'manager_email': 'rpatel@company.com',
            'moma_photo_url': 'https://example.com/photos/dsingh.jpg',
            'manager_name_input': 'Rahul Patel',
            'location_input': 'Bangalore',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Direct',
            'representative_from_qt': 'Dennis'
        },
        {
            'name': 'Arjun Kumar',
            'position': 'Content Marketing Specialist',
            'department': 'Marketing',
            'country': 'India',
            'ldap': 'akumar',
            'moma_url': 'https://example.com/akumar',
            'manager_name': 'Deepika Singh',
            'manager_email': 'dsingh@company.com',
            'moma_photo_url': 'https://example.com/photos/akumar.jpg',
            'manager_name_input': 'Deepika Singh',
            'location_input': 'Delhi',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'None',
            'representative_from_qt': 'No'
        },

        # Operations Team - Germany
        {
            'name': 'Stefan Fischer',
            'position': 'Operations Manager',
            'department': 'Operations',
            'country': 'Germany',
            'ldap': 'sfischer',
            'moma_url': 'https://example.com/sfischer',
            'manager_name': 'Klaus Mueller',
            'manager_email': 'kmueller@company.com',
            'moma_photo_url': 'https://example.com/photos/sfischer.jpg',
            'manager_name_input': 'Klaus Mueller',
            'location_input': 'Berlin',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Indirect',
            'representative_from_qt': 'Lihi'
        },
        {
            'name': 'Petra Hoffman',
            'position': 'Supply Chain Coordinator',
            'department': 'Operations',
            'country': 'Germany',
            'ldap': 'phoffman',
            'moma_url': 'https://example.com/phoffman',
            'manager_name': 'Stefan Fischer',
            'manager_email': 'sfischer@company.com',
            'moma_photo_url': 'https://example.com/photos/phoffman.jpg',
            'manager_name_input': 'Stefan Fischer',
            'location_input': 'Hamburg',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'None',
            'representative_from_qt': 'No'
        },
        # Sales Team - USA
        {
            'name': 'Michael Johnson',
            'position': 'VP Sales',
            'department': 'Sales',
            'country': 'USA',
            'ldap': 'mjohnson',
            'moma_url': 'https://example.com/mjohnson',
            'manager_name': 'Sarah Williams',
            'manager_email': 'swilliams@company.com',
            'moma_photo_url': 'https://example.com/photos/mjohnson.jpg',
            'manager_name_input': 'Sarah Williams',
            'location_input': 'San Francisco',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Direct',
            'representative_from_qt': 'Matt'
        },
        {
            'name': 'Jennifer Garcia',
            'position': 'Sales Director',
            'department': 'Sales',
            'country': 'USA',
            'ldap': 'jgarcia',
            'moma_url': 'https://example.com/jgarcia',
            'manager_name': 'Michael Johnson',
            'manager_email': 'mjohnson@company.com',
            'moma_photo_url': 'https://example.com/photos/jgarcia.jpg',
            'manager_name_input': 'Michael Johnson',
            'location_input': 'Chicago',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Indirect',
            'representative_from_qt': 'Dennis'
        },
        {
            'name': 'Robert Lee',
            'position': 'Senior Sales Manager',
            'department': 'Sales',
            'country': 'USA',
            'ldap': 'rlee',
            'moma_url': 'https://example.com/rlee',
            'manager_name': 'Jennifer Garcia',
            'manager_email': 'jgarcia@company.com',
            'moma_photo_url': 'https://example.com/photos/rlee.jpg',
            'manager_name_input': 'Jennifer Garcia',
            'location_input': 'Austin',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Direct',
            'representative_from_qt': 'Mike'
        },

        # HR Team - UK & India
        {
            'name': 'Sophie Taylor',
            'position': 'VP Human Resources',
            'department': 'Human Resources',
            'country': 'UK',
            'ldap': 'staylor',
            'moma_url': 'https://example.com/staylor',
            'manager_name': 'Sarah Williams',
            'manager_email': 'swilliams@company.com',
            'moma_photo_url': 'https://example.com/photos/staylor.jpg',
            'manager_name_input': 'Sarah Williams',
            'location_input': 'London',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Direct',
            'representative_from_qt': 'Matt'
        },
        {
            'name': 'Ananya Gupta',
            'position': 'HR Business Partner',
            'department': 'Human Resources',
            'country': 'India',
            'ldap': 'agupta',
            'moma_url': 'https://example.com/agupta',
            'manager_name': 'Sophie Taylor',
            'manager_email': 'staylor@company.com',
            'moma_photo_url': 'https://example.com/photos/agupta.jpg',
            'manager_name_input': 'Sophie Taylor',
            'location_input': 'Chennai',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Indirect',
            'representative_from_qt': 'Dennis'
        },

        # Product Team - USA & Portugal
        {
            'name': 'David Chen',
            'position': 'VP Product',
            'department': 'Product',
            'country': 'USA',
            'ldap': 'dchen',
            'moma_url': 'https://example.com/dchen',
            'manager_name': 'Sarah Williams',
            'manager_email': 'swilliams@company.com',
            'moma_photo_url': 'https://example.com/photos/dchen.jpg',
            'manager_name_input': 'Sarah Williams',
            'location_input': 'Seattle',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Direct',
            'representative_from_qt': 'Matt'
        },
        {
            'name': 'Ricardo Oliveira',
            'position': 'Product Manager',
            'department': 'Product',
            'country': 'Portugal',
            'ldap': 'roliveira',
            'moma_url': 'https://example.com/roliveira',
            'manager_name': 'David Chen',
            'manager_email': 'dchen@company.com',
            'moma_photo_url': 'https://example.com/photos/roliveira.jpg',
            'manager_name_input': 'David Chen',
            'location_input': 'Braga',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Indirect',
            'representative_from_qt': 'Mike'
        },

        # Customer Support - Multiple locations
        {
            'name': 'Lisa Anderson',
            'position': 'VP Customer Success',
            'department': 'Customer Support',
            'country': 'USA',
            'ldap': 'landerson',
            'moma_url': 'https://example.com/landerson',
            'manager_name': 'Sarah Williams',
            'manager_email': 'swilliams@company.com',
            'moma_photo_url': 'https://example.com/photos/landerson.jpg',
            'manager_name_input': 'Sarah Williams',
            'location_input': 'Denver',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Direct',
            'representative_from_qt': 'Lihi'
        },
        {
            'name': 'Ravi Mehta',
            'position': 'Customer Support Manager',
            'department': 'Customer Support',
            'country': 'India',
            'ldap': 'rmehta',
            'moma_url': 'https://example.com/rmehta',
            'manager_name': 'Lisa Anderson',
            'manager_email': 'landerson@company.com',
            'moma_photo_url': 'https://example.com/photos/rmehta.jpg',
            'manager_name_input': 'Lisa Anderson',
            'location_input': 'Pune',
            'time_of_run': '2024-01-01',
            'relationship_with_qt': 'Indirect',
            'representative_from_qt': 'No'
        }
    ]

# Global variable to store data
company_data = load_sample_data()

def build_hierarchy_tree(data, root_person=None):
    """Build a hierarchical tree structure from flat data"""
    # Create lookup dictionaries
    person_dict = {person['name']: person for person in data}
    children_dict = defaultdict(list)
    
    # Build children relationships
    for person in data:
        manager = person.get('manager_name')
        if manager and manager in person_dict:
            children_dict[manager].append(person['name'])
    
    def build_node(person_name):
        if person_name not in person_dict:
            return None
            
        person = person_dict[person_name]
        node = {
            'name': person['name'],
            'position': person['position'],
            'department': person['department'],
            'country': person['country'],
            'location': person.get('location_input', ''),
            'photo_url': person.get('moma_photo_url', ''),
            'relationship_with_qt': person.get('relationship_with_qt', 'None'),
            'representative_from_qt': person.get('representative_from_qt', 'No'),
            'children': []
        }
        
        # Recursively build children
        for child_name in sorted(children_dict.get(person_name, [])):  # Sort for consistent ordering
            child_node = build_node(child_name)
            if child_node:
                node['children'].append(child_node)
        
        return node
    
    if root_person:
        return build_node(root_person)
    else:
        # Find root nodes (people with no managers or managers not in dataset)
        roots = []
        for person in data:
            manager = person.get('manager_name')
            if not manager or manager not in person_dict:
                root_node = build_node(person['name'])
                if root_node:
                    roots.append(root_node)
        return roots

def get_all_subordinates(person_name, data):
    """Get all people reporting under a person (direct and indirect)"""
    subordinates = []
    person_dict = {person['name']: person for person in data}
    
    def find_reports(manager_name):
        for person in data:
            if person.get('manager_name') == manager_name:
                subordinates.append(person)
                find_reports(person['name'])
    
    find_reports(person_name)
    return subordinates

def normalize_name(name):
    """Normalize name for comparison"""
    return name.lower().strip()

# Routes
@app.route('/')
def landing():
    """Landing page with navigation options"""
    return render_template('landing.html')

@app.route('/explore')
def explore():
    """Main organizational exploration page"""
    return render_template('index.html')

@app.route('/add-connection')
def add_connection():
    """Add connection page"""
    return render_template('add_connection.html')

@app.route('/api/search')
def search():
    """Search for employees with optional filters"""
    query = request.args.get('q', '').lower().strip()
    department_filter = request.args.get('department', '').strip()
    country_filter = request.args.get('country', '').strip()
    
    logger.info(f"Search request: query='{query}', department='{department_filter}', country='{country_filter}'")
    
    # Start with all data
    filtered_data = company_data.copy()
    
    # Apply search query filter
    if query:
        filtered_data = [
            person for person in filtered_data
            if (query in person['name'].lower() or 
                query in person['department'].lower() or
                query in person['position'].lower() or
                query in person.get('location_input', '').lower())
        ]
    
    # Apply department filter
    if department_filter:
        filtered_data = [person for person in filtered_data if person['department'] == department_filter]
    
    # Apply country filter
    if country_filter:
        filtered_data = [person for person in filtered_data if person['country'] == country_filter]
    
    logger.info(f"Search results: {len(filtered_data)} employees found")
    
    # Sort results by name for consistency
    filtered_data.sort(key=lambda x: x['name'])
    
    return jsonify(filtered_data)

@app.route('/api/hierarchy/<person_name>')
def get_hierarchy(person_name):
    """Get organizational hierarchy for a specific person"""
    logger.info(f"Hierarchy request for: {person_name}")
    
    # Find the person (case-insensitive)
    person = None
    for p in company_data:
        if normalize_name(p['name']) == normalize_name(person_name):
            person = p
            break
    
    if not person:
        logger.warning(f"Person not found: {person_name}")
        return jsonify({'error': 'Person not found'}), 404
    
    # Get all subordinates
    subordinates = get_all_subordinates(person['name'], company_data)
    
    # Build hierarchy tree starting from this person
    all_people = [person] + subordinates
    hierarchy = build_hierarchy_tree(all_people, person['name'])
    
    if not hierarchy:
        logger.warning(f"Could not build hierarchy for: {person_name}")
        return jsonify({'error': 'Could not build hierarchy'}), 500
    
    logger.info(f"Hierarchy built for {person_name}: {len(subordinates)} subordinates found")
    
    return jsonify(hierarchy)

@app.route('/api/map-data/<person_name>')
def get_map_data(person_name):
    """Get geographic distribution data for map visualization"""
    logger.info(f"Map data request for: {person_name}")
    
    # Find the person (case-insensitive)
    person = None
    for p in company_data:
        if normalize_name(p['name']) == normalize_name(person_name):
            person = p
            break
    
    if not person:
        logger.warning(f"Person not found for map data: {person_name}")
        return jsonify({'error': 'Person not found'}), 404
    
    subordinates = get_all_subordinates(person['name'], company_data)
    all_people = [person] + subordinates
    
    # Group by location for map visualization
    location_data = defaultdict(list)
    for p in all_people:
        location = p.get('location_input', 'Unknown')
        if not location or location.strip() == '':
            location = 'Unknown'
        location_data[location].append({
            'name': p['name'],
            'position': p['position'],
            'department': p['department'],
            'country': p['country'],
            'relationship_with_qt': p.get('relationship_with_qt', 'None'),
            'representative_from_qt': p.get('representative_from_qt', 'No')
        })
    
    # Convert to format suitable for map visualization
    map_data = []
    for location, people in location_data.items():
        map_data.append({
            'location': location,
            'count': len(people),
            'people': people,
            'country': people[0]['country'] if people else ''
        })
    
    # Sort by count for consistency
    map_data.sort(key=lambda x: x['count'], reverse=True)
    
    logger.info(f"Map data generated for {person_name}: {len(map_data)} locations")
    
    return jsonify(map_data)

@app.route('/api/filters')
def get_filters():
    """Get available filter options for departments and countries"""
    departments = list(set(person['department'] for person in company_data if person.get('department')))
    countries = list(set(person['country'] for person in company_data if person.get('country')))
    
    return jsonify({
        'departments': sorted(departments),
        'countries': sorted(countries)
    })

@app.route('/api/add-connection', methods=['POST'])
def add_connection_api():
    """Add a new connection (placeholder for future implementation)"""
    try:
        connection_data = request.get_json()
        logger.info(f"New connection data received: {connection_data}")
        
        # Here you would typically save to database
        # For now, just return success
        
        return jsonify({
            'success': True,
            'message': 'Connection added successfully',
            'data': connection_data
        })
    
    except Exception as e:
        logger.error(f"Error adding connection: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to add connection',
            'error': str(e)
        }), 500

@app.route('/api/stats')
def get_stats():
    """Get overall statistics about the organization"""
    total_employees = len(company_data)
    departments = len(set(person['department'] for person in company_data))
    countries = len(set(person['country'] for person in company_data))
    locations = len(set(person.get('location_input', 'Unknown') for person in company_data))
    
    # Connection statistics
    direct_connections = len([p for p in company_data if p.get('relationship_with_qt', '').lower() == 'direct'])
    indirect_connections = len([p for p in company_data if p.get('relationship_with_qt', '').lower() == 'indirect'])
    no_connections = total_employees - direct_connections - indirect_connections
    
    return jsonify({
        'total_employees': total_employees,
        'departments': departments,
        'countries': countries,
        'locations': locations,
        'connections': {
            'direct': direct_connections,
            'indirect': indirect_connections,
            'none': no_connections
        }
    })

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# Health check endpoint
@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'employees_loaded': len(company_data),
        'version': '1.0.0'
    })

if __name__ == '__main__':
    logger.info("Starting Smart Stakeholder Search Flask application...")
    logger.info(f"Loaded {len(company_data)} employees")
    
    # Print some startup info
    departments = set(person['department'] for person in company_data)
    countries = set(person['country'] for person in company_data)
    logger.info(f"Departments: {', '.join(sorted(departments))}")
    logger.info(f"Countries: {', '.join(sorted(countries))}")
    
    app.run(debug=True, port=5000)