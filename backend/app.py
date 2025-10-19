from flask import request
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import sqlite3
import qrcode
import json
import io
import base64

app = Flask(__name__)
CORS(app)

def init_db():
    conn = sqlite3.connect('lab_tracking.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS persons
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, 
                  phone TEXT, department TEXT, registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    c.execute('''CREATE TABLE IF NOT EXISTS lab_records
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, person_id INTEGER, lab_name TEXT NOT NULL,
                  entry_time TIMESTAMP, exit_time TIMESTAMP, FOREIGN KEY (person_id) REFERENCES persons (id))''')
    conn.commit()
    conn.close()

init_db()

@app.route('/api/register', methods=['POST'])
def register_person():
    data = request.json
    conn = sqlite3.connect('lab_tracking.db')
    c = conn.cursor()
    try:
        c.execute('INSERT INTO persons (name, email, phone, department) VALUES (?, ?, ?, ?)',
                 (data['name'], data['email'], data['phone'], data['department']))
        person_id = c.lastrowid
        conn.commit()
        
        qr_data = {'id': person_id, 'name': data['name'], 'email': data['email']}
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(json.dumps(qr_data))
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        qr_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        return jsonify({
            'success': True,
            'person_id': person_id,
            'qr_code': qr_base64,
            'message': 'Person registered successfully'
        })
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': 'Email already exists'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    finally:
        conn.close()

@app.route('/api/scan', methods=['POST'])
def scan_qr():
    data = request.json
    qr_content = data.get('qr_content')
    lab_name = data.get('lab_name', 'Main Lab')
    
    try:
        person_data = json.loads(qr_content)
        person_id = person_data['id']
        
        conn = sqlite3.connect('lab_tracking.db')
        c = conn.cursor()
        
        c.execute('SELECT id FROM lab_records WHERE person_id = ? AND exit_time IS NULL', (person_id,))
        open_session = c.fetchone()
        
        if open_session:
            c.execute('UPDATE lab_records SET exit_time = ? WHERE id = ?', 
                     (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), open_session[0]))
            action = 'exit'
        else:
            c.execute('INSERT INTO lab_records (person_id, lab_name, entry_time) VALUES (?, ?, ?)', 
                     (person_id, lab_name, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
            action = 'entry'
        
        conn.commit()
        c.execute('SELECT name, email FROM persons WHERE id = ?', (person_id,))
        person = c.fetchone()
        conn.close()
        
        return jsonify({
            'success': True,
            'action': action,
            'person': {'name': person[0], 'email': person[1]},
            'lab_name': lab_name,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/records', methods=['GET'])
def get_records():
    conn = sqlite3.connect('lab_tracking.db')
    c = conn.cursor()
    c.execute('''SELECT lr.id, p.name, p.email, lr.lab_name, lr.entry_time, lr.exit_time 
                 FROM lab_records lr JOIN persons p ON lr.person_id = p.id ORDER BY lr.entry_time DESC''')
    records = [{'id': row[0], 'name': row[1], 'email': row[2], 'lab_name': row[3], 'entry_time': row[4], 'exit_time': row[5]} for row in c.fetchall()]
    conn.close()
    return jsonify(records)

@app.route('/api/current_lab_status', methods=['GET'])
def get_current_lab_status():
    conn = sqlite3.connect('lab_tracking.db')
    c = conn.cursor()
    c.execute('''SELECT lr.lab_name, p.name, p.email, lr.entry_time FROM lab_records lr
                 JOIN persons p ON lr.person_id = p.id WHERE lr.exit_time IS NULL ORDER BY lr.entry_time DESC''')
    current_occupants = [{'lab_name': row[0], 'name': row[1], 'email': row[2], 'entry_time': row[3]} for row in c.fetchall()]
    
    c.execute('''SELECT lr.lab_name, p.name, MAX(lr.exit_time) as last_exit FROM lab_records lr
                 JOIN persons p ON lr.person_id = p.id WHERE lr.exit_time IS NOT NULL GROUP BY p.id ORDER BY last_exit DESC''')
    last_exits = [{'lab_name': row[0], 'name': row[1], 'last_exit': row[2]} for row in c.fetchall()]
    conn.close()
    
    return jsonify({'current_occupants': current_occupants, 'last_exits': last_exits})

@app.route('/api/records/<int:record_id>', methods=['DELETE'])
def delete_record(record_id):
    conn = sqlite3.connect('lab_tracking.db')
    c = conn.cursor()
    try:
        c.execute('DELETE FROM lab_records WHERE id = ?', (record_id,))
        conn.commit()
        return jsonify({'success': True, 'message': 'Record deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    finally:
        conn.close()

@app.route('/api/records', methods=['DELETE'])
def delete_all_records():
    conn = sqlite3.connect('lab_tracking.db')
    c = conn.cursor()
    try:
        c.execute('DELETE FROM lab_records')
        conn.commit()
        return jsonify({'success': True, 'message': 'All records deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    finally:
        conn.close()

@app.route('/api/person/<int:person_id>', methods=['GET'])
def get_person_by_id(person_id):
    conn = sqlite3.connect('lab_tracking.db')
    c = conn.cursor()
    
    try:
        # Get person details from persons table
        c.execute('SELECT id, name, email, phone, department FROM persons WHERE id = ?', (person_id,))
        person = c.fetchone()
        
        if person:
            return jsonify({
                'success': True,
                'person': {
                    'id': person[0],
                    'name': person[1],
                    'email': person[2],
                    'phone': person[3],
                    'department': person[4]
                }
            })
        else:
            return jsonify({
                'success': False,
                'message': f'No person found with ID: {person_id}'
            })
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)

    