/**
 * Chat System Integration Test
 * Tests all chat features with real users and lawyers
 */

require('dotenv').config();
const { supabaseAdmin } = require('../src/config/supabase');

const API_URL = 'http://localhost:3000/api/v1';

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warn: '\x1b[33m',    // Yellow
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function test(name, passed, details = '') {
  results.tests.push({ name, passed, details });
  if (passed) {
    results.passed++;
    log(`  ✅ ${name}`, 'success');
  } else {
    results.failed++;
    log(`  ❌ ${name}: ${details}`, 'error');
  }
}

// Generate a mock JWT token for testing (service role bypass)
async function getAuthToken(userId) {
  // For testing, we'll use the service role to simulate authenticated requests
  // In production, this would be a real JWT from Supabase Auth
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  // Create a mock token payload
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { 
      sub: userId,
      email: user?.email || 'test@test.com',
      role: 'authenticated',
      user_metadata: { role: user?.role || 'user' }
    },
    process.env.SUPABASE_JWT_SECRET || 'your-super-secret-jwt-token-with-at-least-32-characters-long',
    { expiresIn: '1h' }
  );
  
  return token;
}

async function makeRequest(endpoint, method = 'GET', token = null, body = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = {
    method,
    headers,
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();
  
  return { status: response.status, data };
}

async function runTests() {
  log('\n🧪 CHAT SYSTEM INTEGRATION TESTS', 'info');
  log('================================\n', 'info');
  
  // Get test data
  log('📋 Loading test data...', 'info');
  
  // Get a consultation with confirmed status (for chat)
  const { data: consultation } = await supabaseAdmin
    .from('consultations')
    .select(`
      id, 
      user_id, 
      lawyer_id, 
      status,
      lawyers!inner(id, user_id, is_verified)
    `)
    .in('status', ['confirmed', 'completed'])
    .limit(1)
    .single();
  
  if (!consultation) {
    log('❌ No consultation found for testing', 'error');
    return;
  }
  
  log(`  Found consultation: ${consultation.id}`, 'success');
  log(`  User ID: ${consultation.user_id}`, 'info');
  log(`  Lawyer ID: ${consultation.lawyer_id}`, 'info');
  log(`  Status: ${consultation.status}`, 'info');
  
  // Get lawyer's user_id
  const lawyerUserId = consultation.lawyers.user_id;
  log(`  Lawyer User ID: ${lawyerUserId}`, 'info');
  
  // Get auth tokens
  const userToken = await getAuthToken(consultation.user_id);
  const lawyerToken = await getAuthToken(lawyerUserId);
  
  let roomId = null;
  let messageId = null;
  
  // ==========================================
  // TEST 1: Create/Get Chat Room
  // ==========================================
  log('\n📝 Test 1: Create Chat Room', 'info');
  
  const roomResult = await makeRequest('/chat/rooms', 'POST', userToken, {
    consultation_id: consultation.id
  });
  
  test(
    'Create chat room for consultation',
    roomResult.status === 200 || roomResult.status === 201,
    roomResult.data?.error?.message || JSON.stringify(roomResult.data)
  );
  
  if (roomResult.data?.data?.room) {
    roomId = roomResult.data.data.room.id;
    log(`    Room ID: ${roomId}`, 'info');
  }
  
  // ==========================================
  // TEST 2: Get User's Chat Rooms
  // ==========================================
  log('\n📝 Test 2: Get User Chat Rooms', 'info');
  
  const roomsResult = await makeRequest('/chat/rooms', 'GET', userToken);
  
  test(
    'Get user chat rooms',
    roomsResult.status === 200 && roomsResult.data?.success,
    roomsResult.data?.error?.message
  );
  
  if (roomsResult.data?.data?.rooms) {
    log(`    Found ${roomsResult.data.data.rooms.length} room(s)`, 'info');
  }
  
  // ==========================================
  // TEST 3: Get Room Details
  // ==========================================
  log('\n📝 Test 3: Get Room Details', 'info');
  
  if (roomId) {
    const roomDetailResult = await makeRequest(`/chat/rooms/${roomId}`, 'GET', userToken);
    
    test(
      'Get room details',
      roomDetailResult.status === 200 && roomDetailResult.data?.success,
      roomDetailResult.data?.error?.message
    );
  } else {
    test('Get room details', false, 'No room ID available');
  }
  
  // ==========================================
  // TEST 4: Send Message as User
  // ==========================================
  log('\n📝 Test 4: Send Message (User)', 'info');
  
  if (roomId) {
    const sendResult = await makeRequest(`/chat/rooms/${roomId}/messages`, 'POST', userToken, {
      content: 'Hello! I need legal advice regarding my property dispute.',
      message_type: 'text'
    });
    
    test(
      'User sends message',
      sendResult.status === 200 || sendResult.status === 201,
      sendResult.data?.error?.message
    );
    
    if (sendResult.data?.data?.message) {
      messageId = sendResult.data.data.message.id;
      log(`    Message ID: ${messageId}`, 'info');
    }
  } else {
    test('User sends message', false, 'No room ID available');
  }
  
  // ==========================================
  // TEST 5: Send Message as Lawyer
  // ==========================================
  log('\n📝 Test 5: Send Message (Lawyer)', 'info');
  
  if (roomId) {
    const lawyerSendResult = await makeRequest(`/chat/rooms/${roomId}/messages`, 'POST', lawyerToken, {
      content: 'Hello! I would be happy to help with your property dispute. Can you share more details?',
      message_type: 'text'
    });
    
    test(
      'Lawyer sends message',
      lawyerSendResult.status === 200 || lawyerSendResult.status === 201,
      lawyerSendResult.data?.error?.message
    );
  } else {
    test('Lawyer sends message', false, 'No room ID available');
  }
  
  // ==========================================
  // TEST 6: Get Room Messages
  // ==========================================
  log('\n📝 Test 6: Get Room Messages', 'info');
  
  if (roomId) {
    const messagesResult = await makeRequest(`/chat/rooms/${roomId}/messages`, 'GET', userToken);
    
    test(
      'Get room messages',
      messagesResult.status === 200 && messagesResult.data?.success,
      messagesResult.data?.error?.message
    );
    
    if (messagesResult.data?.data?.messages) {
      log(`    Found ${messagesResult.data.data.messages.length} message(s)`, 'info');
    }
  } else {
    test('Get room messages', false, 'No room ID available');
  }
  
  // ==========================================
  // TEST 7: Edit Message
  // ==========================================
  log('\n📝 Test 7: Edit Message', 'info');
  
  if (messageId) {
    const editResult = await makeRequest(`/chat/messages/${messageId}`, 'PUT', userToken, {
      content: 'Hello! I need legal advice regarding my property dispute. Its urgent!'
    });
    
    test(
      'Edit message',
      editResult.status === 200,
      editResult.data?.error?.message
    );
  } else {
    test('Edit message', false, 'No message ID available');
  }
  
  // ==========================================
  // TEST 8: Mark Messages as Read
  // ==========================================
  log('\n📝 Test 8: Mark Messages as Read', 'info');
  
  if (roomId) {
    const readResult = await makeRequest(`/chat/rooms/${roomId}/read`, 'POST', userToken);
    
    test(
      'Mark messages as read',
      readResult.status === 200,
      readResult.data?.error?.message
    );
  } else {
    test('Mark messages as read', false, 'No room ID available');
  }
  
  // ==========================================
  // TEST 9: Get Unread Count
  // ==========================================
  log('\n📝 Test 9: Get Unread Count', 'info');
  
  const unreadResult = await makeRequest('/chat/unread', 'GET', userToken);
  
  test(
    'Get unread count',
    unreadResult.status === 200 && unreadResult.data?.success,
    unreadResult.data?.error?.message
  );
  
  if (unreadResult.data?.data) {
    log(`    Total unread: ${unreadResult.data.data.total_unread}`, 'info');
  }
  
  // ==========================================
  // TEST 10: Typing Indicator
  // ==========================================
  log('\n📝 Test 10: Typing Indicator', 'info');
  
  if (roomId) {
    const typingResult = await makeRequest(`/chat/rooms/${roomId}/typing`, 'POST', userToken, {
      is_typing: true
    });
    
    test(
      'Send typing indicator',
      typingResult.status === 200,
      typingResult.data?.error?.message
    );
  } else {
    test('Send typing indicator', false, 'No room ID available');
  }
  
  // ==========================================
  // TEST 11: Search Messages
  // ==========================================
  log('\n📝 Test 11: Search Messages', 'info');
  
  if (roomId) {
    const searchResult = await makeRequest(`/chat/rooms/${roomId}/search?q=property`, 'GET', userToken);
    
    test(
      'Search messages',
      searchResult.status === 200,
      searchResult.data?.error?.message
    );
    
    if (searchResult.data?.data?.messages) {
      log(`    Found ${searchResult.data.data.messages.length} matching message(s)`, 'info');
    }
  } else {
    test('Search messages', false, 'No room ID available');
  }
  
  // ==========================================
  // TEST 12: Get Media/Attachments
  // ==========================================
  log('\n📝 Test 12: Get Media/Attachments', 'info');
  
  if (roomId) {
    const mediaResult = await makeRequest(`/chat/rooms/${roomId}/media`, 'GET', userToken);
    
    test(
      'Get media attachments',
      mediaResult.status === 200,
      mediaResult.data?.error?.message
    );
  } else {
    test('Get media attachments', false, 'No room ID available');
  }
  
  // ==========================================
  // TEST 13: Unauthorized Access (Different User)
  // ==========================================
  log('\n📝 Test 13: Unauthorized Access', 'info');
  
  // Get a different user
  const { data: otherUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .neq('id', consultation.user_id)
    .neq('id', lawyerUserId)
    .eq('role', 'user')
    .limit(1)
    .single();
  
  if (otherUser && roomId) {
    const otherToken = await getAuthToken(otherUser.id);
    const unauthorizedResult = await makeRequest(`/chat/rooms/${roomId}`, 'GET', otherToken);
    
    test(
      'Block unauthorized room access',
      unauthorizedResult.status === 403 || unauthorizedResult.status === 404,
      `Expected 403/404, got ${unauthorizedResult.status}`
    );
  } else {
    test('Block unauthorized room access', false, 'Could not find other user for test');
  }
  
  // ==========================================
  // TEST 14: Reply to Message
  // ==========================================
  log('\n📝 Test 14: Reply to Message', 'info');
  
  if (roomId && messageId) {
    const replyResult = await makeRequest(`/chat/rooms/${roomId}/messages`, 'POST', lawyerToken, {
      content: 'I understand. Property disputes can be complex. Let me help you.',
      message_type: 'text',
      reply_to_id: messageId
    });
    
    test(
      'Reply to message',
      replyResult.status === 200 || replyResult.status === 201,
      replyResult.data?.error?.message
    );
  } else {
    test('Reply to message', false, 'No room or message ID available');
  }
  
  // ==========================================
  // TEST 15: Delete Message
  // ==========================================
  log('\n📝 Test 15: Delete Message', 'info');
  
  // Create a message to delete
  if (roomId) {
    const tempMsg = await makeRequest(`/chat/rooms/${roomId}/messages`, 'POST', userToken, {
      content: 'This message will be deleted',
      message_type: 'text'
    });
    
    if (tempMsg.data?.data?.message?.id) {
      const deleteResult = await makeRequest(`/chat/messages/${tempMsg.data.data.message.id}`, 'DELETE', userToken);
      
      test(
        'Delete message',
        deleteResult.status === 200,
        deleteResult.data?.error?.message
      );
    } else {
      test('Delete message', false, 'Could not create test message');
    }
  } else {
    test('Delete message', false, 'No room ID available');
  }
  
  // ==========================================
  // SUMMARY
  // ==========================================
  log('\n========================================', 'info');
  log('📊 TEST SUMMARY', 'info');
  log('========================================', 'info');
  log(`  Total Tests: ${results.tests.length}`, 'info');
  log(`  ✅ Passed: ${results.passed}`, 'success');
  log(`  ❌ Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'info');
  log(`  Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`, 
    results.failed === 0 ? 'success' : 'warn');
  log('========================================\n', 'info');
  
  // Show failed tests
  if (results.failed > 0) {
    log('\n❌ Failed Tests:', 'error');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => log(`  - ${t.name}: ${t.details}`, 'error'));
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  log(`\n❌ Test Error: ${err.message}`, 'error');
  console.error(err);
  process.exit(1);
});
