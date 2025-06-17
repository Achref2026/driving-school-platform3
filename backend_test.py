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

if __name__ == "__main__":
    tester = DrivingSchoolAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)