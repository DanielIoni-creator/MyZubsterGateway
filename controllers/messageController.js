const Message = require('../models/Message');

// Invia un nuovo messaggio
const sendMessage = async (req, res) => {
  try {
    const { senderId, recipientId, content } = req.body;

    if (!senderId || !recipientId || !content) {
      return res.status(400).json({
        success: false,
        error: 'senderId, recipientId and content are required'
      });
    }

    const message = new Message({
      senderId,
      recipientId,
      content
    });

    await message.save();

    res.status(201).json({
      success: true,
      data: message
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Ottieni messaggi tra due utenti
const getMessages = async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await Message.find({
      $or: [
        { senderId: userId1, recipientId: userId2 },
        { senderId: userId2, recipientId: userId1 }
      ]
    })
    .sort({ createdAt: -1 })
    .skip(parseInt(offset))
    .limit(parseInt(limit))
    .lean();

    res.json({
      success: true,
      data: messages.reverse(), // Ordine cronologico
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: await Message.countDocuments({
          $or: [
            { senderId: userId1, recipientId: userId2 },
            { senderId: userId2, recipientId: userId1 }
          ]
        })
      }
    });

  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Ottieni conversazioni per un utente
const getConversations = async (req, res) => {
  try {
    const { userId } = req.params;

    // Ottieni tutti gli utenti con cui l'utente ha scambiato messaggi
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: userId },
            { recipientId: userId }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', userId] },
              '$recipientId',
              '$senderId'
            ]
          },
          lastMessage: { $last: '$content' },
          lastMessageAt: { $last: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$recipientId', userId] },
                  { $eq: ['$read', false] }
                ]},
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { lastMessageAt: -1 } }
    ]);

    res.json({
      success: true,
      data: conversations
    });

  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Segna messaggi come letti
const markAsRead = async (req, res) => {
  try {
    const { userId, senderId } = req.body;

    const result = await Message.updateMany(
      {
        senderId,
        recipientId: userId,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      data: {
        updated: result.modifiedCount
      }
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Elimina un messaggio
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    const message = await Message.findOne({
      _id: messageId,
      $or: [
        { senderId: userId },
        { recipientId: userId }
      ]
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found or access denied'
      });
    }

    await message.deleteOne();

    res.json({
      success: true,
      data: { deleted: true }
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getConversations,
  markAsRead,
  deleteMessage
};
