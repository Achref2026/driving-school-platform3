import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../utils/api';

function HomePage() {
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState('');

  useEffect(() => {
    fetchStates();
  }, []);

  const fetchStates = async () => {
    try {
      const response = await apiRequest('/states');
      setStates(response.states);
    } catch (error) {
      console.error('Failed to fetch states:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center py-16 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg mb-8">
        <h1 className="text-4xl font-bold mb-4">
          Find the Best Driving Schools in Algeria
        </h1>
        <p className="text-xl mb-8">
          Choose from driving schools across all 58 Algerian states
        </p>
        
        <div className="max-w-md mx-auto">
          <div className="flex">
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="flex-1 px-4 py-2 text-gray-800 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select your state...</option>
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            <Link
              to={`/schools${selectedState ? `?state=${selectedState}` : ''}`}
              className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-r-lg transition duration-200"
            >
              Search
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <div className="text-4xl mb-4">📚</div>
          <h3 className="text-xl font-semibold mb-2">Theory Courses</h3>
          <p className="text-gray-600">
            Learn road signs, traffic rules, and driving theory through online courses
          </p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <div className="text-4xl mb-4">🚗</div>
          <h3 className="text-xl font-semibold mb-2">Practical Training</h3>
          <p className="text-gray-600">
            Get hands-on experience with park and road courses from certified instructors
          </p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <div className="text-4xl mb-4">⭐</div>
          <h3 className="text-xl font-semibold mb-2">Quality Assurance</h3>
          <p className="text-gray-600">
            Read reviews and ratings from real students to make the best choice
          </p>
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-8">How it Works</h2>
        
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              1
            </div>
            <h4 className="font-semibold mb-2">Choose State</h4>
            <p className="text-sm text-gray-600">
              Select your state from 58 Algerian wilayas
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              2
            </div>
            <h4 className="font-semibold mb-2">Browse Schools</h4>
            <p className="text-sm text-gray-600">
              Compare prices, ratings, and teacher information
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              3
            </div>
            <h4 className="font-semibold mb-2">Register & Pay</h4>
            <p className="text-sm text-gray-600">
              Complete your profile and make payment
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              4
            </div>
            <h4 className="font-semibold mb-2">Start Learning</h4>
            <p className="text-sm text-gray-600">
              Begin your journey to get your driving license
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;