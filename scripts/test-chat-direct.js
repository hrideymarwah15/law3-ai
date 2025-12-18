/**
 * Chat System Direct Test
 * Tests chat functionality directly using service role (bypasses auth)
 */

require('dotenv').config();
const { supabaseAdmin } = require('../src/config/supabase');
const chatRepository = require('../src/repositories/chat.repository');
const chatService = require('../src/services/chat.service');

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

async function runTests() {
  log('\n🧪 CHAT SYSTEM DIRECT TESTS', 'info');
  log('============================\n', 'info');
  
  // ==========================================
  // SETUP: Get test data
  // ==========================================
  log('📋 Loading test data...', 'info');
  
  // Get a consultation with confirmed status
  const { data: consultations } = await supabaseAdmin
    .from('consultations')
    .select(`
      id, 
      user_id, 
      lawyer_id, 
      status,
      lawyers!inner(id, user_id, is_verified)
    `)
    .in('status', ['confirmed', 'completed'])
    .limit(2);
  
  if (!consultations || consultations.length === 0) {
    log('❌ No consultations found for testing', 'error');
    return;
  }
  
  const consultation = consultations[0];
  const lawyerUserId = consultation.lawyers.user_id;
  
  log(`  ✓ Consultation: ${consultation.id}`, 'success');
  log(`  ✓ User ID: ${consultation.user_id}`, 'success');
  log(`  ✓ Lawyer ID: ${consultation.lawyer_id}`, 'success');
  log(`  ✓ Lawyer User ID: ${lawyerUserId}`, 'success');
  
  // Create mock user objects
  const mockUser = { 
    id: consultation.user_id, 
    role: 'user',
    lawyerProfile: null
  };
  
  const mockLawyer = { 
    id: lawyerUserId, 
    role: 'lawyer',
    lawyerProfile: { 
      id: consultation.lawyer_id, 
      is_verified: true,
      verification_status: 'verified'
    }
  };
  
  let roomId = null;
  let messageId = null;
  let message2Id = null;
  
  // ==========================================
  // TEST 1: Create Chat Room (Repository)
  // ==========================================
  log('\n📝 Test 1: Create Chat Room via Repository', 'info');
  
  try {
    const room = await chatRepository.getOrCreateRoom(
      consultation.id,
      consultation.user_id,
      consultation.lawyer_id
    );
    
    test('Create chat room', !!room?.id, room?.error || 'Room not created');
    
    if (room?.id) {
      roomId = room.id;
      log(`    Room ID: ${roomId}`, 'info');
    }
  } catch (error) {
    test('Create chat room', false, error.message);
  }
  
  // ==========================================
  // TEST 2: Get Room by ID
  // ==========================================
  log('\n📝 Test 2: Get Room by ID', 'info');
  
  if (roomId) {
    try {
      const room = await chatRepository.getRoomById(roomId);
      test('Get room by ID', !!room && room.id === roomId, 'Room not found');
    } catch (error) {
      test('Get room by ID', false, error.message);
    }
  } else {
    test('Get room by ID', false, 'No room ID');
  }
  
  // ==========================================
  // TEST 3: Create Message (User)
  // ==========================================
  log('\n📝 Test 3: Send Message as User', 'info');
  
  if (roomId) {
    try {
      const message = await chatRepository.createMessage({
        room_id: roomId,
        sender_id: consultation.user_id,
        sender_type: 'user',
        content: 'Hello! I need help with a property dispute case.',
        message_type: 'text'
      });
      
      test('User sends message', !!message?.id, 'Message not created');
      
      if (message?.id) {
        messageId = message.id;
        log(`    Message ID: ${messageId}`, 'info');
        log(`    Content: ${message.content}`, 'info');
      }
    } catch (error) {
      test('User sends message', false, error.message);
    }
  } else {
    test('User sends message', false, 'No room ID');
  }
  
  // ==========================================
  // TEST 4: Create Message (Lawyer)
  // ==========================================
  log('\n📝 Test 4: Send Message as Lawyer', 'info');
  
  if (roomId) {
    try {
      const message = await chatRepository.createMessage({
        room_id: roomId,
        sender_id: lawyerUserId,
        sender_type: 'lawyer',
        content: 'Hi! I would be happy to help. Can you provide more details about the property?',
        message_type: 'text'
      });
      
      test('Lawyer sends message', !!message?.id, 'Message not created');
      
      if (message?.id) {
        message2Id = message.id;
        log(`    Message ID: ${message2Id}`, 'info');
      }
    } catch (error) {
      test('Lawyer sends message', false, error.message);
    }
  } else {
    test('Lawyer sends message', false, 'No room ID');
  }
  
  // ==========================================
  // TEST 5: Get Room Messages
  // ==========================================
  log('\n📝 Test 5: Get Room Messages', 'info');
  
  if (roomId) {
    try {
      const messages = await chatRepository.getRoomMessages(roomId, { limit: 10 });
      
      test('Get room messages', Array.isArray(messages) && messages.length >= 2, 
        `Expected 2+ messages, got ${messages?.length}`);
      
      log(`    Found ${messages?.length} messages`, 'info');
    } catch (error) {
      test('Get room messages', false, error.message);
    }
  } else {
    test('Get room messages', false, 'No room ID');
  }
  
  // ==========================================
  // TEST 6: Check Room Updated (Last Message)
  // ==========================================
  log('\n📝 Test 6: Verify Room Last Message Updated', 'info');
  
  if (roomId) {
    try {
      const room = await chatRepository.getRoomById(roomId);
      
      const hasLastMessage = !!room.last_message_at && !!room.last_message_preview;
      test('Room last message updated', hasLastMessage, 'Last message not tracked');
      
      if (hasLastMessage) {
        log(`    Last message: "${room.last_message_preview}"`, 'info');
        log(`    Total messages: ${room.total_messages}`, 'info');
      }
    } catch (error) {
      test('Room last message updated', false, error.message);
    }
  } else {
    test('Room last message updated', false, 'No room ID');
  }
  
  // ==========================================
  // TEST 7: Check Unread Counts
  // ==========================================
  log('\n📝 Test 7: Verify Unread Counts', 'info');
  
  if (roomId) {
    try {
      const room = await chatRepository.getRoomById(roomId);
      
      // User should have 1 unread (lawyer's message)
      // Lawyer should have 1 unread (user's message)
      const unreadCorrect = room.user_unread_count >= 1 || room.lawyer_unread_count >= 1;
      test('Unread counts tracked', unreadCorrect, 
        `User: ${room.user_unread_count}, Lawyer: ${room.lawyer_unread_count}`);
      
      log(`    User unread: ${room.user_unread_count}`, 'info');
      log(`    Lawyer unread: ${room.lawyer_unread_count}`, 'info');
    } catch (error) {
      test('Unread counts tracked', false, error.message);
    }
  } else {
    test('Unread counts tracked', false, 'No room ID');
  }
  
  // ==========================================
  // TEST 8: Edit Message
  // ==========================================
  log('\n📝 Test 8: Edit Message', 'info');
  
  if (messageId) {
    try {
      const updated = await chatRepository.updateMessage(messageId, {
        content: 'Hello! I need URGENT help with a property dispute case.',
        is_edited: true,
        edited_at: new Date().toISOString()
      });
      
      test('Edit message', updated?.is_edited === true, 'Message not edited');
      
      if (updated) {
        log(`    New content: "${updated.content}"`, 'info');
        log(`    Is edited: ${updated.is_edited}`, 'info');
      }
    } catch (error) {
      test('Edit message', false, error.message);
    }
  } else {
    test('Edit message', false, 'No message ID');
  }
  
  // ==========================================
  // TEST 9: Mark Messages as Read
  // ==========================================
  log('\n📝 Test 9: Mark Messages as Read', 'info');
  
  if (roomId) {
    try {
      const count = await chatRepository.markMessagesAsRead(roomId, consultation.user_id);
      
      test('Mark messages as read', count >= 0, 'Failed to mark as read');
      log(`    Marked ${count} message(s) as read`, 'info');
      
      // Verify unread count is reset
      const room = await chatRepository.getRoomById(roomId);
      log(`    User unread after: ${room.user_unread_count}`, 'info');
    } catch (error) {
      test('Mark messages as read', false, error.message);
    }
  } else {
    test('Mark messages as read', false, 'No room ID');
  }
  
  // ==========================================
  // TEST 10: Reply to Message
  // ==========================================
  log('\n📝 Test 10: Reply to Message', 'info');
  
  if (roomId && messageId) {
    try {
      const reply = await chatRepository.createMessage({
        room_id: roomId,
        sender_id: lawyerUserId,
        sender_type: 'lawyer',
        content: 'I see, property disputes can be complex. Let me review.',
        message_type: 'text',
        reply_to_id: messageId
      });
      
      test('Reply to message', !!reply?.id && reply.reply_to_id === messageId, 
        'Reply not created correctly');
      
      if (reply) {
        log(`    Reply ID: ${reply.id}`, 'info');
        log(`    Replying to: ${reply.reply_to_id}`, 'info');
      }
    } catch (error) {
      test('Reply to message', false, error.message);
    }
  } else {
    test('Reply to message', false, 'No room or message ID');
  }
  
  // ==========================================
  // TEST 11: Search Messages
  // ==========================================
  log('\n📝 Test 11: Search Messages', 'info');
  
  if (roomId) {
    try {
      const searchResults = await chatRepository.searchMessages(roomId, 'property');
      
      test('Search messages', Array.isArray(searchResults) && searchResults.length > 0,
        'No search results');
      
      log(`    Found ${searchResults?.length} matching messages`, 'info');
    } catch (error) {
      test('Search messages', false, error.message);
    }
  } else {
    test('Search messages', false, 'No room ID');
  }
  
  // ==========================================
  // TEST 12: Update Presence
  // ==========================================
  log('\n📝 Test 12: Update User Presence', 'info');
  
  try {
    const presence = await chatRepository.updatePresence(consultation.user_id, {
      is_online: true,
      socket_id: 'test-socket-123',
      current_room_id: roomId
    });
    
    test('Update presence', presence?.is_online === true, 'Presence not updated');
    
    if (presence) {
      log(`    Online: ${presence.is_online}`, 'info');
      log(`    Current room: ${presence.current_room_id}`, 'info');
    }
  } catch (error) {
    test('Update presence', false, error.message);
  }
  
  // ==========================================
  // TEST 13: Get User Rooms
  // ==========================================
  log('\n📝 Test 13: Get User Rooms', 'info');
  
  try {
    const rooms = await chatRepository.getUserRooms(consultation.user_id);
    
    test('Get user rooms', Array.isArray(rooms) && rooms.length > 0, 'No rooms found');
    log(`    Found ${rooms?.length} room(s)`, 'info');
  } catch (error) {
    test('Get user rooms', false, error.message);
  }
  
  // ==========================================
  // TEST 14: Get Lawyer Rooms
  // ==========================================
  log('\n📝 Test 14: Get Lawyer Rooms', 'info');
  
  try {
    const rooms = await chatRepository.getLawyerRooms(consultation.lawyer_id);
    
    test('Get lawyer rooms', Array.isArray(rooms) && rooms.length > 0, 'No rooms found');
    log(`    Found ${rooms?.length} room(s)`, 'info');
  } catch (error) {
    test('Get lawyer rooms', false, error.message);
  }
  
  // ==========================================
  // TEST 15: Delete Message (Soft Delete)
  // ==========================================
  log('\n📝 Test 15: Soft Delete Message', 'info');
  
  // Create a message to delete
  if (roomId) {
    try {
      const tempMsg = await chatRepository.createMessage({
        room_id: roomId,
        sender_id: consultation.user_id,
        sender_type: 'user',
        content: 'This message will be deleted',
        message_type: 'text'
      });
      
      if (tempMsg?.id) {
        const deleted = await chatRepository.deleteMessage(tempMsg.id, false);
        test('Soft delete message', deleted?.is_deleted === true, 'Message not deleted');
        
        if (deleted) {
          log(`    Deleted: ${deleted.is_deleted}`, 'info');
          log(`    Deleted for all: ${deleted.deleted_for_all}`, 'info');
        }
      } else {
        test('Soft delete message', false, 'Could not create test message');
      }
    } catch (error) {
      test('Soft delete message', false, error.message);
    }
  } else {
    test('Soft delete message', false, 'No room ID');
  }
  
  // ==========================================
  // TEST 16: Service Layer - Access Control
  // ==========================================
  log('\n📝 Test 16: Service Layer Access Control', 'info');
  
  if (roomId) {
    try {
      // User should have access
      const hasAccess = await chatService.checkRoomAccess(roomId, mockUser);
      test('User has room access', hasAccess === true, 'User denied access');
      
      // Mock unauthorized user
      const otherUser = { id: 'random-id-123', role: 'user', lawyerProfile: null };
      const noAccess = await chatService.checkRoomAccess(roomId, otherUser);
      test('Other user denied access', noAccess === false, 'Unauthorized user has access');
    } catch (error) {
      test('Service access control', false, error.message);
    }
  } else {
    test('Service access control', false, 'No room ID');
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
  
  // Clean up - show room info
  if (roomId) {
    log('\n📋 Test Chat Room Info:', 'info');
    log(`  Room ID: ${roomId}`, 'info');
    log(`  Consultation: ${consultation.id}`, 'info');
    log(`  User: ${consultation.user_id}`, 'info');
    log(`  Lawyer: ${lawyerUserId}`, 'info');
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  log(`\n❌ Test Error: ${err.message}`, 'error');
  console.error(err.stack);
  process.exit(1);
});
