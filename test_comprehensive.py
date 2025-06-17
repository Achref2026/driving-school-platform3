#!/usr/bin/env python3
"""Comprehensive test to verify the document approval bug fix"""

import requests
import json
from io import BytesIO

BASE_URL = "http://localhost:8001/api"

def test_comprehensive_workflow():
    """Test the complete workflow with enhanced logging"""
    print("🔍 Testing Comprehensive Document Approval Workflow...")
    print("=" * 70)
    
    # Clear data and start fresh
    print("\n🧹 Setting up fresh test environment...")
    import subprocess
    subprocess.run(["python", "/app/driving-school-platform3/setup_sample_data.py"], 
                  capture_output=True, text=True)
    print("✅ Fresh data setup completed")
    
    # Step 1: Student workflow
    print("\n👨‍🎓 STUDENT WORKFLOW")
    print("-" * 30)
    
    # Login as student
    student_response = requests.post(f"{BASE_URL}/auth/login", json={
        'email': 'student@test.dz',
        'password': 'student123'
    })
    student_token = student_response.json()['access_token']
    student_headers = {'Authorization': f'Bearer {student_token}'}
    print("✅ Student logged in")
    
    # Get first school and enroll
    schools_response = requests.get(f"{BASE_URL}/driving-schools", headers=student_headers)
    first_school = schools_response.json()['schools'][0]
    print(f"📍 Found school: {first_school['name']}")
    
    enrollment_response = requests.post(f"{BASE_URL}/enrollments", 
                                       json={'school_id': first_school['id']}, 
                                       headers=student_headers)
    if enrollment_response.status_code == 200:
        print(f"✅ Enrolled successfully")
        initial_status = enrollment_response.json()['status']
        print(f"📋 Initial status: {initial_status}")
    else:
        print(f"❌ Enrollment failed: {enrollment_response.text}")
        return False
    
    # Upload all required documents
    print("\n📄 Uploading documents...")
    required_docs = ['profile_photo', 'id_card', 'medical_certificate', 'residence_certificate']
    uploaded_docs = []
    
    for doc_type in required_docs:
        files = {
            'file': (f'{doc_type}.jpg', BytesIO(b"dummy file content"), 'image/jpeg')
        }
        data = {'document_type': doc_type}
        
        doc_response = requests.post(f"{BASE_URL}/documents/upload", 
                                   files=files, data=data, headers=student_headers)
        if doc_response.status_code == 200:
            doc_data = doc_response.json()['document']
            uploaded_docs.append(doc_data)
            print(f"  ✅ {doc_type} uploaded (ID: {doc_data['id']})")
        else:
            print(f"  ❌ Failed to upload {doc_type}: {doc_response.text}")
            return False
    
    # Check status after upload
    dashboard_response = requests.get(f"{BASE_URL}/dashboard", headers=student_headers)
    pre_approval_status = dashboard_response.json()['enrollments'][0]['enrollment_status']
    print(f"📋 Status after upload: {pre_approval_status}")
    
    # Step 2: Manager workflow
    print("\n👨‍💼 MANAGER WORKFLOW")
    print("-" * 30)
    
    # Get the correct manager for this school
    school_id = first_school['id']
    import asyncio
    from motor.motor_asyncio import AsyncIOMotorClient
    
    async def get_manager_email():
        client = AsyncIOMotorClient('mongodb://localhost:27017')
        db = client.driving_school_platform
        school = await db.driving_schools.find_one({'id': school_id})
        manager = await db.users.find_one({'id': school['manager_id']})
        client.close()
        return manager['email']
    
    manager_email = asyncio.run(get_manager_email())
    print(f"🔍 Found manager: {manager_email}")
    
    # Login as manager
    manager_response = requests.post(f"{BASE_URL}/auth/login", json={
        'email': manager_email,
        'password': 'manager123'
    })
    manager_token = manager_response.json()['access_token']
    manager_headers = {'Authorization': f'Bearer {manager_token}'}
    print("✅ Manager logged in")
    
    # Check pending documents
    pending_docs_response = requests.get(f"{BASE_URL}/managers/pending-documents", 
                                        headers=manager_headers)
    pending_docs = pending_docs_response.json()
    print(f"📋 Found {pending_docs['total_pending']} pending documents")
    
    # Check pending enrollments
    pending_enrollments_response = requests.get(f"{BASE_URL}/managers/pending-enrollments", 
                                               headers=manager_headers)
    pending_enrollments = pending_enrollments_response.json()
    print(f"📋 Found {pending_enrollments['total_pending']} pending enrollments")
    
    if pending_enrollments['enrollments']:
        enrollment_info = pending_enrollments['enrollments'][0]
        print(f"   Student: {enrollment_info['student_name']}")
        print(f"   Current status: {enrollment_info['enrollment_status']}")
        print(f"   Documents complete: {enrollment_info['documents_complete']}")
    
    # Step 3: Accept documents one by one and monitor status
    print("\n✅ DOCUMENT APPROVAL PROCESS")
    print("-" * 40)
    
    for i, doc in enumerate(uploaded_docs):
        print(f"\n📄 Accepting document {i+1}/{len(uploaded_docs)}: {doc['document_type']}")
        
        accept_response = requests.post(f"{BASE_URL}/documents/accept/{doc['id']}", 
                                      headers=manager_headers)
        
        if accept_response.status_code == 200:
            response_data = accept_response.json()
            print(f"  ✅ Document accepted successfully")
            print(f"  📊 Response: {response_data}")
            
            # Check enrollment status after each acceptance
            dashboard_response = requests.get(f"{BASE_URL}/dashboard", headers=student_headers)
            current_status = dashboard_response.json()['enrollments'][0]['enrollment_status']
            print(f"  📋 Enrollment status now: {current_status}")
            
        else:
            print(f"  ❌ Failed to accept document: {accept_response.text}")
            return False
    
    # Step 4: Final verification
    print("\n🎯 FINAL VERIFICATION")
    print("-" * 25)
    
    final_dashboard_response = requests.get(f"{BASE_URL}/dashboard", headers=student_headers)
    final_status = final_dashboard_response.json()['enrollments'][0]['enrollment_status']
    
    print(f"📋 Final enrollment status: {final_status}")
    
    # Check if all documents are accepted
    final_pending_docs = requests.get(f"{BASE_URL}/managers/pending-documents", 
                                     headers=manager_headers)
    remaining_pending = final_pending_docs.json()['total_pending']
    print(f"📄 Remaining pending documents: {remaining_pending}")
    
    # Verify success
    if final_status == 'pending_approval' and remaining_pending == 0:
        print("\n🎉 SUCCESS! Bug has been fixed!")
        print("   ✅ All documents accepted")
        print("   ✅ Enrollment status correctly updated to 'pending_approval'")
        print("   ✅ No pending documents remaining")
        return True
    else:
        print("\n💥 BUG STILL EXISTS!")
        print(f"   ❌ Expected status: 'pending_approval', Got: '{final_status}'")
        print(f"   ❌ Expected pending docs: 0, Got: {remaining_pending}")
        return False

if __name__ == "__main__":
    success = test_comprehensive_workflow()
    print(f"\n{'='*70}")
    print(f"🏁 FINAL RESULT: {'PASS' if success else 'FAIL'}")
    print(f"{'='*70}")