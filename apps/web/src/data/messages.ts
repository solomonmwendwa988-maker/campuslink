import { LocalConversations } from '../types/messages';

export const conversationSeed: LocalConversations = {
  'Joy M.': [
    { id: 1, text: 'Hey! Are you coming to the student commons this afternoon?', mine: false, time: '2:12 PM' },
    { id: 2, text: 'Yes, I should be there around 3. Save me a seat?', mine: true, time: '2:14 PM' },
    { id: 3, text: 'Of course! See you there.', mine: false, time: '2:15 PM' },
  ],
  'Dylan O.': [{ id: 4, text: 'That sounds great. Let me check my schedule.', mine: false, time: 'Yesterday' }],
  'Campus Creatives': [{ id: 5, text: 'Njeri shared a photo from the meetup.', mine: false, time: 'Monday' }],
};

export const conversationMeta = [
  { name: 'Joy M.', initials: 'JM', online: true, time: '2:15 PM', unread: 2 },
  { name: 'Dylan O.', initials: 'DO', online: false, time: 'Yesterday', unread: 0 },
  { name: 'Campus Creatives', initials: 'CC', online: true, time: 'Monday', unread: 0 },
];
