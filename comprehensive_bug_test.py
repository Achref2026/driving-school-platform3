#!/usr/bin/env python3
"""Enhanced test to reproduce the document approval bug with fresh data"""

import requests
import json
import random
import string
from io import BytesIO

BASE_URL = "http://localhost:8001/api"

def create_dummy_file():
    """Create a dummy file for testing"""
    return BytesIO(b"dummy file content for testing documents")

def generate_random_email():
    """Generate a random email"""
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"test_student_{random_suffix}@example.com"

def test_bug_comprehensive():
    """Test the document approval bug with comprehensive logging"""
    print("🔍 Comprehensive Document Approval Bug Test...")
    
    # Step 1: Register a new student
    print("\n1️⃣ Registering new student...")
    student_email = generate_random_email()
    student_data = {
        "email": student_email,
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
    
    response = requests.post(f"{BASE_URL}/auth/register", data=student_data, files=files)
    
    if response.status_code != 200:
        print(f"❌ Student registration failed: {response.status_code}")
        print(response.text)
        return False
    
    student_token = response.json()['access_token']
    student_headers = {'Authorization': f'Bearer {student_token}'}
    print(f"✅ Student registered: {student_email}")
    
    # Step 2: Get schools and enroll
    print("\n2️⃣ Getting schools and enrolling...")
    schools_response = requests.get(f"{BASE_URL}/driving-schools", headers=student_headers)
    if schools_response.status_code != 200 or not schools_response.json().get('schools'):
        print("❌ No schools found, cannot proceed with test")
        return False
    
    school_id = schools_response.json()['schools'][0]['id']
    print(f"Found school: {school_id}")
    
    enrollment_response = requests.post(f"{BASE_URL}/enrollments", 
                                       json={'school_id': school_id}, 
                                       headers=student_headers)
    
    if enrollment_response.status_code != 200:
        print(f"❌ Enrollment failed: {enrollment_response.text}")
        return False
    
    enrollment_data = enrollment_response.json()
    print(f"✅ Enrolled: {enrollment_data}")
    
    # Step 3: Check initial enrollment status
    print("\n3️⃣ Checking initial enrollment status...")
    dashboard_response = requests.get(f"{BASE_URL}/dashboard", headers=student_headers)
    enrollments = dashboard_response.json().get('enrollments', [])
    if enrollments:
        initial_status = enrollments[0]['enrollment_status']
        print(f"📋 Initial enrollment status: {initial_status}")
    else:
        print("❌ No enrollments found")
        return False
    
    # Step 4: Upload documents one by one
    print("\n4️⃣ Uploading documents one by one...")
    required_docs = ['profile_photo', 'id_card', 'medical_certificate', 'residence_certificate']
    doc_ids = []
    
    for i, doc_type in enumerate(required_docs):
        print(f"  Uploading {doc_type} ({i+1}/{len(required_docs)})...")
        
        files = {
            'file': (f'{doc_type}.jpg', create_dummy_file(), 'image/jpeg')
        }
        data = {'document_type': doc_type}
        
        doc_response = requests.post(f"{BASE_URL}/documents/upload", 
                                   files=files, data=data, headers=student_headers)
        if doc_response.status_code == 200:
            doc_id = doc_response.json()['document']['id']
            doc_ids.append(doc_id)
            print(f"    ✅ Uploaded {doc_type} (ID: {doc_id})")
            
            # Check enrollment status after each upload
            dashboard_response = requests.get(f"{BASE_URL}/dashboard", headers=student_headers)
            enrollments = dashboard_response.json().get('enrollments', [])
            if enrollments:
                current_status = enrollments[0]['enrollment_status']
                print(f"    📋 Status after uploading {doc_type}: {current_status}")
        else:
            print(f"    ❌ Failed to upload {doc_type}: {doc_response.text}")
            return False
    
    # Step 5: Check enrollment status after all uploads
    print("\n5️⃣ Checking enrollment status after all uploads...")
    dashboard_response = requests.get(f"{BASE_URL}/dashboard", headers=student_headers)
    enrollments = dashboard_response.json().get('enrollments', [])
    if enrollments:
        before_acceptance_status = enrollments[0]['enrollment_status']
        print(f"📋 Status after all uploads: {before_acceptance_status}")
    else:
        print("❌ No enrollments found")
        return False
    
    # Step 6: Login as manager
    print("\n6️⃣ Logging in as manager...")
    manager_response = requests.post(f"{BASE_URL}/auth/login", json={
        'email': 'manager8@auto-ecoleblidacentreschool.dz',
        'password': 'manager123'
    })
    
    if manager_response.status_code != 200:
        print(f"❌ Manager login failed: {manager_response.text}")
        return False
    
    manager_token = manager_response.json()['access_token']
    manager_headers = {'Authorization': f'Bearer {manager_token}'}
    print("✅ Manager logged in successfully")
    
    # Step 7: Check pending documents from manager perspective
    print("\n7️⃣ Checking pending documents from manager perspective...")
    pending_docs_response = requests.get(f"{BASE_URL}/managers/pending-documents", 
                                        headers=manager_headers)
    if pending_docs_response.status_code == 200:
        pending_data = pending_docs_response.json()
        print(f"📋 Manager sees {pending_data.get('total_pending', 0)} pending documents")
        if pending_data.get('documents'):
            for doc in pending_data['documents'][:3]:  # Show first 3
                print(f"    - {doc['document_type']} from {doc['student_name']} (Status: {doc['status']})")
    else:
        print(f"❌ Failed to get pending documents: {pending_docs_response.text}")
    
    # Step 8: Accept all documents
    print("\n8️⃣ Accepting all documents...")
    for doc_id in doc_ids:
        accept_response = requests.post(f"{BASE_URL}/documents/accept/{doc_id}", 
                                      headers=manager_headers)
        if accept_response.status_code == 200:
            result = accept_response.json()
            print(f"  ✅ Accepted document {doc_id}")
            print(f"      Documents complete: {result.get('documents_complete', 'unknown')}")
        else:
            print(f"  ❌ Failed to accept document {doc_id}: {accept_response.text}")
    
    # Step 9: Check enrollment status after acceptance
    print("\n9️⃣ Checking enrollment status after acceptance...")
    final_dashboard_response = requests.get(f"{BASE_URL}/dashboard", headers=student_headers)
    enrollments_after = final_dashboard_response.json().get('enrollments', [])
    if enrollments_after:
        after_status = enrollments_after[0]['enrollment_status']
        print(f"📋 Status after acceptance: {after_status}")
    else:
        print("❌ No enrollments found after acceptance")
        return False
    
    # Step 10: Check manager perspective after acceptance
    print("\n🔟 Checking manager perspective after acceptance...")
    pending_docs_after = requests.get(f"{BASE_URL}/managers/pending-documents", 
                                     headers=manager_headers)
    if pending_docs_after.status_code == 200:
        pending_data_after = pending_docs_after.json()
        print(f"📋 Manager now sees {pending_data_after.get('total_pending', 0)} pending documents")
    
    # Step 11: Analyze the results
    print("\n🔍 ANALYSIS:")
    print(f"Status before uploads: {initial_status}")
    print(f"Status after all uploads: {before_acceptance_status}")
    print(f"Status after all acceptances: {after_status}")
    
    # Check if bug exists
    if before_acceptance_status == 'pending_documents' and after_status == 'pending_approval':
        print("✅ SUCCESS: Correct workflow - documents stayed pending_documents until accepted")
        return True
    elif before_acceptance_status == 'pending_approval' and after_status == 'pending_approval':
        print("🐛 POTENTIAL BUG: Status was already pending_approval before acceptance")
        print("   This suggests documents upload logic is incorrectly changing status")
        return False
    elif after_status == 'pending_documents':
        print("🐛 BUG CONFIRMED: Status still 'pending_documents' after all documents accepted!")
        return False
    else:
        print(f"⚠️  Unexpected behavior: {before_acceptance_status} → {after_status}")
        return False

if __name__ == "__main__":
    success = test_bug_comprehensive()
    if success:
        print(f"\n🎉 Test passed - Bug is fixed!")
    else:
        print(f"\n💥 Bug still exists or unexpected behavior!")