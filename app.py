# Install required packages:
# pip install flask pandas openpyxl requests Office365-REST-Python-Client werkzeug

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

# Office365/SharePoint integration (optional)
try:
    from office365.runtime.auth.authentication_context import AuthenticationContext
    from office365.sharepoint.client_context import ClientContext
    from office365.sharepoint.files.file import File
    SHAREPOINT_AVAILABLE = True
except ImportError:
    SHAREPOINT_AVAILABLE = False
    print("Office365 library not installed. SharePoint integration disabled.")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}

# SharePoint Configuration (set these if using SharePoint)
SHAREPOINT_URL = None  # e.g., "https://yourcompany.sharepoint.com/sites/yoursite"
SHAREPOINT_USERNAME = None
SHAREPOINT_PASSWORD = None
SHAREPOINT_FOLDER = "Shared Documents/OrgData"  # Folder path in SharePoint

# Google Apps Script URL (for connections)
GOOGLE_SCRIPT_URL = None

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Global variables
company_data = []
new_connections = []
excel_file_path = None

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_data_from_excel(file_path=None):
    """Load organizational data from Excel file"""
    global company_data, excel_file_path
    
    if file_path:
        excel_file_path = file_path
    elif excel_file_path and os.path.exists(excel_file_path):
        file_path = excel_file_path
    else:
        # Fallback to sample data if no Excel file
        logger.info("No Excel file found, using sample data")
        company_data = load_sample_data()
        return
    
    try:
        logger.info(f"Loading data from Excel file: {file_path}")
        
        # Read Excel file
        df = pd.read_excel(file_path)
        
        # Expected columns mapping
        column_mapping = {
            'name': ['Name', 'Employee Name', 'Full Name'],
            'position': ['Position', 'Job Title', 'Title', 'Role'],
            'department': ['Department', 'Dept', 'Division'],
            'country': ['Country', 'Nation'],
            'location_input': ['Location', 'City', 'Office'],
            'manager_name': ['Manager', 'Manager Name', 'Reports To'],
            'relationship_with_qt': ['Relationship', 'Connection Type', 'QT Relationship'],
            'representative_from_qt': ['Representative', 'Rep', 'QT Rep'],
            'ldap': ['LDAP', 'Username', 'Login'],
            'moma_url': ['MOMA URL', 'Profile URL', 'MOMA Link'],
            'manager_email': ['Manager Email', 'Manager Mail']
        }
        
        # Normalize column names
        normalized_data = []
        for _, row in df.iterrows():
            employee = {}
            
            # Map columns to standard names
            for standard_name, possible_names in column_mapping.items():
                value = None
                for possible_name in possible_names:
                    if possible_name in df.columns:
                        value = row[possible_name]
                        break
                
                # Handle NaN values
                if pd.isna(value):
                    value = '' if standard_name in ['manager_name', 'manager_email', 'ldap', 'moma_url'] else 'Unknown'
                
                employee[standard_name] = str(value).strip() if value else ''
            
            # Add additional fields
            employee.update({
                'moma_photo_url': f"https://example.com/photos/{employee.get('ldap', 'default')}.jpg",
                'manager_name_input': employee.get('manager_name', ''),
                'time_of_run': datetime.now().strftime('%Y-%m-%d'),
            })
            
            normalized_data.append(employee)
        
        company_data = normalized_data
        logger.info(f"Successfully loaded {len(company_data)} employees from Excel")
        
    except Exception as e:
        logger.error(f"Error loading Excel file: {str(e)}")
        # Fallback to sample data
        company_data = load_sample_data()

def save_data_to_excel(file_path=None):
    """Save current organizational data to Excel file"""
    global excel_file_path
    
    if not file_path:
        file_path = excel_file_path or os.path.join(UPLOAD_FOLDER, 'organization_data.xlsx')
    
    try:
        # Convert data to DataFrame
        df = pd.DataFrame(company_data)
        
        # Reorder columns for better readability
        column_order = [
            'name', 'position', 'department', 'country', 'location_input',
            'manager_name', 'relationship_with_qt', 'representative_from_qt',
            'ldap', 'moma_url', 'manager_email'
        ]
        
        # Ensure all columns exist
        for col in column_order:
            if col not in df.columns:
                df[col] = ''
        
        df = df[column_order]
        
        # Rename columns for Excel
        df.columns = [
            'Name', 'Position', 'Department', 'Country', 'Location',
            'Manager Name', 'QT Relationship', 'QT Representative',
            'LDAP', 'MOMA URL', 'Manager Email'
        ]
        
        # Save to Excel
        df.to_excel(file_path, index=False, engine='openpyxl')
        logger.info(f"Data saved to Excel file: {file_path}")
        
        # Upload to SharePoint if configured
        if SHAREPOINT_AVAILABLE and SHAREPOINT_URL:
            upload_to_sharepoint(file_path)
        
        return file_path
        
    except Exception as e:
        logger.error(f"Error saving to Excel: {str(e)}")
        return None

