# Enhanced Flask App with SharePoint Integration
# pip install flask pandas openpyxl requests Office365-REST-Python-Client werkzeug msal

from flask import Flask, render_template, request, jsonify, send_file
import pandas as pd
import json
from collections import defaultdict
import os
import logging
from datetime import datetime
import requests
from werkzeug.utils import secure_filename
import openpyxl
from openpyxl import Workbook
import io
import random

# SharePoint and Microsoft Graph integration
try:
    from office365.runtime.auth.authentication_context import AuthenticationContext
    from office365.sharepoint.client_context import ClientContext
    from office365.sharepoint.files.file import File
    import msal
    SHAREPOINT_AVAILABLE = True
except ImportError:
    SHAREPOINT_AVAILABLE = False
    print("SharePoint libraries not installed. Install with: pip install Office365-REST-Python-Client msal")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}

# SharePoint Configuration
SHAREPOINT_CONFIG = {
    'site_url': 'https://ibase1-my.sharepoint.com.mcas.ms',
    'tenant_id': 'YOUR_TENANT_ID',
    'client_id': 'YOUR_CLIENT_ID',
    'client_secret': 'YOUR_CLIENT_SECRET',
    'file_url': '/personal/mayank_arya_qualitestgroup_com/_layouts/15/Doc.aspx?sourcedoc=%7BC78EB499-DAA9-47ED-AEDF-6888F709B3E0%7D&file=Profiles.xlsx',
    'direct_file_path': '/personal/mayank_arya_qualitestgroup_com/Documents/Profiles.xlsx',
    'username': 'sohail.islam@qualitestgroup.com',
    'password': 'YOUR_PASSWORD'
}

# QT Representatives (Connection Champions)
QT_REPRESENTATIVES = ['Lihi Segev', 'Abhijeet Bagade', 'Omri Nissim', 'Kobi Kol', 'Jillian OrRico', 'Michael Bush', 'Mayank Arya']

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Global variables
company_data = []
new_connections = []
sharepoint_last_sync = None

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def connect_to_sharepoint():
    """Establish connection to SharePoint"""
    try:
        if not SHAREPOINT_AVAILABLE:
            logger.error("SharePoint libraries not available")
            return None
            
        # Method 1: Using Authentication Context (Username/Password)
        auth_context = AuthenticationContext(SHAREPOINT_CONFIG['site_url'])
        
        if auth_context.acquire_token_for_user(
            SHAREPOINT_CONFIG['username'], 
            SHAREPOINT_CONFIG['password']
        ):
            ctx = ClientContext(SHAREPOINT_CONFIG['site_url'], auth_context)
            logger.info("Successfully connected to SharePoint")
            return ctx
        else:
            logger.error("Failed to authenticate with SharePoint")
            return None
            
    except Exception as e:
        logger.error(f"SharePoint connection error: {str(e)}")
        return None

def download_sharepoint_file():
    """Download the Excel file from SharePoint"""
    try:
        ctx = connect_to_sharepoint()
        if not ctx:
            logger.error("Could not establish SharePoint connection")
            return None
            
        # Try to get the file
        file_url = SHAREPOINT_CONFIG['direct_file_path']
        
        logger.info(f"Attempting to download file: {file_url}")
        
        # Download file content
        file_response = File.open_binary(ctx, file_url)
        
        if file_response:
            # Save to local temp file
            temp_file_path = os.path.join(UPLOAD_FOLDER, 'sharepoint_profiles.xlsx')
            
            with open(temp_file_path, 'wb') as local_file:
                local_file.write(file_response.content)
            
            logger.info(f"Successfully downloaded SharePoint file to: {temp_file_path}")
            return temp_file_path
        else:
            logger.error("Failed to download file from SharePoint")
            return None
            
    except Exception as e:
        logger.error(f"Error downloading SharePoint file: {str(e)}")
        return None

