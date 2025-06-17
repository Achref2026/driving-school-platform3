#!/usr/bin/env python3
"""Setup test data for the bug reproduction"""

import requests
import json
from io import BytesIO

BASE_URL = "http://localhost:8001/api"

def create_dummy_file():
    """Create a dummy file for testing"""
    return BytesIO(b"dummy file content for testing documents")

def setup_test_data():
    """Setup test users and driving school"""
    print("🔧 Setting up test data...")
    
    # 1. Register student
    print("\n1️⃣ Registering student...")
    student_data = {
        "email": "student@test.dz",
        "password": "student123",
        "first_name": "Test",
        "last_name": "Student",
        "phone": "1234567890",
        "address": "123 Test Street",
        "date_of_birth": "1990-01-01",
        "gender": "male",
        "state": "Alger"
    }
    
    files = {
        'profile_photo': ('test_photo.jpg', create_dummy_file(), 'image/jpeg')
    }
    
    student_response = requests.post(f"{BASE_URL}/auth/register", data=student_data, files=files)
    if student_response.status_code == 200:
        student_token = student_response.json()['access_token']
        print(f"✅ Student registered: {student_data['email']}")
    else:
        print(f"❌ Student registration failed: {student_response.text}")
        return False
    
    # 2. Register manager (as guest initially)
    print("\n2️⃣ Registering manager...")
    manager_data = {
        "email": "manager8@auto-ecoleblidacentreschool.dz",
        "password": "manager123",
        "first_name": "Test",
        "last_name": "Manager",
        "phone": "1234567891",
        "address": "456 Manager Street",
        "date_of_birth": "1980-01-01",
        "gender": "male",
        "state": "Blida"
    }
    
    files = {
        'profile_photo': ('manager_photo.jpg', create_dummy_file(), 'image/jpeg')
    }
    
    manager_response = requests.post(f"{BASE_URL}/auth/register", data=manager_data, files=files)
    if manager_response.status_code == 200:
        manager_token = manager_response.json()['access_token']
        print(f"✅ Manager registered: {manager_data['email']} (role: {manager_response.json()['user']['role']})")
    else:
        print(f"❌ Manager registration failed: {manager_response.text}")
        return False
    
    # 3. Create driving school (this will convert guest to manager)
    print("\n3️⃣ Creating driving school...")
    manager_headers = {'Authorization': f'Bearer {manager_token}'}
    
    school_data = {
        "name": "Auto École Blida Centre School",
        "address": "Centre Ville Blida",
        "state": "Blida",
        "phone": "025123456",
        "email": "contact@auto-ecoleblidacentreschool.dz",
        "description": "Professional driving school in Blida center",
        "price": 25000.0
    }
    
    school_response = requests.post(f"{BASE_URL}/driving-schools", 
                                   json=school_data, headers=manager_headers)
    if school_response.status_code == 200:
        school_id = school_response.json()['id']
        print(f"✅ Driving school created: {school_id}")
    else:
        print(f"❌ Driving school creation failed: {school_response.text}")
        return False
    
    print("\n✅ Test data setup completed!")
    print(f"Student: {student_data['email']} / student123")
    print(f"Manager: {manager_data['email']} / manager123")
    print(f"School ID: {school_id}")
    
    return True

if __name__ == "__main__":
    success = setup_test_data()
    if success:
        print("\n🎉 Ready to test!")
    else:
        print("\n💥 Setup failed!")