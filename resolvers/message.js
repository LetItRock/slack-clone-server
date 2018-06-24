import { withFilter } from 'graphql-subscriptions';
import { requiresAuth, requiresTeamAccess } from '../permissions';
import pubSub from '../pubSub';

const NEW_CHANNEL_MESSAGE = 'NEW_CHANNEL_MESSAGE';

export default {
  Message: {
    url: parent => (parent.url ? `http://localhost:8081/${parent.url}` : parent.url),
    user: ({ user, userId }, args, { models }) => {
      if (user) return user;
      return models.User.findOne({ where: { id: userId } }, { raw: true });
    },
  },
  Subscription: {
    newChannelMessage: {
      subscribe: requiresTeamAccess.createResolver(withFilter(
        () => pubSub.asyncIterator(NEW_CHANNEL_MESSAGE),
        (payload, args) => payload.channelId === args.channelId, // args from client and payload from server
      )),
    },
  },
  Query: {
    messages: requiresAuth.createResolver(async (parent, { channelId, cursor }, { models, user }) => {
      const channel = await models.Channel.findOne({ where: { id: channelId }, raw: true });
      if (!channel.public) {
        const member = await models.PCMember.findOne({ raw: true, where: { channelId, userId: user.id } });
        if (!member) {
          throw new Error('Not Authorized');
        }
      }
      const options = {
        order: [['created_at', 'DESC']],
        where: { channelId },
        limit: 35,
      };

      if (cursor) {
        options.where.created_at = {
          [models.op.lt]: cursor,
        };
      }
      return models.Message.findAll(options, { raw: true });
    }),
  },
  Mutation: {
    createMessage: requiresAuth.createResolver(async (parent, { file, ...args }, { models, user }) => {
      try {
        const messageData = args;
        if (file) {
          messageData.filetype = file.type;
          messageData.url = file.path;
        }
        const message = await models.Message.create({ ...messageData, userId: user.id });
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
