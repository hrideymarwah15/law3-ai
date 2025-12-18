/**
 * Comprehensive Chat System Test
 * Tests all chat features with real users and lawyers
 */

require('dotenv').config();
const chatRepository = require('../src/repositories/chat.repository');
const { supabaseAdmin } = require('../src/config/supabase');

async function comprehensiveTest() {
  console.log('\n🧪 COMPREHENSIVE CHAT SYSTEM TEST');
  console.log('==================================\n');
  
  let passed = 0;
  let failed = 0;
  
  function test(name, condition, error = '') {
    if (condition) {
      console.log('  ✅', name);
      passed++;
    } else {
      console.log('  ❌', name, error ? '- ' + error : '');
      failed++;
    }
  }
  
  // Get test data
  const { data: consultations } = await supabaseAdmin
    .from('consultations')
    .select('id, user_id, lawyer_id')
    .eq('status', 'confirmed')
    .limit(1);
  
  if (!consultations || consultations.length === 0) {
    console.log('❌ No confirmed consultations found');
    process.exit(1);
  }
  
  const consultation = consultations[0];
  
  // Get lawyer's user_id
  const { data: lawyer } = await supabaseAdmin
    .from('lawyers')
    .select('user_id')
    .eq('id', consultation.lawyer_id)
    .single();
  
  const lawyerUserId = lawyer.user_id;
  
  console.log('📋 Test Data:');
  console.log('   User ID:', consultation.user_id);
  console.log('   Lawyer User ID:', lawyerUserId);
  console.log('   Consultation:', consultation.id);
  console.log('');
  
  // TEST 1: Create/Get Room
  console.log('\n📝 Room Operations:');
  const roomResult = await chatRepository.getOrCreateRoom(
    consultation.id,
    consultation.user_id,
    consultation.lawyer_id
  );
  test('Create/Get chat room', !!roomResult.data?.id, roomResult.error?.message);
  const roomId = roomResult.data?.id;
  
  if (!roomId) {
    console.log('❌ Cannot continue without room ID');
    process.exit(1);
  }
  
  // TEST 2: Get Room by ID
  const room2 = await chatRepository.getRoomById(roomId);
  test('Get room by ID with relations', !!room2.data?.id, room2.error?.message);
  
  // TEST 3: Send message as User
  console.log('\n📝 Message Operations:');
  const userMsg = await chatRepository.createMessage({
    room_id: roomId,
    sender_id: consultation.user_id,
    sender_type: 'user',
    content: 'Hi! I have a property dispute issue. Need legal advice.',
    message_type: 'text'
  });
  test('User sends message', !!userMsg.data?.id, userMsg.error?.message);
  const userMsgId = userMsg.data?.id;
  
  // TEST 4: Send message as Lawyer  
  const lawyerMsg = await chatRepository.createMessage({
    room_id: roomId,
    sender_id: lawyerUserId,
    sender_type: 'lawyer',
    content: 'Hello! I can help you with that. Tell me more about the property.',
    message_type: 'text'
  });
  test('Lawyer sends message', !!lawyerMsg.data?.id, lawyerMsg.error?.message);
  
  // TEST 5: Get messages
  const messages = await chatRepository.getRoomMessages(roomId, { limit: 10 });
  test('Get room messages', messages.data?.length >= 2, messages.error?.message);
  console.log('     Found', messages.data?.length, 'messages');
  
  // TEST 6: Reply to message
  const replyMsg = await chatRepository.createMessage({
    room_id: roomId,
    sender_id: lawyerUserId,
    sender_type: 'lawyer',
    content: 'Property disputes often need documentation. Do you have the papers?',
    message_type: 'text',
    reply_to_id: userMsgId
  });
  test('Reply to message', !!replyMsg.data?.id && replyMsg.data?.reply_to_id === userMsgId, replyMsg.error?.message);
  
  // TEST 7: Edit message
  console.log('\n📝 Edit & Delete:');
  if (userMsgId) {
    const editResult = await chatRepository.editMessage(
      userMsgId, 
      consultation.user_id,
      'Hi! I have an URGENT property dispute issue. Need legal advice ASAP!'
    );
    test('Edit message', editResult.data?.is_edited === true, editResult.error?.message);
  } else {
    test('Edit message', false, 'No message ID');
  }
  
  // TEST 8: Room stats updated
  console.log('\n📝 Room Statistics:');
  const roomStats = await chatRepository.getRoomById(roomId);
  test('Room total_messages tracked', roomStats.data?.total_messages >= 3, 
    'Expected 3+, got ' + roomStats.data?.total_messages);
  test('Room last_message_at updated', !!roomStats.data?.last_message_at);
  console.log('     Total messages:', roomStats.data?.total_messages);
  console.log('     User unread:', roomStats.data?.user_unread_count);
  console.log('     Lawyer unread:', roomStats.data?.lawyer_unread_count);
  
  // TEST 9: Mark messages as read
  console.log('\n📝 Read Receipts:');
  const readResult = await chatRepository.markMessagesAsRead(roomId, consultation.user_id);
  test('Mark messages as read', readResult.data?.messagesRead >= 0, readResult.error?.message);
  console.log('     Marked', readResult.data?.messagesRead || 0, 'messages as read');
  
  // TEST 10: Check unread reset
  const roomAfterRead = await chatRepository.getRoomById(roomId);
  test('User unread count reset', roomAfterRead.data?.user_unread_count === 0,
    'User unread: ' + roomAfterRead.data?.user_unread_count);
  
  // TEST 11: Search messages
  console.log('\n📝 Search:');
  const searchResult = await chatRepository.searchMessages(roomId, 'dispute');
  test('Search messages', searchResult.data?.length > 0, searchResult.error?.message || 'No results');
  console.log('     Found', searchResult.data?.length || 0, 'matches for "dispute"');
  
  // TEST 12: Presence
  console.log('\n📝 Presence:');
  const presenceResult = await chatRepository.updatePresence(consultation.user_id, {
    isOnline: true,
    socketId: 'test-socket-' + Date.now(),
    currentRoomId: roomId
  });
  test('Update presence', presenceResult.data?.is_online === true, presenceResult.error?.message);
  
  // TEST 13: Get user rooms
  console.log('\n📝 Room Listing:');
  const userRooms = await chatRepository.getUserRooms(consultation.user_id);
  test('Get user rooms', userRooms.data?.length > 0, userRooms.error?.message);
  console.log('     User has', userRooms.data?.length || 0, 'room(s)');
  
  // TEST 14: Get lawyer rooms
  const lawyerRooms = await chatRepository.getLawyerRooms(consultation.lawyer_id);
  test('Get lawyer rooms', lawyerRooms.data?.length > 0, lawyerRooms.error?.message);
  console.log('     Lawyer has', lawyerRooms.data?.length || 0, 'room(s)');
  
  // TEST 15: Delete message (soft)
  console.log('\n📝 Message Deletion:');
  const tempMsg = await chatRepository.createMessage({
    room_id: roomId,
    sender_id: consultation.user_id,
    sender_type: 'user',
    content: 'This message will be deleted',
    message_type: 'text'
  });
  if (tempMsg.data?.id) {
    const deleted = await chatRepository.deleteMessage(tempMsg.data.id, consultation.user_id, false);
    test('Soft delete message', deleted.data?.is_deleted === true, deleted.error?.message);
  } else {
    test('Soft delete message', false, 'Could not create temp message');
  }
  
  // TEST 16: System message
  console.log('\n📝 System Messages:');
  const sysMsg = await chatRepository.createMessage({
    room_id: roomId,
    sender_id: consultation.user_id,
    sender_type: 'system',
    content: 'Consultation session started',
    message_type: 'system'
  });
  test('Create system message', !!sysMsg.data?.id, sysMsg.error?.message);
  
  // TEST 17: Multiple messages in sequence
  console.log('\n📝 Conversation Flow:');
  const msg1 = await chatRepository.createMessage({
    room_id: roomId, sender_id: consultation.user_id, sender_type: 'user',
    content: 'The land is in my father\'s name but neighbors are claiming it.',
    message_type: 'text'
  });
  const msg2 = await chatRepository.createMessage({
    room_id: roomId, sender_id: lawyerUserId, sender_type: 'lawyer',
    content: 'Do you have the original sale deed and property tax receipts?',
    message_type: 'text'
  });
  const msg3 = await chatRepository.createMessage({
    room_id: roomId, sender_id: consultation.user_id, sender_type: 'user',
    content: 'Yes, I have all the documents. Should I share them here?',
    message_type: 'text'
  });
  test('Conversation flow (3 messages)', !!msg1.data?.id && !!msg2.data?.id && !!msg3.data?.id);
  
  // Final message count
  const finalMessages = await chatRepository.getRoomMessages(roomId, { limit: 50 });
  console.log('     Total messages in room:', finalMessages.data?.length || 0);
  
  // SUMMARY
  console.log('\n========================================');
  console.log('📊 TEST SUMMARY');
  console.log('========================================');
  console.log('  Total Tests:', passed + failed);
  console.log('  ✅ Passed:', passed);
  console.log('  ❌ Failed:', failed);
  console.log('  Success Rate:', ((passed / (passed + failed)) * 100).toFixed(1) + '%');
  console.log('========================================');
  
  // Show sample conversation
  console.log('\n💬 Sample Conversation:');
  const sampleMsgs = finalMessages.data?.slice(-5) || [];
  sampleMsgs.forEach((msg, i) => {
    const sender = msg.sender_type === 'user' ? '👤 User' : msg.sender_type === 'lawyer' ? '👨‍⚖️ Lawyer' : '🤖 System';
    console.log(`   ${sender}: ${msg.content?.substring(0, 60)}${msg.content?.length > 60 ? '...' : ''}`);
  });
  
  console.log('\n📋 Chat Room Info:');
  console.log('   Room ID:', roomId);
  console.log('   Consultation:', consultation.id);
  console.log('');
  
  if (failed > 0) {
    process.exit(1);
  }
}

comprehensiveTest().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
