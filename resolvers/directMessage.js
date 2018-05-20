import { withFilter } from 'graphql-subscriptions';
import { requiresAuth, directMessageSubscription } from '../permissions';
import pubSub from '../pubSub';

const NEW_DIRECT_MESSAGE = 'NEW_DIRECT_MESSAGE';

export default {
  DirectMessage: {
    sender: ({ sender, senderId }, args, { models }) => {
      if (sender) return sender;
      return models.User.findOne({ where: { id: senderId } }, { raw: true });
    },
  },
  Subscription: {
    newDirectMessage: {
      subscribe: directMessageSubscription.createResolver(withFilter(
        () => pubSub.asyncIterator(NEW_DIRECT_MESSAGE),
        (payload, args, { user }) =>
          payload.teamId === args.teamId &&
          ((payload.senderId === user.id && payload.receiverId === args.userId) ||
          (payload.senderId === args.userId && payload.receiverId === user.id)), // args from client and payload from server
      )),
    },
  },
  Query: {
    directMessages: requiresAuth.createResolver(async (parent, { teamId, otherUserId }, { models, user }) =>
      models.DirectMessage.findAll({
        order: [['created_at', 'ASC']],
        where: {
          teamId,
          [models.sequelize.Op.or]: [{
            [models.sequelize.Op.and]: [{ receiverId: otherUserId }, { senderId: user.id }],
          }, {
            [models.sequelize.Op.and]: [{ receiverId: user.id }, { senderId: otherUserId }],
          }],
        },
      }, { raw: true })),
  },
  Mutation: {
    createDirectMessage: requiresAuth.createResolver(async (parent, args, { models, user }) => {
      try {
        const directMessage = await models.DirectMessage.create({ ...args, senderId: user.id });

        pubSub.publish(NEW_DIRECT_MESSAGE, {
          teamId: args.teamId,
          receiverId: args.receiverId,
          senderId: user.id,
          newDirectMessage: {
            ...directMessage.dataValues,
            sender: user,
          },
        });

        return true;
      } catch (e) {
        return false;
      }
    }),
  },
};