def upload_to_sharepoint(file_path):
    """Upload Excel file to SharePoint"""
    if not (SHAREPOINT_URL and SHAREPOINT_USERNAME and SHAREPOINT_PASSWORD):
        logger.info("SharePoint credentials not configured")
        return False
    
    try:
        # Authenticate with SharePoint
        auth_context = AuthenticationContext(SHAREPOINT_URL)
        auth_context.acquire_token_for_user(SHAREPOINT_USERNAME, SHAREPOINT_PASSWORD)
        
        ctx = ClientContext(SHAREPOINT_URL, auth_context)
        
        # Upload file
        with open(file_path, 'rb') as file_content:
            file_name = os.path.basename(file_path)
            target_url = f"{SHAREPOINT_FOLDER}/{file_name}"
            
            File.save_binary(ctx, target_url, file_content.read())
            logger.info(f"File uploaded to SharePoint: {target_url}")
            return True
            
    except Exception as e:
        logger.error(f"Error uploading to SharePoint: {str(e)}")
        return False

def load_sample_data():
    """Fallback sample data if no Excel file is available"""
    return [
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
        # Add more sample data as needed...
    ]

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

def add_connection_to_google_sheets(connection_data):
    """Send connection data to Google Apps Script (if configured)"""
    if not GOOGLE_SCRIPT_URL:
        return False
    
    try:
        response = requests.post(
            GOOGLE_SCRIPT_URL,
            json=connection_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            return result.get('success', False)
        return False
            
    except Exception as e:
        logger.error(f"Error sending to Google Sheets: {str(e)}")
        return False

# Initialize data on startup
load_data_from_excel()

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
        sheets_success = add_connection_to_google_sheets(connection_data)
        
        print("=" * 60)
        print("NEW CONNECTION ADDED:")
        print("=" * 60)
        print(f"Name: {connection_data.get('name', 'N/A')}")
        print(f"Email: {connection_data.get('email', 'N/A')}")
        print(f"Designation: {connection_data.get('designation', 'N/A')}")
        print(f"Connection Champion: {connection_data.get('connectionChampion', 'N/A')}")
        print(f"Google Sheets: {'✓ Success' if sheets_success else '✗ Not configured'}")
        print("=" * 60)
        
        return jsonify({
            'success': True,
            'message': 'Connection added successfully',
            'data': connection_data,
            'sheets_updated': sheets_success,
            'total_connections': len(new_connections)
        })
    
    except Exception as e:
        logger.error(f"Error adding connection: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to add connection', 'error': str(e)}), 500

@app.route('/api/update-structure', methods=['POST'])
def update_structure():
    """Update organizational structure"""
    try:
        data = request.get_json()
        action = data.get('action')
        
        if action == 'change_manager':
            employee_name = data.get('employeeName')
            new_manager_name = data.get('newManagerName')
            
            # Find and update employee
            for person in company_data:
                if person['name'] == employee_name:
                    person['manager_name'] = new_manager_name
                    person['manager_name_input'] = new_manager_name
                    break
            
            # Save changes to Excel
            save_data_to_excel()
            
            print("=" * 60)
            print("MANAGER ASSIGNMENT CHANGED:")
            print("=" * 60)
            print(f"Employee: {employee_name}")
            print(f"New Manager: {new_manager_name}")
            print("=" * 60)
            
            return jsonify({'success': True, 'message': 'Manager assignment updated successfully'})
        
        elif action == 'add_employee':
            new_employee = {
                'name': data.get('name'),
                'position': data.get('position'),
                'department': data.get('department'),
                'country': data.get('country'),
                'location_input': data.get('location'),
                'manager_name': data.get('managerName'),
                'manager_name_input': data.get('managerName'),
                'ldap': data.get('name', '').lower().replace(' ', '.'),
                'moma_url': f"https://example.com/{data.get('name', '').lower().replace(' ', '.')}",
                'manager_email': '',
                'moma_photo_url': '',
                'time_of_run': datetime.now().strftime('%Y-%m-%d'),
                'relationship_with_qt': 'None',
                'representative_from_qt': 'No'
            }
            
            company_data.append(new_employee)
            save_data_to_excel()
            
            print("=" * 60)
            print("NEW EMPLOYEE ADDED:")
            print("=" * 60)
            print(f"Name: {new_employee['name']}")
            print(f"Position: {new_employee['position']}")
            print(f"Department: {new_employee['department']}")
            print(f"Manager: {new_employee['manager_name']}")
            print("=" * 60)
            
            return jsonify({'success': True, 'message': 'Employee added successfully'})
        
        else:
            return jsonify({'success': False, 'message': 'Invalid action'}), 400
    
    except Exception as e:
        logger.error(f"Error updating structure: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to update structure', 'error': str(e)}), 500

@app.route('/api/upload-structure', methods=['POST'])
def upload_structure():
    """Upload and process Excel file with organizational data"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'message': 'Invalid file type'}), 400
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        
        # Load data from uploaded file
        load_data_from_excel(file_path)
        
        print("=" * 60)
        print("ORGANIZATIONAL DATA UPLOADED:")
        print("=" * 60)
        print(f"File: {filename}")
        print(f"Employees loaded: {len(company_data)}")
        print("=" * 60)
        
        return jsonify({
            'success': True,
            'message': f'File processed successfully. Loaded {len(company_data)} employees.',
            'employees_count': len(company_data)
        })
    
    except Exception as e:
        logger.error(f"Error processing uploaded file: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to process file', 'error': str(e)}), 500

@app.route('/api/download-structure')
def download_structure():
    """Download current organizational structure as Excel file"""
    try:
        # Create Excel file in memory
        output = io.BytesIO()
        
        # Convert data to DataFrame
        df = pd.DataFrame(company_data)
        
        # Reorder columns
        column_order = [
            'name', 'position', 'department', 'country', 'location_input',
            'manager_name', 'relationship_with_qt', 'representative_from_qt'
        ]
        
        for col in column_order:
            if col not in df.columns:
                df[col] = ''
        
        df = df[column_order]
        df.columns = [
            'Name', 'Position', 'Department', 'Country', 'Location',
            'Manager Name', 'QT Relationship', 'QT Representative'
        ]
        
        # Write to Excel
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Organization Data', index=False)
        
        output.seek(0)
        
        return send_file(
            io.BytesIO(output.read()),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'organization_structure_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        )
    
    except Exception as e:
        logger.error(f"Error creating download file: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to create download file'}), 500

@app.route('/api/connections')
def get_connections():
    """Get all stored connections"""
    return jsonify({
        'success': True,
        'connections': new_connections,
        'total': len(new_connections)
    })

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
        }
    })

@app.route('/api/system-info')
def get_system_info():
    """Get system information and data source details"""
    data_source = "Excel File" if excel_file_path else "Sample Data"
    
    return jsonify({
        'success': True,
        'data_source': data_source,
        'excel_file': os.path.basename(excel_file_path) if excel_file_path else None,
        'total_employees': len(company_data),
        'last_updated': datetime.now().isoformat(),
        'sharepoint_enabled': SHAREPOINT_AVAILABLE and bool(SHAREPOINT_URL),
        'upload_folder': UPLOAD_FOLDER,
        'supported_formats': list(ALLOWED_EXTENSIONS)
    })

@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'employees_loaded': len(company_data),
        'new_connections': len(new_connections),
        'excel_file_configured': excel_file_path is not None,
        'sharepoint_available': SHAREPOINT_AVAILABLE,
        'version': '2.0.0'
    })

if __name__ == '__main__':
    logger.info("Starting Smart Stakeholder Search Flask application with Excel integration...")
    logger.info(f"Loaded {len(company_data)} employees")
    
    print("\n" + "="*60)
    print("SMART STAKEHOLDER SEARCH v2.0 - SERVER STARTED")
    print("="*60)
    print(f"Server running at: http://localhost:8080")
    print(f"Landing page: http://localhost:8080/")
    print(f"Explore org: http://localhost:8080/explore")
    print(f"Add connections: http://localhost:8080/add-connection")
    print(f"Manage structure: http://localhost:8080/manage-structure")
    print(f"Excel integration: {'Enabled' if excel_file_path else 'Fallback to sample data'}")
    print(f"SharePoint integration: {'Available' if SHAREPOINT_AVAILABLE else 'Not installed'}")
    print("="*60)
    
    app.run(debug=True, port=8080)