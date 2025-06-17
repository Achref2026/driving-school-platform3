#!/usr/bin/env python3
"""Test manager document management endpoints"""

import requests
import json
from io import BytesIO

BASE_URL = "http://localhost:8001/api"

def test_manager_document_flow():
    """Test the complete manager document management flow"""
    print("🔍 Testing Manager Document Management Flow...")
    
    # Step 1: Login as student and create data
    print("\n1️⃣ Setting up test data...")
    student_response = requests.post(f"{BASE_URL}/auth/login", json={
        'email': 'student@test.dz',
        'password': 'student123'
    })
    student_token = student_response.json()['access_token']
    student_headers = {'Authorization': f'Bearer {student_token}'}
    
    # Get schools and enroll
    schools_response = requests.get(f"{BASE_URL}/driving-schools", headers=student_headers)
    school_id = schools_response.json()['schools'][0]['id']
    
    enrollment_response = requests.post(f"{BASE_URL}/enrollments", 
                                       json={'school_id': school_id}, 
                                       headers=student_headers)
    print(f"✅ Student enrolled in school")
    
    # Upload one document
    files = {
        'file': ('profile_photo.jpg', BytesIO(b"dummy content"), 'image/jpeg')
    }
    data = {'document_type': 'profile_photo'}
    
    doc_response = requests.post(f"{BASE_URL}/documents/upload", 
                               files=files, data=data, headers=student_headers)
    print(f"✅ Document uploaded")
    
    # Step 2: Login as manager
    print("\n2️⃣ Testing manager endpoints...")
    manager_response = requests.post(f"{BASE_URL}/auth/login", json={
        'email': 'manager8@auto-ecoleblidacentreschool.dz',
        'password': 'manager123'
    })
    manager_token = manager_response.json()['access_token']
    manager_headers = {'Authorization': f'Bearer {manager_token}'}
    
    # Test pending documents endpoint
    pending_docs_response = requests.get(f"{BASE_URL}/managers/pending-documents", 
                                        headers=manager_headers)
    if pending_docs_response.status_code == 200:
        pending_docs = pending_docs_response.json()
        print(f"✅ Pending documents endpoint works: {pending_docs['total_pending']} documents")
    else:
        print(f"❌ Pending documents endpoint failed: {pending_docs_response.text}")
    
    # Test pending enrollments endpoint
    pending_enrollments_response = requests.get(f"{BASE_URL}/managers/pending-enrollments", 
                                               headers=manager_headers)
    if pending_enrollments_response.status_code == 200:
        pending_enrollments = pending_enrollments_response.json()
        print(f"✅ Pending enrollments endpoint works: {pending_enrollments['total_pending']} enrollments")
        
        # Show enrollment details
        if pending_enrollments['enrollments']:
            enrollment = pending_enrollments['enrollments'][0]
            print(f"   Student: {enrollment['student_name']} ({enrollment['student_email']})")
            print(f"   Status: {enrollment['enrollment_status']}")
            print(f"   Documents complete: {enrollment['documents_complete']}")
    else:
        print(f"❌ Pending enrollments endpoint failed: {pending_enrollments_response.text}")
    
    # Step 3: Test document refusal with reason
    print("\n3️⃣ Testing document refusal...")
    if doc_response.status_code == 200:
        doc_id = doc_response.json()['document']['id']
        
        # Test refusal
        refusal_data = {'reason': 'Photo is not clear enough, please upload a better quality image'}
        refuse_response = requests.post(f"{BASE_URL}/documents/refuse/{doc_id}", 
                                      data=refusal_data, headers=manager_headers)
        
        if refuse_response.status_code == 200:
            print("✅ Document refusal works")
            
            # Check if student got notification
            student_notifications = requests.get(f"{BASE_URL}/notifications", headers=student_headers)
            if student_notifications.status_code == 200:
                notifications = student_notifications.json().get('notifications', [])
                refusal_notifications = [n for n in notifications if n.get('type') == 'document_refused']
                if refusal_notifications:
                    print(f"✅ Student received refusal notification: {refusal_notifications[0]['message']}")
                else:
                    print("⚠️  No refusal notification found")
        else:
            print(f"❌ Document refusal failed: {refuse_response.text}")
    
    print("\n🎉 Manager document management flow completed!")

if __name__ == "__main__":
    test_manager_document_flow()