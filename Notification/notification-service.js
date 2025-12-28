// services/notification-service.js
const Notification = require('./notification-model');
const User = require('../authentification/user-model');

class NotificationService {
  /**
   * Create a notification
   */
  static async createNotification(data) {
    try {
      const notification = new Notification(data);
      await notification.save();
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create offer received notification
   */
  static async createOfferReceivedNotification({ userId, senderId, requestId, offerId, budget, senderName = null }) {
    try {
      if (!senderName && senderId) {
        const sender = await User.findById(senderId);
        if (sender) {
          senderName = `${sender.firstName} ${sender.lastName}`;
        }
      }
      
      const notification = await this.createNotification({
        userId,
        type: 'offer_received',
        title: 'New Offer Received',
        message: `${senderName || 'A user'} has sent you an offer with a budget of $${budget}`,
        metadata: {
          requestId,
          offerId,
          amount: budget,
          senderId
        },
        senderId,
        senderName: senderName || 'User',
        important: true,
        actions: [
          {
            label: 'View Offer',
            action: 'view_offer',
            link: `/offers/${offerId}`,
            method: 'GET'
          }
        ]
      });
      
      return notification;
    } catch (error) {
      console.error('Create offer notification error:', error);
      throw error;
    }
  }

  /**
   * Create request accepted notification
   */
  static async createRequestAcceptedNotification({ userId, acceptorId, requestId, requestTitle, acceptorName = null }) {
    try {
      if (!acceptorName && acceptorId) {
        const acceptor = await User.findById(acceptorId);
        if (acceptor) {
          acceptorName = `${acceptor.firstName} ${acceptor.lastName}`;
        }
      }
      
      const notification = await this.createNotification({
        userId,
        type: 'request_accepted',
        title: 'Request Accepted',
        message: `${acceptorName || 'A user'} has accepted your request "${requestTitle}"`,
        metadata: {
          requestId,
          acceptorId,
          requestTitle
        },
        senderId: acceptorId,
        senderName: acceptorName || 'User',
        important: true,
        actions: [
          {
            label: 'View Request',
            action: 'view_request',
            link: `/requests/${requestId}`,
            method: 'GET'
          }
        ]
      });
      
      return notification;
    } catch (error) {
      console.error('Create request accepted notification error:', error);
      throw error;
    }
  }

  /**
   * Create message received notification
   */
  static async createMessageReceivedNotification({ userId, senderId, conversationId, messagePreview }) {
    try {
      const sender = await User.findById(senderId);
      
      if (!sender) {
        throw new Error('Sender not found');
      }
      
      const notification = await this.createNotification({
        userId,
        type: 'message_received',
        title: 'New Message',
        message: `${sender.firstName} ${sender.lastName}: ${messagePreview || 'Sent you a message'}`,
        metadata: {
          conversationId,
          senderId,
          messagePreview
        },
        senderId,
        senderName: `${sender.firstName} ${sender.lastName}`,
        senderPhoto: sender.profilePhoto || '',
        important: true,
        actions: [
          {
            label: 'Reply',
            action: 'reply',
            link: `/messages/${conversationId}`,
            method: 'GET'
          }
        ]
      });
      
      return notification;
    } catch (error) {
      console.error('Create message notification error:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;