import bcrypt from 'bcrypt';
import _ from 'lodash';

const formatErrors = (e, models) => {
  if (e instanceof models.sequelize.ValidationError) {
    return e.errors.map(x => _.pick(x, ['path', 'message']));
  }
  return [{ path: 'name', message: 'something went wrong' }];
};

export default {
  Query: {
    getUser: (parent, { id }, { models }) => models.User.findOne({ where: { id } }),
    allUsers: (parent, args, { models }) => models.User.findAll(),
  },
  Mutation: {
    register: async (parent, { password, ...args }, { models }) => {
      try {
        if (models.User.isPasswordValid(password)) {
          return {
            ok: false,
            errors: [
              {
                path: 'password',
                message: 'The password needs to be between 8 and 18 characters long',
              },
            ],
          };
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await models.User.create({ password: hashedPassword, ...args });
        return {
          ok: true,
          user,
        };
      } catch (e) {
        return {
          ok: false,
          errors: formatErrors(e, models),
        };
      }
    },
  },
};