def load_data_from_sharepoint():
    """Load organizational data directly from SharePoint Excel file"""
    global company_data, sharepoint_last_sync
    
    try:
        logger.info("Loading data from SharePoint...")
        
        # Download file from SharePoint
        file_path = download_sharepoint_file()
        
        if not file_path or not os.path.exists(file_path):
            logger.error("Failed to download SharePoint file, using fallback data")
            company_data = load_fallback_data()
            return
        
        # Read the Excel file
        df = pd.read_excel(file_path)
        
        logger.info(f"Loaded Excel file with {len(df)} rows and columns: {list(df.columns)}")
        
        # Column mapping for flexible Excel structure
        column_mapping = {
            'name': ['Name', 'Full Name', 'Employee Name', 'name', 'employee_name'],
            'position': ['Position', 'Title', 'Job Title', 'Role', 'position', 'job_title'],
            'department': ['Department', 'Dept', 'Division', 'Team', 'department'],
            'country': ['Country', 'Nation', 'country'],
            'location_input': ['Location', 'City', 'Office', 'Site', 'location'],
            'manager_name': ['Manager', 'Manager Name', 'Reports To', 'manager', 'manager_name'],
            'ldap': ['LDAP', 'Email', 'Username', 'Login', 'ldap', 'email'],
            'phone': ['Phone', 'Mobile', 'Contact', 'phone_number'],
            'hire_date': ['Hire Date', 'Start Date', 'Join Date', 'hire_date'],
            'employee_id': ['ID', 'Employee ID', 'EmpID', 'employee_id']
        }
        
        normalized_data = []
        
        for index, row in df.iterrows():
            employee = {}
            
            # Map columns to standard names
            for standard_name, possible_names in column_mapping.items():
                value = None
                for possible_name in possible_names:
                    if possible_name in df.columns:
                        value = row[possible_name]
                        break
                
                # Handle NaN/empty values
                if pd.isna(value) or value == '' or str(value).lower() in ['nan', 'none', 'null']:
                    if standard_name in ['manager_name', 'ldap', 'phone', 'hire_date', 'employee_id']:
                        value = ''
                    elif standard_name in ['department', 'position', 'country', 'location_input']:
                        value = 'Unknown'
                    else:
                        value = ''
                
                employee[standard_name] = str(value).strip() if value else ''
            
            # Auto-generate missing fields
            if not employee.get('ldap') and employee.get('name'):
                # Generate LDAP from name
                name_parts = employee['name'].lower().split()
                if len(name_parts) >= 2:
                    employee['ldap'] = f"{name_parts[0]}.{name_parts[-1]}"
                else:
                    employee['ldap'] = employee['name'].lower().replace(' ', '.')
            
            # Randomly assign QT representative and relationship
            employee['representative_from_qt'] = random.choice(QT_REPRESENTATIVES)
            employee['relationship_with_qt'] = random.choices(
                ['Direct', 'Indirect', 'None'], 
                weights=[0.15, 0.25, 0.60]
            )[0]
            
            # Add additional required fields
            employee.update({
                'moma_url': f"https://moma.corp.company.com/person/{employee.get('ldap', 'unknown')}",
                'moma_photo_url': f"https://moma.corp.company.com/photos/{employee.get('ldap', 'unknown')}.jpg",
                'manager_name_input': employee.get('manager_name', ''),
                'manager_email': f"{employee.get('manager_name', '').lower().replace(' ', '.')}@company.com" if employee.get('manager_name') else '',
                'time_of_run': datetime.now().strftime('%Y-%m-%d')
            })
            
            normalized_data.append(employee)
        
        company_data = normalized_data
        sharepoint_last_sync = datetime.now()
        
        # Print summary
        print("=" * 60)
        print("SHAREPOINT DATA LOADED SUCCESSFULLY")
        print("=" * 60)
        print(f"Total employees: {len(company_data)}")
        print(f"Departments: {len(set(emp.get('department', 'Unknown') for emp in company_data))}")
        print(f"Countries: {len(set(emp.get('country', 'Unknown') for emp in company_data))}")
        print(f"Last sync: {sharepoint_last_sync}")
        
        # QT Representative distribution
        qt_dist = {}
        rel_dist = {}
        for emp in company_data:
            rep = emp.get('representative_from_qt', 'Unknown')
            rel = emp.get('relationship_with_qt', 'Unknown')
            qt_dist[rep] = qt_dist.get(rep, 0) + 1
            rel_dist[rel] = rel_dist.get(rel, 0) + 1
        
        print("\nQT Representative Distribution:")
        for rep, count in sorted(qt_dist.items()):
            print(f"  {rep}: {count} employees")
        
        print("\nRelationship Distribution:")
        for rel, count in sorted(rel_dist.items()):
            print(f"  {rel}: {count} employees")
        print("=" * 60)
        
        logger.info(f"Successfully loaded {len(company_data)} employees from SharePoint")
        
    except Exception as e:
        logger.error(f"Error loading from SharePoint: {str(e)}")
        print(f"SharePoint load failed: {str(e)}")
        print("Loading fallback data...")
        company_data = load_fallback_data()

