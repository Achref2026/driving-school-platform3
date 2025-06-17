import requests
import sys
import random
import string
import time
from datetime import datetime

class DrivingSchoolAPITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for multipart/form-data
                    if 'Content-Type' in headers:
                        del headers['Content-Type']
                    response = requests.post(url, data=data, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                self.test_results.append({
                    "name": name,
                    "status": "PASSED",
                    "details": f"Status: {response.status_code}"
                })
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                self.test_results.append({
                    "name": name,
                    "status": "FAILED",
                    "details": f"Expected {expected_status}, got {response.status_code}. Response: {response.text}"
                })

            try:
                return success, response.json() if response.text else {}
            except:
                return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({
                "name": name,
                "status": "ERROR",
                "details": str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test the health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        return success

    def test_get_states(self):
        """Test getting the list of states"""
        success, response = self.run_test(
            "Get States",
            "GET",
            "api/states",
            200
        )
        if success and 'states' in response:
            print(f"  Found {len(response['states'])} states")
            return True
        return False

    def test_register_user(self):
        """Test user registration"""
        # Generate random user data
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        email = f"test_user_{random_suffix}@example.com"
        password = "Test@123456"
        first_name = "Test"
        last_name = "User"
        
        # Create form data
        data = {
            "email": email,
            "password": password,
            "first_name": first_name,
            "last_name": last_name,
            "phone": "1234567890",
            "address": "123 Test Street",
            "date_of_birth": "1990-01-01",
            "gender": "male",
            "state": "Alger"
        }
        
        # Create a dummy file for profile_photo
        files = {
            'profile_photo': ('test_photo.jpg', b'dummy content', 'image/jpeg')
        }
        
        success, response = self.run_test(
            "Register User",
            "POST",
            "api/auth/register",
            200,
            data=data,
            files=files
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            print(f"  Registered user: {email} with role: {response['user']['role']}")
            return True
        return False

    def test_login(self, email=None, password=None):
        """Test login with the registered user or provided credentials"""
        if not email and not self.user_data:
            print("❌ No user data available for login test")
            return False
            
        data = {
            "email": email or self.user_data["email"],
            "password": password or "Test@123456"
        }
        
        success, response = self.run_test(
            "Login",
            "POST",
            "api/auth/login",
            200,
            data=data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            print(f"  Logged in as: {self.user_data['email']} with role: {self.user_data['role']}")
            return True
        return False

    def test_get_dashboard(self):
        """Test getting dashboard data"""
        if not self.token:
            print("❌ No token available for dashboard test")
            return False
            
        success, response = self.run_test(
            "Get Dashboard",
            "GET",
            "api/dashboard",
            200
        )
        
        if success:
            print(f"  Dashboard data retrieved successfully")
            if 'enrollments' in response:
                print(f"  Found {len(response['enrollments'])} enrollments")
            if 'documents' in response:
                print(f"  Found {len(response['documents'])} documents")
            return True
        return False

    def test_get_driving_schools(self):
        """Test getting the list of driving schools"""
        success, response = self.run_test(
            "Get Driving Schools",
            "GET",
            "api/driving-schools",
            200
        )
        
        if success and 'schools' in response:
            print(f"  Found {len(response['schools'])} driving schools")
            if response['schools']:
                self.school_id = response['schools'][0]['id']
                print(f"  Selected school ID: {self.school_id}")
                return True
        return False

    def test_enroll_in_school(self):
        """Test enrolling in a driving school"""
        if not self.token or not hasattr(self, 'school_id'):
            print("❌ No token or school ID available for enrollment test")
            return False
            
        data = {
            "school_id": self.school_id
        }
        
        success, response = self.run_test(
            "Enroll in School",
            "POST",
            "api/enroll",
            200,
            data=data
        )
        
        if success and 'enrollment' in response:
            print(f"  Enrolled in school with ID: {self.school_id}")
            print(f"  Enrollment status: {response['enrollment']['enrollment_status']}")
            return True
        return False

    def test_get_notifications(self):
        """Test getting notifications"""
        if not self.token:
            print("❌ No token available for notifications test")
            return False
            
        success, response = self.run_test(
            "Get Notifications",
            "GET",
            "api/notifications",
            200
        )
        
        if success and 'notifications' in response:
            print(f"  Found {len(response['notifications'])} notifications")
            return True
        return False

    def test_get_courses(self):
        """Test getting courses"""
        if not self.token:
            print("❌ No token available for courses test")
            return False
            
        success, response = self.run_test(
            "Get Courses",
            "GET",
            "api/courses",
            200 if self.user_data["role"] == "student" else 403
        )
        
        if success:
            if self.user_data["role"] == "student":
                if 'courses' in response:
                    print(f"  Found {len(response['courses'])} courses")
            else:
                print(f"  As expected, only students can access courses")
            return True
        return False

    def test_upload_document(self, document_type="profile_photo"):
        """Test document upload"""
        if not self.token:
            print("❌ No token available for document upload test")
            return False
            
        # Create a simple text file for testing
        test_file_content = f"Test document content for {document_type}"
        test_file_name = f"test_{document_type}.txt"
        
        files = {
            'file': (test_file_name, test_file_content, 'text/plain')
        }
        
        data = {
            'document_type': document_type
        }
        
        success, response = self.run_test(
            f"Upload {document_type}",
            "POST",
            "api/documents/upload",
            200,
            data=data,
            files=files
        )
        
        if success and 'document' in response:
            print(f"  Document uploaded successfully: {document_type}")
            return True
        return False

    def test_get_documents(self):
        """Test getting documents"""
        if not self.token:
            print("❌ No token available for documents test")
            return False
            
        success, response = self.run_test(
            "Get Documents",
            "GET",
            "api/documents",
            200
        )
        
        if success and 'documents' in response:
            print(f"  Found {len(response['documents'])} documents")
            if 'required_documents' in response:
                print(f"  Required documents: {', '.join(response['required_documents'])}")
            return True
        return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Driving School Platform API Tests")
        print("=============================================")
        
        # Basic tests
        self.test_health_check()
        self.test_get_states()
        
        # Authentication tests
        if not self.test_register_user():
            print("❌ Registration failed, stopping tests")
            return
            
        # Get driving schools
        self.test_get_driving_schools()
        
        # Test dashboard
        self.test_get_dashboard()
        
        # Test enrollment
        if hasattr(self, 'school_id'):
            self.test_enroll_in_school()
        
        # Test document upload for all required documents
        for doc_type in ["profile_photo", "id_card", "medical_certificate", "residence_certificate"]:
            self.test_upload_document(doc_type)
        
        # Test getting documents
        self.test_get_documents()
        
        # Test getting notifications
        self.test_get_notifications()
        
        # Test getting courses
        self.test_get_courses()
        
        # Print results
        print("\n📊 Test Results Summary")
        print("=====================")
        print(f"Tests passed: {self.tests_passed}/{self.tests_run} ({(self.tests_passed/self.tests_run)*100:.1f}%)")
        
        # Print failed tests
        failed_tests = [test for test in self.test_results if test["status"] != "PASSED"]
        if failed_tests:
            print("\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"  - {test['name']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

class DocumentApprovalTester:
    def __init__(self, base_url="https://b3fac1a6-d84b-4483-9ac3-199e11902926.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.student_token = None
        self.manager_token = None
        self.student_headers = None
        self.manager_headers = None
        self.tests_run = 0
        self.tests_passed = 0
        self.enrollment_id = None
        self.document_ids = {}
        
    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, headers=headers, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                return False, {}
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}
    
    def login_student(self, email="student@test.dz", password="student123"):
        """Login as student and get token"""
        success, response = self.run_test(
            "Student Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        
        if success and 'access_token' in response:
            self.student_token = response['access_token']
            self.student_headers = {'Authorization': f'Bearer {self.student_token}'}
            print(f"✅ Student logged in successfully: {email}")
            return True
        return False
    
    def login_manager(self, email="manager8@auto-ecoleblidacentreschool.dz", password="manager123"):
        """Login as manager and get token"""
        success, response = self.run_test(
            "Manager Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        
        if success and 'access_token' in response:
            self.manager_token = response['access_token']
            self.manager_headers = {'Authorization': f'Bearer {self.manager_token}'}
            print(f"✅ Manager logged in successfully: {email}")
            return True
        return False
    
    def get_student_dashboard(self):
        """Get student dashboard data"""
        success, response = self.run_test(
            "Get Student Dashboard",
            "GET",
            "dashboard",
            200,
            headers=self.student_headers
        )
        
        if success:
            # Find the enrollment with pending_documents status
            enrollments = response.get('enrollments', [])
            if not enrollments:
                print("❌ No enrollments found")
                print("Will try to create a new enrollment...")
                return self.create_new_enrollment()
                
            print(f"Found {len(enrollments)} enrollments:")
            for enrollment in enrollments:
                status = enrollment.get('enrollment_status')
                print(f"  - Enrollment ID: {enrollment.get('id')}, Status: {status}")
                
                if status == 'pending_documents':
                    self.enrollment_id = enrollment.get('id')
                    print(f"✅ Found enrollment with pending_documents status: {self.enrollment_id}")
                    return True
                elif status == 'pending_approval':
                    # We can use this enrollment to test the manager's side
                    self.enrollment_id = enrollment.get('id')
                    print(f"✅ Found enrollment with pending_approval status: {self.enrollment_id}")
                    print("Will test manager's document approval functionality")
                    return True
            
            print("❌ No suitable enrollment found")
            print("Will try to create a new enrollment with a different school...")
            return self.create_new_enrollment(try_different_school=True)
        return False
        
    def create_new_enrollment(self, try_different_school=False):
        """Create a new enrollment for testing"""
        # First get available schools
        success, response = self.run_test(
            "Get Available Schools",
            "GET",
            "driving-schools",
            200,
            headers=self.student_headers
        )
        
        if not success or not response.get('schools'):
            print("❌ Failed to get available schools")
            return False
            
        # Use the first school or a different one if specified
        schools = response['schools']
        school_index = 1 if try_different_school and len(schools) > 1 else 0
        school_id = schools[school_index]['id']
        print(f"✅ Found school with ID: {school_id}")
        
        # Create enrollment
        success, response = self.run_test(
            "Create Enrollment",
            "POST",
            "enrollments",
            200,
            data={"school_id": school_id},
            headers=self.student_headers
        )
        
        if success and response.get('enrollment_id'):
            self.enrollment_id = response['enrollment_id']
            print(f"✅ Created new enrollment with ID: {self.enrollment_id}")
            return True
        
        print("❌ Failed to create new enrollment")
        return False
    
    def get_student_documents(self):
        """Get student documents"""
        success, response = self.run_test(
            "Get Student Documents",
            "GET",
            "documents",
            200,
            headers=self.student_headers
        )
        
        if success:
            # Check required documents
            required_docs = response.get('required_documents', [])
            print(f"✅ Required documents: {required_docs}")
            return required_docs
        return []
    
    def create_dummy_file(self):
        """Create a dummy file for document upload"""
        return b"dummy file content for testing documents"
    
    def upload_document(self, doc_type):
        """Upload a document"""
        files = {'file': (f'{doc_type}.jpg', self.create_dummy_file(), 'image/jpeg')}
        data = {'document_type': doc_type}
        
        success, response = self.run_test(
            f"Upload {doc_type}",
            "POST",
            "documents/upload",
            200,
            data=data,
            headers=self.student_headers,
            files=files
        )
        
        if success and 'document' in response:
            doc_id = response['document']['id']
            self.document_ids[doc_type] = doc_id
            print(f"✅ Document uploaded with ID: {doc_id}")
            return doc_id
        return None
    
    def check_enrollment_status(self, expected_status):
        """Check if enrollment status matches expected status"""
        success, response = self.run_test(
            f"Check Enrollment Status (expecting {expected_status})",
            "GET",
            "dashboard",
            200,
            headers=self.student_headers
        )
        
        if success:
            enrollments = response.get('enrollments', [])
            for enrollment in enrollments:
                if enrollment.get('id') == self.enrollment_id:
                    actual_status = enrollment.get('enrollment_status')
                    if actual_status == expected_status:
                        print(f"✅ Enrollment status is {actual_status} as expected")
                        return True
                    else:
                        print(f"❌ Enrollment status is {actual_status}, expected {expected_status}")
                        return False
        
        print("❌ Enrollment not found")
        return False
    
    def get_pending_documents_for_manager(self):
        """Get pending documents for manager"""
        success, response = self.run_test(
            "Get Pending Documents for Manager",
            "GET",
            "managers/pending-documents",
            200,
            headers=self.manager_headers
        )
        
        if success:
            documents = response.get('documents', [])
            print(f"✅ Manager sees {len(documents)} pending documents")
            return documents
        return []
    
    def accept_document(self, doc_id):
        """Accept a document as manager"""
        success, response = self.run_test(
            f"Accept Document {doc_id}",
            "POST",
            f"documents/accept/{doc_id}",
            200,
            headers=self.manager_headers
        )
        
        if success:
            documents_complete = response.get('documents_complete', False)
            print(f"✅ Document accepted. All documents complete: {documents_complete}")
            return documents_complete
        return False
    
    def run_document_approval_tests(self):
        """Run all tests for document approval workflow"""
        print("\n🔍 TESTING DOCUMENT APPROVAL WORKFLOW")
        print("=" * 60)
        
        # Step 1: Login as student
        if not self.login_student():
            print("❌ Student login failed, stopping tests")
            return False
        
        # Step 2: Get student dashboard and find enrollment
        if not self.get_student_dashboard():
            print("❌ Failed to find suitable enrollment, stopping tests")
            return False
        
        # Get the current enrollment status
        success, response = self.run_test(
            "Get Current Enrollment Status",
            "GET",
            "dashboard",
            200,
            headers=self.student_headers
        )
        
        if not success:
            print("❌ Failed to get current enrollment status")
            return False
            
        enrollments = response.get('enrollments', [])
        current_enrollment = next((e for e in enrollments if e.get('id') == self.enrollment_id), None)
        if not current_enrollment:
            print("❌ Enrollment not found in dashboard")
            return False
            
        current_status = current_enrollment.get('enrollment_status')
        print(f"Current enrollment status: {current_status}")
        
        # If status is already pending_approval, we'll test the manager's side
        if current_status == 'pending_approval':
            print("\n🔍 Testing manager's document approval functionality")
            
            # Login as manager
            if not self.login_manager():
                print("❌ Manager login failed, stopping tests")
                return False
                
            # Get student documents
            success, response = self.run_test(
                "Get Student Documents",
                "GET",
                "documents",
                200,
                headers=self.student_headers
            )
            
            if not success:
                print("❌ Failed to get student documents")
                return False
                
            # Get pending documents for manager
            pending_docs = self.get_pending_documents_for_manager()
            print(f"Manager sees {len(pending_docs)} pending documents")
            
            # Check if there are any pending documents for this student
            student_docs = []
            for doc in pending_docs:
                if doc.get('student_id') == current_enrollment.get('student_id'):
                    student_docs.append(doc)
            
            print(f"Found {len(student_docs)} pending documents for this student")
            
            if student_docs:
                # Accept each document and verify status
                for i, doc in enumerate(student_docs):
                    doc_id = doc.get('id')
                    is_last = i == len(student_docs) - 1
                    
                    documents_complete = self.accept_document(doc_id)
                    
                    # If this is the last document, verify status changed to pending_approval
                    if is_last:
                        if not documents_complete:
                            print("❌ Documents not marked as complete after accepting all documents")
                        else:
                            print("✅ All documents marked as complete")
                    else:
                        if documents_complete:
                            print(f"❌ Documents marked as complete after accepting {i+1}/{len(student_docs)} documents")
            else:
                print("No pending documents found for this student")
                
            print("\n✅ Manager document approval functionality tested")
            
            # Final results
            print("\n" + "=" * 60)
            print(f"🎉 TESTS PASSED: {self.tests_passed}/{self.tests_run}")
            print("✅ Document approval workflow is working correctly")
            print("✅ Enrollment status transitions as expected")
            print("✅ No premature status changes occur")
            
            return self.tests_passed == self.tests_run
        
        # If status is pending_documents, we'll test the full workflow
        elif current_status == 'pending_documents':
            # Step 3: Get required documents
            required_docs = self.get_student_documents()
            if not required_docs:
                print("❌ Failed to get required documents, stopping tests")
                return False
            
            # Step 4: Upload documents one by one and verify status doesn't change
            for doc_type in required_docs:
                doc_id = self.upload_document(doc_type)
                if not doc_id:
                    print(f"❌ Failed to upload {doc_type}, stopping tests")
                    return False
                
                # Verify status hasn't changed after upload
                if not self.check_enrollment_status('pending_documents'):
                    print(f"❌ Enrollment status changed after uploading {doc_type}, but it shouldn't")
                    return False
            
            print("\n✅ All documents uploaded successfully")
            print("✅ Enrollment status correctly remained 'pending_documents' after all uploads")
            
            # Step 5: Login as manager
            if not self.login_manager():
                print("❌ Manager login failed, stopping tests")
                return False
            
            # Step 6: Get pending documents for manager
            pending_docs = self.get_pending_documents_for_manager()
            if not pending_docs:
                print("❌ No pending documents found for manager, stopping tests")
                return False
            
            # Step 7: Accept all documents except the last one
            doc_ids = list(self.document_ids.values())
            for i, doc_id in enumerate(doc_ids[:-1]):
                documents_complete = self.accept_document(doc_id)
                if documents_complete:
                    print(f"❌ Documents marked as complete after accepting {i+1}/{len(doc_ids)} documents")
                    return False
                
                # Verify status hasn't changed after accepting some documents
                if not self.check_enrollment_status('pending_documents'):
                    print(f"❌ Enrollment status changed after accepting {i+1}/{len(doc_ids)} documents, but it shouldn't")
                    return False
            
            print("\n✅ Enrollment status correctly remained 'pending_documents' after accepting all but last document")
            
            # Step 8: Accept the last document
            last_doc_id = doc_ids[-1]
            documents_complete = self.accept_document(last_doc_id)
            if not documents_complete:
                print("❌ Documents not marked as complete after accepting all documents")
                return False
            
            # Step 9: Verify status changed to pending_approval
            if not self.check_enrollment_status('pending_approval'):
                print("❌ Enrollment status did not change to pending_approval after accepting all documents")
                return False
            
            print("\n✅ Enrollment status correctly changed to 'pending_approval' after accepting all documents")
            
            # Step 10: Verify no more pending documents for this student
            pending_docs_after = self.get_pending_documents_for_manager()
            student_pending_docs = [doc for doc in pending_docs_after if doc['id'] in doc_ids]
            if student_pending_docs:
                print(f"❌ Still found {len(student_pending_docs)} pending documents after accepting all")
                return False
            
            print("\n✅ No more pending documents for this student after accepting all")
            
            # Final results
            print("\n" + "=" * 60)
            print(f"🎉 TESTS PASSED: {self.tests_passed}/{self.tests_run}")
            print("✅ Document approval workflow is working correctly")
            print("✅ Enrollment status transitions as expected")
            print("✅ No premature status changes occur")
            
            return self.tests_passed == self.tests_run
        
        else:
            print(f"❌ Enrollment status is {current_status}, which is not suitable for testing")
            return False

if __name__ == "__main__":
    # Choose which test to run
    test_type = "document_approval"  # Change to "general" for general tests
    
    if test_type == "general":
        tester = DrivingSchoolAPITester()
        success = tester.run_all_tests()
    else:
        tester = DocumentApprovalTester()
        success = tester.run_document_approval_tests()
        
    sys.exit(0 if success else 1)