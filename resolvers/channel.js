import { formatErrors } from '../formatErrors';
import { requiresAuth } from '../permissions';

export default {
  Mutation: {
    getOrCreateDmChannel: requiresAuth.createResolver(async (parent, { teamId, members }, { models, user }) => {
      const member = await models.Member.findOne(
        { where: { teamId, userId: user.id } },
        { raw: true },
      );
      if (!member) throw new Error('Not Authorized');

      const allMembers = [...members, user.id];
      // check if channel already exist with these members
      const [data] = await models.sequelize.query(`
        select c.id, c.name, c.dm from channels as c, pcmembers as pc
        where pc.channel_id = c.id and c.dm = true and c.public = false and c.team_id = ${teamId}
        group by c.id, c.name, c.dm having array_agg(pc.user_id) @> Array[${allMembers.join(',')}]
        and count(pc.user_id) = ${allMembers.length};
      `, { raw: true });

      if (data.length) return data[0];

      const users = await models.User.findAll({
        where: { id: { [models.sequelize.Op.in]: members } },
        raw: true,
      });
      const name = users.map(u => u.username).join(', ');
      const channelId = await models.sequelize.transaction(async (transaction) => {
        const channel = await models.Channel.create({
          name,
          public: false,
          dm: true,
          teamId,
        }, { transaction });
        const cId = channel.dataValues.id;
        const pcmembers = allMembers.map(m => ({ userId: m, channelId: cId }));
        await models.PCMember.bulkCreate(pcmembers, { transaction });
        return cId;
      });

      return {
        id: channelId,
        name,
        dm: true,
      };
    }),
    createChannel: requiresAuth.createResolver(async (parent, args, { models, user }) => {
      try {
        const member = await models.Member.findOne(
          { where: { teamId: args.teamId, userId: user.id } },
          { raw: true },
        );
        if (!member.admin) {
          return {
            ok: false,
            errors: [
              {
                path: 'name',
                message: 'You have to be the owner of the team to create channels',
              },
            ],
          };
        }

        const response = await models.sequelize.transaction(async (transaction) => {
          const channel = await models.Channel.create(args, { transaction });
          if (!args.public) {
            const members = args.members.filter(m => m !== user.id);
            members.push(user.id);
            const pcmembers = members.map(m => ({ userId: m, channelId: channel.dataValues.id }));
            await models.PCMember.bulkCreate(pcmembers, { transaction });
          }
          return channel;
        });

        return {
          ok: true,
          channel: response,
        };
      } catch (e) {
        return {
          ok: false,
          errors: formatErrors(e, models),
        };
      }
    }),
  },
};
