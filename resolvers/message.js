import { PubSub, withFilter } from 'graphql-subscriptions';
import { requiresAuth } from '../permissions';

const pubSub = new PubSub();
const NEW_CHANNEL_MESSAGE = 'NEW_CHANNEL_MESSAGE';

export default {
  Message: {
    user: ({ user, userId }, args, { models }) => {
      if (user) return user;
      return models.User.findOne({ where: { id: userId } }, { raw: true });
    },
  },
  Subscription: {
    newChannelMessage: {
      subscribe: withFilter(
        () => pubSub.asyncIterator(NEW_CHANNEL_MESSAGE),
        (payload, args) => payload.channelId === args.channelId, // args from client and payload from server
      ),
    },
  },
  Query: {
    messages: requiresAuth.createResolver(async (parent, { channelId }, { models, user }) =>
      models.Message.findAll({ order: [['created_at', 'ASC']], where: { channelId } }, { raw: true })),
  },
  Mutation: {
    createMessage: requiresAuth.createResolver(async (parent, args, { models, user }) => {
      try {
        const message = await models.Message.create({ ...args, userId: user.id });
        const asyncFunc = async () => {
          const currentUser = await models.User.findOne({
            where: {
              id: user.id,
            },
          });
          pubSub.publish(NEW_CHANNEL_MESSAGE, {
            channelId: args.channelId,
            newChannelMessage: {
              ...message.dataValues,
              user: currentUser.dataValues,
            },
          });
        };
        asyncFunc();
        return true;
      } catch (e) {
        return false;
      }
    }),
  },
};