def load_fallback_data():
    """Fallback data when SharePoint is not available"""
    print("=" * 60)
    print("USING FALLBACK DATA - SHAREPOINT NOT AVAILABLE")
    print("=" * 60)
    print("To use live SharePoint data, please:")
    print("1. Update SharePoint credentials in SHAREPOINT_CONFIG")
    print("2. Ensure you have access to the SharePoint file")
    print("3. Install required packages: pip install Office365-REST-Python-Client msal")
    print("=" * 60)
    
    return [
        {
            'name': 'Mayank Arya',
            'position': 'SharePoint Administrator',
            'department': 'IT',
            'country': 'India',
            'ldap': 'mayank.arya',
            'moma_url': 'https://moma.corp.company.com/person/mayank.arya',
            'manager_name': '',
            'manager_email': '',
            'moma_photo_url': 'https://moma.corp.company.com/photos/mayank.arya.jpg',
            'manager_name_input': '',
            'location_input': 'Mumbai',
            'time_of_run': datetime.now().strftime('%Y-%m-%d'),
            'relationship_with_qt': 'Direct',
            'representative_from_qt': 'Mayank Arya'
        }
    ]

def sync_sharepoint_data():
    """Manual sync function to refresh data from SharePoint"""
    logger.info("Manual SharePoint sync requested")
    load_data_from_sharepoint()

def build_hierarchy_tree(data, root_person=None):
    """Build a hierarchical tree structure from flat data"""
    person_dict = {person['name']: person for person in data}
    children_dict = defaultdict(list)
    
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
        
        for child_name in sorted(children_dict.get(person_name, [])):
            child_node = build_node(child_name)
            if child_node:
                node['children'].append(child_node)
        
        return node
    
    if root_person:
        return build_node(root_person)
    else:
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

# Initialize data on startup
load_data_from_sharepoint()

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

@app.route('/manage-structure')
def manage_structure():
    """Manage reporting structure page"""
    return render_template('manage_structure.html')

@app.route('/api/sync-sharepoint', methods=['POST'])
def sync_sharepoint():
    """Manually sync data from SharePoint"""
    try:
        sync_sharepoint_data()
        return jsonify({
            'success': True,
            'message': f'SharePoint sync completed. Loaded {len(company_data)} employees.',
            'last_sync': sharepoint_last_sync.isoformat() if sharepoint_last_sync else None,
            'employees_count': len(company_data)
        })
    except Exception as e:
        logger.error(f"Error syncing SharePoint: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'SharePoint sync failed: {str(e)}'
        }), 500

@app.route('/api/search')
def search():
    """Search for employees with optional filters"""
    query = request.args.get('q', '').lower().strip()
    department_filter = request.args.get('department', '').strip()
    country_filter = request.args.get('country', '').strip()
    
    filtered_data = company_data.copy()
    
    if query:
        filtered_data = [
            person for person in filtered_data
            if (query in person['name'].lower() or 
                query in person['department'].lower() or
                query in person['position'].lower() or
                query in person.get('location_input', '').lower())
        ]
    
    if department_filter:
        filtered_data = [person for person in filtered_data if person['department'] == department_filter]
    
    if country_filter:
        filtered_data = [person for person in filtered_data if person['country'] == country_filter]
    
    filtered_data.sort(key=lambda x: x['name'])
    return jsonify(filtered_data)

@app.route('/api/hierarchy/<person_name>')
def get_hierarchy(person_name):
    """Get organizational hierarchy for a specific person"""
    person = None
    for p in company_data:
        if normalize_name(p['name']) == normalize_name(person_name):
            person = p
            break
    
    if not person:
        return jsonify({'error': 'Person not found'}), 404
    
    subordinates = get_all_subordinates(person['name'], company_data)
    all_people = [person] + subordinates
    hierarchy = build_hierarchy_tree(all_people, person['name'])
    
    if not hierarchy:
        return jsonify({'error': 'Could not build hierarchy'}), 500
    
    return jsonify(hierarchy)

