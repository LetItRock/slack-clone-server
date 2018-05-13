import formatErrors from '../formatErrors';

export default {
  Mutation: {
    createTeam: async (parent, args, { models, user }) => {
      try {
        await models.Team.create({ ...args, owner: user.id });
        return {
          ok: true,
        };
      } catch (e) {
        return {
          ok: false,
          errors: formatErrors(e),
        };
      }
    },
  },
};
