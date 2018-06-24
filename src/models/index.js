import Sequelize from 'sequelize';

const sequelize = new Sequelize(process.env.TEST_DB || 'slack', 'paty', 'root', {
  dialect: 'postgres',
  operatorAliases: Sequelize.Op,
  define: {
    underscored: true,
  },
});

const models = {
  User: sequelize.import('./user'),
  Channel: sequelize.import('./channel'),
  Message: sequelize.import('./message'),
  Team: sequelize.import('./team'),
  Member: sequelize.import('./member'),
  DirectMessage: sequelize.import('./directMessage'),
  PCMember: sequelize.import('./privateChannelMember'),
};

Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;
models.op = Sequelize.Op;

export default models;