@app.route('/api/map-data/<person_name>')
def get_map_data(person_name):
    """Get geographic distribution data for map visualization"""
    person = None
    for p in company_data:
        if normalize_name(p['name']) == normalize_name(person_name):
            person = p
            break
    
    if not person:
        return jsonify({'error': 'Person not found'}), 404
    
    subordinates = get_all_subordinates(person['name'], company_data)
    all_people = [person] + subordinates
    
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
    
    map_data = []
    for location, people in location_data.items():
        map_data.append({
            'location': location,
            'count': len(people),
            'people': people,
            'country': people[0]['country'] if people else ''
        })
    
    map_data.sort(key=lambda x: x['count'], reverse=True)
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
    """Add a new connection and store it"""
    try:
        connection_data = request.get_json()
        
        if not connection_data:
            return jsonify({'success': False, 'message': 'No data received'}), 400
        
        connection_data['id'] = len(new_connections) + 1
        connection_data['created_at'] = datetime.now().isoformat()
        
        new_connections.append(connection_data)
        
        print("=" * 60)
        print("NEW CONNECTION ADDED:")
        print("=" * 60)
        print(f"Name: {connection_data.get('name', 'N/A')}")
        print(f"Email: {connection_data.get('email', 'N/A')}")
        print(f"Designation: {connection_data.get('designation', 'N/A')}")
        print(f"Connection Champion: {connection_data.get('connectionChampion', 'N/A')}")
        print("=" * 60)
        
        return jsonify({
            'success': True,
            'message': 'Connection added successfully',
            'data': connection_data,
            'total_connections': len(new_connections)
        })
    
    except Exception as e:
        logger.error(f"Error adding connection: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to add connection', 'error': str(e)}), 500

@app.route('/api/stats')
def get_stats():
    """Get overall statistics about the organization"""
    total_employees = len(company_data)
    departments = len(set(person['department'] for person in company_data))
    countries = len(set(person['country'] for person in company_data))
    
    direct_connections = len([p for p in company_data if p.get('relationship_with_qt', '').lower() == 'direct'])
    indirect_connections = len([p for p in company_data if p.get('relationship_with_qt', '').lower() == 'indirect'])
    no_connections = total_employees - direct_connections - indirect_connections
    
    return jsonify({
        'total_employees': total_employees,
        'departments': departments,
        'countries': countries,
        'connections': {
            'direct': direct_connections,
            'indirect': indirect_connections,
            'none': no_connections
        },
        'last_sync': sharepoint_last_sync.isoformat() if sharepoint_last_sync else None,
        'data_source': 'SharePoint' if sharepoint_last_sync else 'Fallback Data'
    })

@app.route('/api/system-info')
def get_system_info():
    """Get system information and data source details"""
    return jsonify({
        'success': True,
        'data_source': 'SharePoint' if sharepoint_last_sync else 'Fallback Data',
        'sharepoint_url': SHAREPOINT_CONFIG['file_url'],
        'total_employees': len(company_data),
        'last_updated': datetime.now().isoformat(),
        'last_sync': sharepoint_last_sync.isoformat() if sharepoint_last_sync else None,
        'sharepoint_available': SHAREPOINT_AVAILABLE,
        'qt_representatives': QT_REPRESENTATIVES
    })

@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'employees_loaded': len(company_data),
        'new_connections': len(new_connections),
        'sharepoint_connected': sharepoint_last_sync is not None,
        'last_sync': sharepoint_last_sync.isoformat() if sharepoint_last_sync else None,
        'version': '3.0.0-sharepoint'
    })

if __name__ == '__main__':
    logger.info("Starting Smart Stakeholder Search with SharePoint Integration...")
    logger.info(f"Loaded {len(company_data)} employees")
    
    print("\n" + "="*60)
    print("SMART STAKEHOLDER SEARCH v3.0 - SHAREPOINT EDITION")
    print("="*60)
    print(f"Server running at: http://localhost:8080")
    print(f"Landing page: http://localhost:8080/")
    print(f"Explore org: http://localhost:8080/explore")
    print(f"Add connections: http://localhost:8080/add-connection")
    print(f"Manage structure: http://localhost:8080/manage-structure")
    print(f"SharePoint integration: {'Enabled' if SHAREPOINT_AVAILABLE else 'Disabled - install libraries'}")
    print(f"Data source: {'SharePoint' if sharepoint_last_sync else 'Fallback data'}")
    print(f"Last sync: {sharepoint_last_sync or 'Never'}")
    print("="*60)
    
    if not SHAREPOINT_AVAILABLE:
        print("\nTo enable SharePoint integration:")
        print("pip install Office365-REST-Python-Client msal")
        print("Then update SHAREPOINT_CONFIG with your credentials")
    
    app.run(debug=True, port=8080)