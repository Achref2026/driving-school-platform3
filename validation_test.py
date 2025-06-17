#!/usr/bin/env python3
"""Final comprehensive test to validate the bug fix"""

import requests
import json
import random
import string
from io import BytesIO

BASE_URL = "http://localhost:8001/api"

def create_dummy_file():
    return BytesIO(b"dummy file content for testing documents")

def generate_random_email():
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"test_validation_{random_suffix}@example.com"

def validation_test():
    """Comprehensive validation test for the document approval bug fix"""
    print("🔧 VALIDATION TEST: Document Approval Bug Fix")
    print("=" * 60)
    
    # Test 1: Create fresh student
    print("\n📝 Test 1: Student Registration & Enrollment")
    student_email = generate_random_email()
    student_data = {
        "email": student_email,
        "password": "student123",
        "first_name": "Validation",
        "last_name": "Student",
        "phone": "1234567890", 
        "address": "123 Test Street",
        "date_of_birth": "1990-01-01",
        "gender": "male",
        "state": "Alger"
    }
    
    files = {'profile_photo': ('test_photo.jpg', create_dummy_file(), 'image/jpeg')}
    response = requests.post(f"{BASE_URL}/auth/register", data=student_data, files=files)
    assert response.status_code == 200, f"Registration failed: {response.text}"
    
    student_token = response.json()['access_token']
    student_headers = {'Authorization': f'Bearer {student_token}'}
    print(f"✅ Student registered: {student_email}")
    
    # Get school and enroll
    schools_response = requests.get(f"{BASE_URL}/driving-schools", headers=student_headers)
    school_id = schools_response.json()['schools'][0]['id']
    
    enrollment_response = requests.post(f"{BASE_URL}/enrollments", 
                                       json={'school_id': school_id}, 
                                       headers=student_headers)
    assert enrollment_response.status_code == 200, f"Enrollment failed: {enrollment_response.text}"
    print(f"✅ Enrolled in school: {school_id}")
    
    # Test 2: Verify initial status
    print("\n📝 Test 2: Initial Status Verification")
    dashboard_response = requests.get(f"{BASE_URL}/dashboard", headers=student_headers)
    enrollments = dashboard_response.json()['enrollments']
    assert len(enrollments) == 1, "Should have exactly one enrollment"
    assert enrollments[0]['enrollment_status'] == 'pending_documents', f"Expected pending_documents, got {enrollments[0]['enrollment_status']}"
    print("✅ Initial status correctly set to 'pending_documents'")
    
    # Test 3: Upload documents individually and verify status doesn't change
    print("\n📝 Test 3: Document Upload Status Stability")
    required_docs = ['profile_photo', 'id_card', 'medical_certificate', 'residence_certificate']
    doc_ids = []
    
    for doc_type in required_docs:
        files = {'file': (f'{doc_type}.jpg', create_dummy_file(), 'image/jpeg')}
        data = {'document_type': doc_type}
        
        doc_response = requests.post(f"{BASE_URL}/documents/upload", 
                                   files=files, data=data, headers=student_headers)
        assert doc_response.status_code == 200, f"Document upload failed for {doc_type}"
        doc_ids.append(doc_response.json()['document']['id'])
        
        # Verify status hasn't changed
        dashboard_response = requests.get(f"{BASE_URL}/dashboard", headers=student_headers)
        enrollment_status = dashboard_response.json()['enrollments'][0]['enrollment_status']
        assert enrollment_status == 'pending_documents', f"Status should remain pending_documents after uploading {doc_type}, but got {enrollment_status}"
        
    print("✅ Status correctly remained 'pending_documents' after all uploads")
    
    # Test 4: Manager login and document acceptance
    print("\n📝 Test 4: Manager Document Acceptance")
    manager_response = requests.post(f"{BASE_URL}/auth/login", json={
        'email': 'manager8@auto-ecoleblidacentreschool.dz',
        'password': 'manager123'
    })
    assert manager_response.status_code == 200, f"Manager login failed: {manager_response.text}"
    
    manager_token = manager_response.json()['access_token']
    manager_headers = {'Authorization': f'Bearer {manager_token}'}
    print("✅ Manager logged in successfully")
    
    # Verify manager can see pending documents
    pending_docs_response = requests.get(f"{BASE_URL}/managers/pending-documents", headers=manager_headers)
    assert pending_docs_response.status_code == 200, "Failed to get pending documents"
    pending_count = pending_docs_response.json().get('total_pending', 0)
    assert pending_count >= 4, f"Manager should see at least 4 pending documents, saw {pending_count}"
    print(f"✅ Manager sees {pending_count} pending documents")
    
    # Test 5: Accept documents individually and verify no premature status change
    print("\n📝 Test 5: Individual Document Acceptance")
    for i, doc_id in enumerate(doc_ids[:-1]):  # Accept all but last document
        accept_response = requests.post(f"{BASE_URL}/documents/accept/{doc_id}", headers=manager_headers)
        assert accept_response.status_code == 200, f"Document acceptance failed for {doc_id}"
        
        documents_complete = accept_response.json().get('documents_complete', False)
        assert not documents_complete, f"Documents should not be complete after accepting {i+1}/4 documents"
        
        # Verify enrollment status hasn't changed yet
        dashboard_response = requests.get(f"{BASE_URL}/dashboard", headers=student_headers)
        enrollment_status = dashboard_response.json()['enrollments'][0]['enrollment_status']
        assert enrollment_status == 'pending_documents', f"Status should remain pending_documents after accepting {i+1}/4 documents"
        
    print(f"✅ Status correctly remained 'pending_documents' after accepting {len(doc_ids)-1}/4 documents")
    
    # Test 6: Accept final document and verify status change
    print("\n📝 Test 6: Final Document Acceptance and Status Change")
    final_doc_id = doc_ids[-1]
    accept_response = requests.post(f"{BASE_URL}/documents/accept/{final_doc_id}", headers=manager_headers)
    assert accept_response.status_code == 200, f"Final document acceptance failed: {accept_response.text}"
    
    documents_complete = accept_response.json().get('documents_complete', False)
    assert documents_complete, "Documents should be complete after accepting all 4 documents"
    print("✅ All documents marked as complete")
    
    # Verify enrollment status changed to pending_approval
    dashboard_response = requests.get(f"{BASE_URL}/dashboard", headers=student_headers)
    enrollment_status = dashboard_response.json()['enrollments'][0]['enrollment_status']
    assert enrollment_status == 'pending_approval', f"Expected pending_approval after all documents accepted, got {enrollment_status}"
    print("✅ Status correctly changed to 'pending_approval' after accepting all documents")
    
    # Test 7: Verify manager no longer sees pending documents for this student
    print("\n📝 Test 7: Manager Pending Documents Cleanup")
    pending_docs_after = requests.get(f"{BASE_URL}/managers/pending-documents", headers=manager_headers)
    pending_count_after = pending_docs_after.json().get('total_pending', 0)
    print(f"✅ Manager now sees {pending_count_after} pending documents (should be fewer than before)")
    
    # Test 8: Verify workflow integrity
    print("\n📝 Test 8: Workflow Integrity Verification")
    documents_response = requests.get(f"{BASE_URL}/documents", headers=student_headers)
    documents = documents_response.json()['documents']
    
    accepted_docs = [doc for doc in documents if doc['status'] == 'accepted']
    assert len(accepted_docs) == 4, f"Expected 4 accepted documents, found {len(accepted_docs)}"
    
    pending_docs = [doc for doc in documents if doc['status'] == 'pending']
    assert len(pending_docs) == 0, f"Expected 0 pending documents, found {len(pending_docs)}"
    
    print("✅ All documents correctly marked as accepted")
    
    print("\n" + "=" * 60)
    print("🎉 ALL VALIDATION TESTS PASSED!")
    print("✅ Bug fix is working correctly")
    print("✅ Enrollment status workflow is intact")
    print("✅ Manager document management is functioning")
    print("✅ No premature status changes occur")
    
    return True

if __name__ == "__main__":
    try:
        success = validation_test()
        if success:
            print("\n🏆 VALIDATION COMPLETE: Bug fix verified successfully!")
        else:
            print("\n❌ VALIDATION FAILED: Issues detected!")
    except Exception as e:
        print(f"\n💥 VALIDATION ERROR: {str(e)}")
        raise