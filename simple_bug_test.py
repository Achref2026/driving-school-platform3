#!/usr/bin/env python3
"""Simple test to reproduce the document status bug"""

import requests
import json
from io import BytesIO

BASE_URL = "http://localhost:8001/api"

def create_dummy_file():
    """Create a dummy file for testing"""
    return BytesIO(b"dummy file content for testing documents")

def test_bug():
    """Test the document approval bug"""
    print("🔍 Testing Document Approval Bug...")
    
    # Step 1: Login as student
    print("\n1️⃣ Logging in as student...")
    response = requests.post(f"{BASE_URL}/auth/login", json={
        'email': 'student@test.dz',
        'password': 'student123'
    })
    
    if response.status_code != 200:
        print(f"❌ Student login failed: {response.status_code}")
        print(response.text)
        return False
    
    student_token = response.json()['access_token']
    student_headers = {'Authorization': f'Bearer {student_token}'}
    print("✅ Student logged in successfully")
    
    # Step 2: Get schools and enroll
    print("\n2️⃣ Getting schools and enrolling...")
    schools_response = requests.get(f"{BASE_URL}/driving-schools", headers=student_headers)
    school_id = schools_response.json()['schools'][0]['id']
    
    enrollment_response = requests.post(f"{BASE_URL}/enrollments", 
                                       json={'school_id': school_id}, 
                                       headers=student_headers)
    print(f"✅ Enrolled in school: {enrollment_response.json()}")
    
    # Step 3: Upload documents
    print("\n3️⃣ Uploading documents...")
    required_docs = ['profile_photo', 'id_card', 'medical_certificate', 'residence_certificate']
    doc_ids = []
    
    for doc_type in required_docs:
        files = {
            'file': (f'{doc_type}.jpg', create_dummy_file(), 'image/jpeg')
        }
        data = {'document_type': doc_type}
        
        doc_response = requests.post(f"{BASE_URL}/documents/upload", 
                                   files=files, data=data, headers=student_headers)
        if doc_response.status_code == 200:
            doc_id = doc_response.json()['document']['id']
            doc_ids.append(doc_id)
            print(f"  ✅ Uploaded {doc_type} (ID: {doc_id})")
        else:
            print(f"  ❌ Failed to upload {doc_type}: {doc_response.text}")
            return False
    
    # Step 4: Check enrollment status before acceptance
    print("\n4️⃣ Checking enrollment status before acceptance...")
    dashboard_response = requests.get(f"{BASE_URL}/dashboard", headers=student_headers)
    enrollments = dashboard_response.json().get('enrollments', [])
    if enrollments:
        before_status = enrollments[0]['enrollment_status']
        print(f"📋 Status before acceptance: {before_status}")
    else:
        print("❌ No enrollments found")
        return False
    
    # Step 5: Login as manager and accept documents
    print("\n5️⃣ Logging in as manager...")
    manager_response = requests.post(f"{BASE_URL}/auth/login", json={
        'email': 'manager8@auto-ecoleblidacentreschool.dz',
        'password': 'manager123'
    })
    
    manager_token = manager_response.json()['access_token']
    manager_headers = {'Authorization': f'Bearer {manager_token}'}
    print("✅ Manager logged in successfully")
    
    # Step 6: Accept all documents
    print("\n6️⃣ Accepting all documents...")
    for doc_id in doc_ids:
        accept_response = requests.post(f"{BASE_URL}/documents/accept/{doc_id}", 
                                      headers=manager_headers)
        if accept_response.status_code == 200:
            print(f"  ✅ Accepted document {doc_id}")
        else:
            print(f"  ❌ Failed to accept document {doc_id}: {accept_response.text}")
    
    # Step 7: Check enrollment status after acceptance
    print("\n7️⃣ Checking enrollment status after acceptance...")
    final_dashboard_response = requests.get(f"{BASE_URL}/dashboard", headers=student_headers)
    enrollments_after = final_dashboard_response.json().get('enrollments', [])
    if enrollments_after:
        after_status = enrollments_after[0]['enrollment_status']
        print(f"📋 Status after acceptance: {after_status}")
    else:
        print("❌ No enrollments found after acceptance")
        return False
    
    # Check if bug exists
    if after_status == 'pending_documents':
        print("🐛 BUG CONFIRMED: Status still 'pending_documents' after all documents accepted!")
        return False
    elif after_status == 'pending_approval':
        print("✅ SUCCESS: Status correctly changed to 'pending_approval'")
        return True
    else:
        print(f"⚠️  Unexpected status: {after_status}")
        return False

if __name__ == "__main__":
    success = test_bug()
    print(f"\n{'🎉 Test passed!' if success else '💥 Bug reproduced!'}")